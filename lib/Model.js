'use strict';
var util = require('util');
var Q = require('q');
var hooks = require('hooks');
var Table = require('./Table');
var Query = require('./Query');
var Scan = require('./Scan');
var errors = require('./errors');

//var MAX_BATCH_READ_SIZE   = 100;
var MAX_BATCH_WRITE_SIZE = 25;
var debug = require('debug')('dynamoose:model');

function Model(obj) {
  this.$__.isNew = true;

  for (var key in obj) {
    this[key] = obj[key];
  }
}

function processCondition(req, options, schema) {
  if (options.condition) {
    if (req.ConditionExpression) {
      req.ConditionExpression = '(' + req.ConditionExpression + ') and (' + options.condition + ')';
    } else {
      req.ConditionExpression = options.condition;
    }

    if (options.conditionNames) {
      req.ExpressionAttributeNames = {};
      for (var name in options.conditionNames) {
        req.ExpressionAttributeNames['#' + name] = options.conditionNames[name];
      }
    }
    if (options.conditionValues) {
      req.ExpressionAttributeValues = {};
      Object.keys(options.conditionValues).forEach(function (k) {
        var val = options.conditionValues[k];
        var attr = schema.attributes[k];
        if (attr) {
          req.ExpressionAttributeValues[':' + k] = attr.toDynamo(val);
        } else {
          throw new errors.ModelError('Invalid condition value: ' + k + '. The name must either be in the schema or a full DynamoDB object must be specified.');
        }
      });
    }
  }
}

Model.compile = function compile(name, schema, options, base) {
  debug('compiling NewModel %s', name);

  var table = new Table(name, schema, options, base);

  /*jshint validthis: true */
  function NewModel(obj) {
    Model.call(this, obj);
    applyVirtuals(this, schema);
  }

  util.inherits(NewModel, Model);

  // minimize what is restricted
  NewModel.prototype.$__ = {
    table: table,
    base: base,
    name: name,
    schema: schema,
    options: options
  };
  NewModel.$__ = NewModel.prototype.$__;

  NewModel.get = function (key, options, next) {
    return Model.get(NewModel, key, options, next);
  };

  NewModel.update = function (key, update, options, next) {
    return Model.update(NewModel, key, update, options, next);
  };

  NewModel.delete = function (key, options, next) {
    return Model.delete(NewModel, key, options, next);
  };

  NewModel.query = function (query, options, next) {
    return Model.query(NewModel, query, options, next);
  };

  NewModel.queryOne = function (query, options, next) {
    return Model.queryOne(NewModel, query, options, next);
  };

  NewModel.scan = function (filter, options, next) {
    return Model.scan(NewModel, filter, options, next);
  };

  NewModel.create = function (obj, options, next) {
    return Model.create(NewModel, obj, options, next);
  };

  NewModel.batchGet = function (keys, options, next) {
    return Model.batchGet(NewModel, keys, options, next);
  };

  NewModel.batchPut = function (keys, options, next) {
    return Model.batchPut(NewModel, keys, options, next);
  };

  NewModel.batchDelete = function (keys, options, next) {
    return Model.batchDelete(NewModel, keys, options, next);
  };

  NewModel.waitForActive = function (timeout, next) {
    return table.waitForActive(timeout, next);
  };


  // apply methods and statics
  applyMethods(NewModel, schema);
  applyStatics(NewModel, schema);

  // set up middleware
  for (var k in hooks) {
    NewModel[k] = hooks[k];
  }

  table.init(function (err) {
    if (err) {
      throw err;
    }
  });

  return NewModel;
};


/*!
 * Register methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */
var applyMethods = function (model, schema) {
  debug('applying methods');
  for (var i in schema.methods) {
    model.prototype[i] = schema.methods[i];
  }
};

/*!
 * Register statics for this model
 * @param {Model} model
 * @param {Schema} schema
 */
var applyStatics = function (model, schema) {
  debug('applying statics');
  for (var i in schema.statics) {
    model[i] = schema.statics[i];
  }
};

/*!
 * Register virtuals for this model
 * @param {Model} model
 * @param {Schema} schema
 */
var applyVirtuals = function (model, schema) {
  debug('applying virtuals');
  for (var i in schema.virtuals) {
    schema.virtuals[i].applyVirtuals(model);
  }
};


Model.prototype.put = function (options, next) {
  debug('put', this);
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }
  if (options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = true;
  }
  var schema = this.$__.schema;
  var item = {
    TableName: this.$__.name,
    Item: schema.toDynamo(this)
  };
  if (!options.overwrite) {
    item.ConditionExpression = 'attribute_not_exists(' + schema.hashKey.name + ')';
  }
  processCondition(item, options, this.$__.schema);

  debug('putItem', item);

  var model = this;
  var model$ = this.$__;

  function put() {
    var deferred = Q.defer();
    model$.base.ddb().putItem(item, function (err) {
      if (err) {
        deferred.reject(err);
      }
      deferred.resolve(model);
    });

    return deferred.promise.nodeify(next);
  }


  if (model$.options.waitForActive) {
    return model$.table.waitForActive().then(put);
  }

  return put();


};

Model.prototype.save = Model.prototype.put;

Model.create = function (NewModel, obj, options, next) {
  options = options || {};

  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  if (options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = false;
  }

  var model = new NewModel(obj);
  return model.save(options, next);
};

Model.get = function (NewModel, key, options, next) {
  debug('Get %j', key);
  var deferred = Q.defer();
  if (key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if (!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if (schema.rangeKey && !key[schema.rangeKey.name]) {
    deferred.reject(
      new errors.ModelError('Range key required: ' + schema.rangeKey.name)
    );
    return deferred.promise.nodeify(next);
  }


  var getReq = {
    TableName: NewModel.$__.name,
    Key: {}
  };

  getReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

  if (schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    getReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  if (options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if (options.consistent) {
    getReq.ConsistentRead = true;
  }

  var newModel$ = NewModel.$__;

  function get() {
    debug('getItem', getReq);
    newModel$.base.ddb().getItem(getReq, function (err, data) {
      if (err) {
        debug('Error returned by getItem', err);
        return deferred.reject(err);
      }
      // console.log('RESP',JSON.stringify(data, null, 4));
      debug('getItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();

      model.$__.isNew = false;
      schema.parseDynamo(model, data.Item);

      debug('getItem parsed model', model);

      deferred.resolve(model);
    });
  }


  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(get);
  } else {
    get();
  }
  return deferred.promise.nodeify(next);
};

/* NewModel.update({id: 123},
 // {
 //   $PUT: {a: 1, b: 2},
 //   $DELETE: {c: 'a'},
 //   $ADD: {count: 1}
 // });
 // NewModel.update({id: 123}, { $PUT: {a: 1, b: 2} });
 // NewModel.update({id: 123}, {a: 1, b: 2} ); // Defaults to put (same as above)*/
/* eslint complexity: ["error", 36] */
Model.update = function update(NewModel, key, update, options, next) {
  debug('Update %j', key);
  var deferred = Q.defer();
  if (key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if (!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if (schema.rangeKey && !key[schema.rangeKey.name]) {
    deferred.reject(new errors.ModelError('Range key required: ' + schema.rangeKey.name));
    return deferred.promise.nodeify(next);
  }


  var updateReq = {
    TableName: NewModel.$__.name,
    Key: {},
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    ReturnValues: 'ALL_NEW'
  };
  processCondition(updateReq, options, NewModel.$__.schema);

  updateReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

  if (schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    updateReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  // determine the set of operations to be executed
  var operations = {
    SET: {},
    ADD: {},
    REMOVE: {}
  };
  if (update.$PUT || (!update.$PUT && !update.$DELETE && !update.$ADD)) {
    var updatePUT = update;
    if (update.$PUT) {
      updatePUT = update.$PUT;
    }
    for (var putItem in updatePUT) {
      var putAttr = schema.attributes[putItem];
      if (putAttr) {
        var val = updatePUT[putItem];

        var removeParams = val === null || val === undefined || val === '';

        if (!options.allowEmptyArray) {
          removeParams = removeParams || (Array.isArray(val) && val.length === 0);
        }

        if (removeParams) {
          operations.REMOVE[putItem] = null;
        } else {
          operations.SET[putItem] = putAttr.toDynamo(val);
        }
      }
    }
  }

  if (update.$DELETE) {
    for (var deleteItem in update.$DELETE) {
      var deleteAttr = schema.attributes[deleteItem];
      if (deleteAttr) {
        var delVal = update.$DELETE[deleteItem];
        if (delVal !== null && delVal !== undefined) {
          operations.REMOVE[deleteItem] = deleteAttr.toDynamo(delVal);
        } else {
          operations.REMOVE[deleteItem] = null;
        }
      }
    }
  }

  if (update.$ADD) {
    for (var addItem in update.$ADD) {
      var addAttr = schema.attributes[addItem];
      if (addAttr) {
        operations.ADD[addItem] = addAttr.toDynamo(update.$ADD[addItem]);
      }
    }
  }

  // construct the update expression
  //
  // we have to use update expressions because we are supporting
  // condition expressions, and you can't mix expressions with
  // non-expressions
  var attrCount = 0;
  updateReq.UpdateExpression = '';
  var first, k;
  for (var op in operations) {
    if (Object.keys(operations[op]).length) {
      if (updateReq.UpdateExpression) {
        updateReq.UpdateExpression += ' ';
      }
      updateReq.UpdateExpression += op + ' ';
      first = true;
      for (k in operations[op]) {
        if (first) {
          first = false;
        } else {
          updateReq.UpdateExpression += ',';
        }
        var attrName = '#_n' + attrCount;
        var valName = ':_p' + attrCount;
        updateReq.UpdateExpression += attrName;
        updateReq.ExpressionAttributeNames[attrName] = k;
        if (operations[op][k]) {
          updateReq.UpdateExpression += ' ' + (op === 'SET' ? '= ' : '') + valName;
          updateReq.ExpressionAttributeValues[valName] = operations[op][k];
        }
        attrCount += 1;
      }
    }
  }

  // AWS doesn't allow empty expressions or attribute collections
  if (!updateReq.UpdateExpression) {
    delete updateReq.UpdateExpression;
  }
  if (!Object.keys(updateReq.ExpressionAttributeNames).length) {
    delete updateReq.ExpressionAttributeNames;
  }
  if (!Object.keys(updateReq.ExpressionAttributeValues).length) {
    delete updateReq.ExpressionAttributeValues;
  }

  var newModel$ = NewModel.$__;

  function updateItem() {
    debug('updateItem', updateReq);
    newModel$.base.ddb().updateItem(updateReq, function (err, data) {
      if (err) {
        debug('Error returned by updateItem', err);
        return deferred.reject(err);
      }
      debug('updateItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();
      model.$__.isNew = false;
      schema.parseDynamo(model, data.Attributes);

      debug('updateItem parsed model', model);

      deferred.resolve(model);
    });
  }

  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(updateItem);
  } else {
    updateItem();
  }

  return deferred.promise.nodeify(next);
};

Model.delete = function (NewModel, key, options, next) {

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if (!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if (schema.rangeKey && !key[schema.rangeKey.name]) {
    var deferred = Q.defer();
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }

  var model = new NewModel(key);
  return model.delete(options, next);
};

Model.prototype.delete = function (options, next) {
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = this.$__.schema;

  var hashKeyName = schema.hashKey.name;

  var deferred = Q.defer();

  if (this[hashKeyName] === null || this[hashKeyName] === undefined) {
    deferred.reject(new errors.ModelError('Hash key required: %s', hashKeyName));
    return deferred.promise.nodeify(next);
  }

  if (schema.rangeKey &&
    (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }


  var getDelete = {
    TableName: this.$__.name,
    Key: {}
  };

  getDelete.Key[hashKeyName] = schema.hashKey.toDynamo(this[hashKeyName]);

  if (schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    getDelete.Key[rangeKeyName] = schema.rangeKey.toDynamo(this[rangeKeyName]);
  }

  if (options.update) {
    getDelete.ReturnValues = 'ALL_OLD';
    getDelete.ConditionExpression = 'attribute_exists(' + schema.hashKey.name + ')';
  }

  var model = this;
  var model$ = this.$__;

  function deleteItem() {

    debug('deleteItem', getDelete);
    model$.base.ddb().deleteItem(getDelete, function (err, data) {
      if (err) {
        debug('Error returned by deleteItem', err);
        return deferred.reject(err);
      }
      debug('deleteItem response', data);

      if (options.update) {
        if (data.Attributes) {
          schema.parseDynamo(model, data.Attributes);
          debug('deleteItem parsed model', model);
        }
      }

      deferred.resolve(model);
    });
  }

  if (model$.options.waitForActive) {
    model$.table.waitForActive().then(deleteItem);
  } else {
    deleteItem();
  }

  return deferred.promise.nodeify(next);

};

/*
 query(query, options, callback);
 query(query, options)...exec(callback);
 query(query, callback);
 query(query)...exec(callback);
 query({hash: {id: {eq : 1}}, range: {name: {beginwith: 'foxy'}}})
 query({id: 1})
 query('id').eq(1).where('name').begienwith('foxy')
 */
Model.query = function (NewModel, query, options, next) {
  if (typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);

  if (next) {
    query.exec(next);
  }

  return query;
};

Model.queryOne = function (NewModel, query, options, next) {
  if (typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);
  query.one();

  if (next) {
    query.exec(next);
  }

  return query;
};


/*

 scan(filter, options, callback);
 scan(filter, options)...exec(callback);
 scan(filter, callback);
 scan(filter)...exec(callback);

 scan('id').between(a, b).and().where('name').begienwith('foxy').exec();

 scan().exec(); // All records

 */
Model.scan = function (NewModel, filter, options, next) {
  if (typeof options === 'function') {
    next = options;
    options = null;
  }

  var scan = new Scan(NewModel, filter, options);

  if (next) {
    scan.exec(next);
  }

  return scan;
};

Model.batchGet = function (NewModel, keys, options, next) {
  debug('BatchGet %j', keys);
  var deferred = Q.defer();
  if (!(keys instanceof Array)) {
    deferred.reject(new errors.ModelError('batchGet requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  keys = keys.map(function (key) {
    if (!key[hashKeyName]) {
      var ret = {};
      ret[hashKeyName] = key;
      return ret;
    }
    return key;
  });

  if (schema.rangeKey && !keys.every(function (key) {
    return key[schema.rangeKey.name];
  })) {
    deferred.reject(
      new errors.ModelError('Range key required: ' + schema.rangeKey.name)
    );
    return deferred.promise.nodeify(next);
  }

  var batchReq = {
    RequestItems: {}
  };

  var getReq = {};
  batchReq.RequestItems[NewModel.$__.name] = getReq;

  getReq.Keys = keys.map(function (key) {
    var ret = {};
    ret[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

    if (schema.rangeKey) {
      var rangeKeyName = schema.rangeKey.name;
      ret[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
    }
    return ret;
  });

  if (options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if (options.consistent) {
    getReq.ConsistentRead = true;
  }

  var newModel$ = NewModel.$__;

  function batchGet() {
    debug('batchGetItem', batchReq);
    newModel$.base.ddb().batchGetItem(batchReq, function (err, data) {
      if (err) {
        debug('Error returned by batchGetItem', err);
        return deferred.reject(err);
      }
      debug('batchGetItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      function toModel(item) {
        var model = new NewModel();
        model.$__.isNew = false;
        schema.parseDynamo(model, item);

        debug('batchGet parsed model', model);

        return model;
      }

      var models = data.Responses[newModel$.name] ? data.Responses[newModel$.name].map(toModel) : [];
      if (data.UnprocessedKeys[newModel$.name]) {
        // convert unprocessed keys back to dynamoose format
        models.unprocessed = data.UnprocessedKeys[newModel$.name].Keys.map(function (key) {
          var ret = {};
          ret[hashKeyName] = schema.hashKey.parseDynamo(key[hashKeyName]);

          if (schema.rangeKey) {
            var rangeKeyName = schema.rangeKey.name;
            ret[rangeKeyName] = schema.rangeKey.parseDynamo(key[rangeKeyName]);
          }
          return ret;
        });
      }
      deferred.resolve(models);
    });
  }


  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchGet);
  } else {
    batchGet();
  }
  return deferred.promise.nodeify(next);
};

function toBatchChunks(modelName, list, chunkSize, requestMaker) {
  var listClone = list.slice(0);
  var chunk = [];
  var batchChunks = [];

  while ((chunk = listClone.splice(0, chunkSize)).length) {
    var requests = chunk.map(requestMaker);
    var batchReq = {
      RequestItems: {}
    };

    batchReq.RequestItems[modelName] = requests;
    batchChunks.push(batchReq);
  }

  return batchChunks;
}

function reduceBatchResult(resultList) {

  return resultList.reduce(function (acc, res) {
    var responses = res.Responses ? res.Responses : {};
    var unprocessed = res.UnprocessedItems ? res.UnprocessedItems : {};

    // merge responses
    for (var tableName in responses) {
      if (responses.hasOwnProperty(tableName)) {
        var consumed = acc.Responses[tableName] ? acc.Responses[tableName].ConsumedCapacityUnits : 0;
        consumed += responses[tableName].ConsumedCapacityUnits;

        acc.Responses[tableName] = {
          ConsumedCapacityUnits: consumed
        };
      }
    }

    // merge unprocessed items
    for (var tableName2 in unprocessed) {
      if (unprocessed.hasOwnProperty(tableName2)) {
        var items = acc.UnprocessedItems[tableName2] ? acc.UnprocessedItems[tableName2] : [];
        items.push(unprocessed[tableName2]);
        acc.UnprocessedItems[tableName2] = items;
      }
    }

    return acc;
  }, {Responses: {}, UnprocessedItems: {}});
}

function batchWriteItems(NewModel, batchRequests) {
  debug('batchWriteItems');
  var newModel$ = NewModel.$__;

  var batchList = batchRequests.map(function (batchReq) {
    var deferredBatch = Q.defer();

    newModel$.base.ddb().batchWriteItem(batchReq, function (err, data) {
      if (err) {
        debug('Error returned by batchWriteItems', err);
        return deferredBatch.reject(err);
      }

      deferredBatch.resolve(data);
    });

    return deferredBatch.promise;
  });

  return Q.all(batchList).then(function (resultList) {
    return reduceBatchResult(resultList);
  });
}

Model.batchPut = function (NewModel, items, options, next) {
  debug('BatchPut %j', items);
  var deferred = Q.defer();

  if (!(items instanceof Array)) {
    deferred.reject(new errors.ModelError('batchPut requires items to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;
  var newModel$ = NewModel.$__;

  var batchRequests = toBatchChunks(newModel$.name, items, MAX_BATCH_WRITE_SIZE, function (item) {
    return {
      PutRequest: {
        Item: schema.toDynamo(item)
      }
    };
  });

  var batchPut = function () {
    batchWriteItems(NewModel, batchRequests).then(function (result) {
      deferred.resolve(result);
    }).fail(function (err) {
      deferred.reject(err);
    });
  };

  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchPut);
  } else {
    batchPut();
  }
  return deferred.promise.nodeify(next);
};

Model.batchDelete = function (NewModel, keys, options, next) {
  debug('BatchDel %j', keys);
  var deferred = Q.defer();

  if (!(keys instanceof Array)) {
    deferred.reject(new errors.ModelError('batchDelete requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }

  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;
  var newModel$ = NewModel.$__;
  var hashKeyName = schema.hashKey.name;

  var batchRequests = toBatchChunks(newModel$.name, keys, MAX_BATCH_WRITE_SIZE, function (key) {
    var key_element = {};
    key_element[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

    if (schema.rangeKey) {
      key_element[schema.rangeKey.name] = schema.rangeKey.toDynamo(key[schema.rangeKey.name]);
    }

    return {
      DeleteRequest: {
        Key: key_element
      }
    };
  });

  var batchDelete = function () {
    batchWriteItems(NewModel, batchRequests).then(function (result) {
      deferred.resolve(result);
    }).fail(function (err) {
      deferred.reject(err);
    });
  };

  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchDelete);
  } else {
    batchDelete();
  }
  return deferred.promise.nodeify(next);
};

module.exports = Model;
