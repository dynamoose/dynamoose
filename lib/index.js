'use strict';

const Schema = require('./Schema');
const Model = require('./Model');
const https = require('https');
const AWS = require('aws-sdk');
const debug = require('debug')('dynamoose');
const debugTransaction = require('debug')('dynamoose:transaction');
const Q = require('q');
const errors = require('./errors');

function createLocalDb(endpointURL) {
  const client = new AWS.DynamoDB({
    endpoint: new AWS.Endpoint(endpointURL)
  });

  if (typeof global.it !== 'function' && typeof global.after !== 'function') {
    // We're not running in a test env - just return the client without modifications.
    // This ensures that we keep BC with users that might call this method in produciton applications.
    // @TODO: Remove once DynamoDB local instance supports transactions.
    return client;
  }

  // @TODO: Remove once DynamoDB local instance supports transactions.
  // @HACK
  client.transactGetItems = (request, callback) => {
    const batchRequest = {
      RequestItems: {}
    };
    request.TransactItems.forEach((item) => {
      const operation = Object.keys(item)[0];
      const transactItem = item[operation];
      if (!batchRequest.RequestItems[transactItem.TableName]) {
        batchRequest.RequestItems[transactItem.TableName] = {
          Keys: []
        };
      }

      batchRequest.RequestItems[transactItem.TableName].Keys.push(transactItem.Key)
    });
    return client.batchGetItem(batchRequest, (err, data) => {
      if (err) {
        return callback(err);
      }
      // Re-map responses to expected format.
      data.Responses = Object.values(data.Responses).reduce(
        (list, resp) => ([...list, ...resp.map((item) => ({Item: item}))]),
        []
      )
      callback(err, data);
    });

  };

  // @TODO: Remove once DynamoDB local instance supports transactions.
  // @HACK
  client.transactWriteItems = (request, callback) => {
    const batchRequest = {
      RequestItems: {}
    };
    request.TransactItems.forEach((item) => {
      let operation = Object.keys(item)[0];
      const transactItem = item[operation];

      if (operation === 'ConditionCheck') {
        // Mock does not support ConditionCheck operation, so just fail silently.
        // Bail out early to not create a request with empty table name.
        return;
      }

      if (!batchRequest.RequestItems[transactItem.TableName]) {
        batchRequest.RequestItems[transactItem.TableName] = [];
      }

      // Pick only properties that we're interested in.
      const {Key, Item} = transactItem;

      const itemValue = {};

      if (operation === 'Update') {
        // Map Key to update to to item, since Put only supports Item.
        itemValue.Item = Key;
      } else if (Key) {
        itemValue.Key = Key;
      } else if (Item) {
        itemValue.Item = Item;
      }

      if (operation === 'Update') {
        // Map Update operation to Put, as this mock does not support Update operations.
        operation = 'Put';
      }

      batchRequest.RequestItems[transactItem.TableName].push({
        [`${operation}Request`]: itemValue
      })
    });
    return client.batchWriteItem(batchRequest, callback);
  };

  return client;
}

function Dynamoose () {
  this.models = {};

  this.defaults = {
    create: true,
    waitForActive: true, // Wait for table to be created
    waitForActiveTimeout: 180000, // 3 minutes
    prefix: '', // prefix_Table
    suffix: '' // Table_suffix
  }; // defaults
}

Dynamoose.prototype.model = function(name, schema, options) {
  options = options || {};

  for(const key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  name = options.prefix + name + options.suffix;

  debug('Looking up model %s', name);

  if(this.models[name]) {
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema, options);
  }

  const model = Model.compile(name, schema, options, this);
  this.models[name] = model;
  return model;
};

/**
* The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
*
* @method VirtualType
* @api public
*/

Dynamoose.prototype.VirtualType = require('./VirtualType');

Dynamoose.prototype.AWS = AWS;

Dynamoose.prototype.local = function (url) {
  this.endpointURL = url || 'http://localhost:8000';
  this.dynamoDB = createLocalDb(this.endpointURL);
  debug('Setting DynamoDB to local (%s)', this.endpointURL);
};

/**
* Document client for executing nested scans
*/
Dynamoose.prototype.documentClient = function() {
  if (this.dynamoDocumentClient) {
    return this.dynamoDocumentClient;
  }
  if (this.endpointURL) {
    debug('Setting dynamodb document client to %s', this.endpointURL);
    this.AWS.config.update({ endpoint: this.endpointURL });
  } else {
    debug('Getting default dynamodb document client');
  }
  this.dynamoDocumentClient = new this.AWS.DynamoDB.DocumentClient();
  return this.dynamoDocumentClient;
};

Dynamoose.prototype.setDocumentClient = function(documentClient) {
  debug('Setting dynamodb document client');
  this.dynamoDocumentClient = documentClient;
};

Dynamoose.prototype.ddb = function () {
  if(this.dynamoDB) {
    return this.dynamoDB;
  }

  if(this.endpointURL) {
    debug('Setting DynamoDB to %s', this.endpointURL);
    this.dynamoDB = createLocalDb(this.endpointURL);
  } else {
    debug('Getting default DynamoDB');
    this.dynamoDB = new this.AWS.DynamoDB({
      httpOptions: {
        agent: new https.Agent({
          rejectUnauthorized: true,
          keepAlive: true
        })
      }
    });
  }
  return this.dynamoDB;
};

Dynamoose.prototype.setDefaults = function (options) {

  for(const key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  this.defaults = options;
};

Dynamoose.prototype.Schema = Schema;
Dynamoose.prototype.Table = require('./Table');
Dynamoose.prototype.Dynamoose = Dynamoose;

Dynamoose.prototype.setDDB = function (ddb) {
  debug("Setting custom DDB");
  this.dynamoDB = ddb;
};
Dynamoose.prototype.revertDDB = function () {
  debug("Reverting to default DDB");
  this.dynamoDB = null;
};

Dynamoose.prototype.transaction = async function(items, options, next) {
  debugTransaction('Run Transaction');
  const deferred = Q.defer();
  let dbClient = this.documentClient();
  let DynamoDBSet = dbClient.createSet([1, 2, 3]).constructor;
  let self = this;


  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(!Array.isArray(items) || items.length === 0) {
    deferred.reject(new errors.TransactionError('Items required to run transaction'));
    return deferred.promise.nodeify(next);
  }

  items = await Promise.all(items);
  let transactionReq = {
    TransactItems: items
  };
  let transactionMethodName;
  if (options.type) {
    debugTransaction("Using custom transaction method");
    if (options.type === "get") {
      transactionMethodName = "transactGetItems";
    } else if (options.type === "write") {
      transactionMethodName = "transactWriteItems";
    } else {
      deferred.reject(new errors.TransactionError('Invalid type option, please pass in "get" or "write"'));
      return deferred.promise.nodeify(next);
    }
  } else {
    debugTransaction("Using predetermined transaction method");
    transactionMethodName = items.map(obj => Object.keys(obj)[0]).every(key => key === "Get") ? "transactGetItems" : "transactWriteItems";
  }
  debugTransaction(`Using transaction method: ${transactionMethodName}`);

  function getModelSchemaFromIndex(index) {
    const requestItem = items[index];
    const requestItemProperty = Object.keys(items[index])[0];
    const tableName = requestItem[requestItemProperty].TableName;
    const TheModel = self.models[tableName];
    if (!TheModel) {
      const errorMessage = `${tableName} is not a registered model. You can only use registered Dynamoose models when using a RAW transaction object.`;
      throw new errors.TransactionError(errorMessage);
    }
    const TheModel$ = TheModel.$__;
    const schema = TheModel$.schema;

    return {TheModel, TheModel$, schema};
  }

  const transact = () => {
    debugTransaction('transact', transactionReq);
    this.dynamoDB[transactionMethodName](transactionReq, async function(err, data) {
      if(err) {
        debugTransaction(`Error returned by ${transactionMethodName}`, err);
        return deferred.reject(err);
      }

      debugTransaction(`${transactionMethodName} response`, data);

      if(!data.Responses) {
        return deferred.resolve();
      }

      return deferred.resolve((await Promise.all(data.Responses.map(async function (item, index) {
        const {TheModel, TheModel$, schema} = getModelSchemaFromIndex(index);
        Object.keys(item).forEach(function (prop) {
          if (item[prop] instanceof DynamoDBSet) {
            item[prop] = item[prop].values;
          }
        });

        let model = new TheModel();
        model.$__.isNew = false;
        // Destruct 'item' DynamoDB's returned structure.
        await schema.parseDynamo(model, item.Item);
        debugTransaction(`${transactionMethodName} parsed model`, model);
        return model;
      }))).filter((item, index) => {
        const {TheModel, TheModel$, schema} = getModelSchemaFromIndex(index);

        return !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date());
      }));
    });
  }

  if (options.returnRequest) {
    deferred.resolve(transactionReq);
  } else if (items.some((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.options.waitForActive)) {
    const waitForActivePromises = Promise.all(items.filter((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.options.waitForActive).map((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.waitForActive()));
    waitForActivePromises.then(transact).catch(deferred.reject);
  } else {
    transact();
  }
  return deferred.promise.nodeify(next);
}

module.exports = new Dynamoose();
