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
  return new AWS.DynamoDB({
    endpoint: new AWS.Endpoint(endpointURL)
  });
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

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(items === null || items === undefined || items.length === 0) {
    deferred.reject(new errors.TransactionError('Items required to run transaction'));
    return deferred.promise.nodeify(next);
  }


  let transactionReq = {
    TransactItems: (await Promise.all(items)).map(item => {
      const returnItem = {...item};
      delete returnItem.$__;
      return returnItem;
    })
  };
  let transactionMethodName = items.map(obj => Object.keys(obj)[0]).every(key => key === "Get") ? "transactGetItems" : "transactWriteItems";
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
  }
  debugTransaction(`Using transaction method: ${transactionMethodName}`);

  function transact() {
    debugTransaction('transact', transactionReq);
    this.dynamoDB[transactionMethodName](transactionReq, function(err, data) {
      if(err) {
        debugTransaction(`Error returned by ${transactionMethodName}`, err);
        return deferred.reject(err);
      }

      debugTransaction(`${transactionMethodName} response`, data);

      if(!data.Responses) {
        return deferred.resolve();
      }

      return deferred.resolve(data.Responses.map(function (item, index) {
        let model;
        const TheModel = items[index].$__.newModel$;

        Object.keys(item).forEach(function (prop) {
          if (item[prop] instanceof DynamoDBSet) {
            item[prop] = item[prop].values;
          }
        });

        model = new TheModel(item);
        model.$__.isNew = false;
        debugTransaction(`${transactionMethodName} parsed model`, model);
        return model;
      }).filter(item => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date())));
    });
  }

  if (options.returnRequest) {
    deferred.resolve(transactionReq);
  } else if (items.some(item => item.$__.newModel$.options.waitForActive)) {
    const waitForActivePromises = Promise.all(items.filter(item => item.$__.newModel$.options.waitForActive).map(item => item.$__.newModel$.table.waitForActive()));
    waitForActivePromises.then(transact).catch(deferred.reject);
  } else {
    transact();
  }
  return deferred.promise.nodeify(next);
}

module.exports = new Dynamoose();
