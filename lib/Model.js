'use strict';
var util = require('util');
var Q = require('q');
var hooks = require('hooks');
var Table = require('./Table');
var Query = require('./Query');
var Scan = require('./Scan');
var errors = require('./errors');
var reservedKeywords = require('./reserved-keywords');
var deepSet = require('lodash').set;
var _filter = require('lodash').filter;

//var MAX_BATCH_READ_SIZE   = 100;
var MAX_BATCH_WRITE_SIZE  = 25;
var debug = require('debug')('dynamoose:model');

function Model(obj) {
  this.$__.isNew = true;

  for(var key in obj) {
    this[key] = obj[key];
  }
}

function processCondition(req, options, schema) {
  if (options.condition) {
    if(req.ConditionExpression) {
      req.ConditionExpression = '(' + req.ConditionExpression + ') and (' + options.condition + ')';
    } else {
      req.ConditionExpression = options.condition;
    }

    if(options.conditionNames) {
      req.ExpressionAttributeNames = {};
      for(var name in options.conditionNames) {
        req.ExpressionAttributeNames['#' + name] = options.conditionNames[name];
      }
    }
    if(options.conditionValues) {
      req.ExpressionAttributeValues = {};
      Object.keys(options.conditionValues).forEach(function (k) {
        var val = options.conditionValues[k];
        var attr = schema.attributes[k];
        if(attr) {
          req.ExpressionAttributeValues[':' + k] = attr.toDynamo(val);
        } else {
          throw new errors.ModelError('Invalid condition value: ' + k + '. The name must either be in the schema or a full DynamoDB object must be specified.');
        }
      });
    }
  }
}

Model.compile = function compile (name, schema, options, base) {
  debug('compiling NewModel %s', name);

  var table = new Table(name, schema, options, base);

  /*jshint validthis: true */
  function NewModel (obj) {
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
    try {
      return Model.get(NewModel, key, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.populate = function (options, resultObj, fillPath) {
    try {
      return Model.populate(options, resultObj, fillPath);
    } catch(err) {
      sendErrorToCallback(err, options);
      return Q.reject(err);
    }
  };

  NewModel.update = function (key, update, options, next) {
    try {
      return Model.update(NewModel, key, update, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.delete = function (key, options, next) {
    try {
      return Model.delete(NewModel, key, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.query = function (query, options, next) {
    try {
      return Model.query(NewModel, query, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.queryOne = function (query, options, next) {
    try {
      return Model.queryOne(NewModel, query, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.scan = function (filter, options, next) {
    try {
      return Model.scan(NewModel, filter, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.create = function (obj, options, next) {
    try {
      return Model.create(NewModel, obj, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.batchGet = function (keys, options, next) {
    try {
      return Model.batchGet(NewModel, keys, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.batchPut = function (keys, options, next) {
    try {
      return Model.batchPut(NewModel, keys, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  NewModel.batchDelete = function (keys, options, next) {
    try {
      return Model.batchDelete(NewModel, keys, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
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
    if(err) {
      throw err;
    }
  });

  return NewModel;
};

function sendErrorToCallback(error, options, next) {
  if(typeof options === 'function') {
    next = options;
  }
  if(typeof next === 'function') {
    next(error);
  }
}


/*!
 * Register methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */
var applyMethods = function(model, schema) {
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
var applyStatics = function(model, schema) {
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
var applyVirtuals = function(model, schema){
  debug('applying virtuals');
  for (var i in schema.virtuals){
    schema.virtuals[i].applyVirtuals(model);
  }
};




Model.prototype.put = function(options, next) {
  debug('put', this);
  var deferred = Q.defer();

  function putItem() {
    model$.base.ddb().putItem(item, function(err) {
      if(err) {
        deferred.reject(err);
      }
      deferred.resolve(model);
    });
    return deferred.promise.nodeify(next);
  }

  try {
    options = options || {};
    if(typeof options === 'function') {
      next = options;
      options = {};
    }
    if(options.overwrite === null || options.overwrite === undefined) {
      options.overwrite = true;
    }

    var schema = this.$__.schema;
    var item = {
      TableName: this.$__.name,
      Item: schema.toDynamo(this)
    };

    schema.parseDynamo(this, item.Item);

    if(!options.overwrite) {
      if (!reservedKeywords.isReservedKeyword(schema.hashKey.name)) {
        item.ConditionExpression = 'attribute_not_exists(' + schema.hashKey.name + ')';
      } else {
        item.ConditionExpression = 'attribute_not_exists(#__hash_key)';
        item.ExpressionAttributeNames = item.ExpressionAttributeNames || {};
        item.ExpressionAttributeNames['#__hash_key'] = schema.hashKey.name;
      }
    }
    processCondition(item, options, schema);

    debug('putItem', item);

    var model = this;
    var model$ = this.$__;

    if(model$.options.waitForActive) {
      return model$.table.waitForActive().then(putItem).catch(deferred.reject);
    }

    return putItem();
  } catch(err) {
    deferred.reject(err);
    return deferred.promise.nodeify(next);
  }
};

Model.prototype.save = Model.prototype.put;

Model.create = function(NewModel, obj, options, next) {
  options = options || {};

  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = false;
  }

  var model = new NewModel(obj);
  return model.save(options, next);
};

Model.get = function(NewModel, key, options, next) {
  debug('Get %j', key);
  var deferred = Q.defer();

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
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

  if(schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    getReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  if(options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    getReq.ConsistentRead = true;
  }

  var newModel$ = NewModel.$__;

  function get () {
    debug('getItem', getReq);
    newModel$.base.ddb().getItem(getReq, function(err, data) {
      if(err) {
        debug('Error returned by getItem', err);
        return deferred.reject(err);
      }

      debug('getItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();

      model.$__.isNew = false;
      schema.parseDynamo(model, data.Item);

      debug('getItem parsed model', model);
      deferred.resolve(model);
    });
  }

  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(get).catch(deferred.reject);
  } else {
    get();
  }
  return deferred.promise.nodeify(next);
};

Model.prototype.populate = function (options, resultObj, fillPath) {
  if (!fillPath) {
    fillPath = [];
  }
  var self = this;
  if (!resultObj) {
    resultObj = self;
  }
  if (!options.path || !options.model) {
    throw new Error('Invalid parameters provided to the populate method');
  }
  var Model = _filter(this.$__.table.base.models, function(model){
    return model.$__.name === model.$__.options.prefix + options.model || model.$__.name === options.model;
  }).pop();
  if (!Model) {
    throw new Error('The provided model doesn\'t exists');
  }
  return Model
    .get(self[options.path])
    .then(function(target){
      if (!target) {
        throw new Error('Invalid reference');
      }
      self[options.path] = target;
      fillPath = fillPath.concat(options.path);
      deepSet(resultObj, fillPath, target);
      if (options.populate) {
        return self[options.path].populate(options.populate, resultObj, fillPath);
      } else {
        return resultObj;
      }
    });
};

/* NewModel.update({id: 123},
// {
//   $PUT: {a: 1, b: 2},
//   $DELETE: {c: 'a'},
//   $ADD: {count: 1}
// });
// NewModel.update({id: 123}, { $PUT: {a: 1, b: 2} });
// NewModel.update({id: 123}, {a: 1, b: 2} ); // Defaults to put (same as above)*/
Model.update = function(NewModel, key, update, options, next) {
  debug('Update %j', key);
  var deferred = Q.defer();
  var schema = NewModel.$__.schema;

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  // default createRequired to false
  if (typeof options.createRequired === 'undefined') {
    options.createRequired = false;
  }

  // default updateTimestamps to true
  if (typeof options.updateTimestamps === 'undefined') {
    options.updateTimestamps = true;
  }

  // if the key part was emtpy, try the key defaults before giving up...
  if (key === null || key === undefined) {
    key = {};

    // first figure out the primary/hash key
    var hashKeyDefault = schema.attributes[schema.hashKey.name].options.default;

    if (typeof hashKeyDefault === 'undefined') {
      deferred.reject(new errors.ModelError('Key required to get item'));
      return deferred.promise.nodeify(next);
    }

    key[schema.hashKey.name] = typeof hashKeyDefault === 'function' ? hashKeyDefault() : hashKeyDefault;

    // now see if you have to figure out a range key
    if (schema.rangeKey) {
      var rangeKeyDefault = schema.attributes[schema.rangeKey.name].options.default;

      if (typeof rangeKeyDefault === 'undefined') {
        deferred.reject(new errors.ModelError('Range key required: ' + schema.rangeKey.name));
        return deferred.promise.nodeify(next);
      }

      key[schema.rangeKey.name] = typeof rangeKeyDefault === 'function' ? rangeKeyDefault() : rangeKeyDefault;
    }
  }

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
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

  if(schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    updateReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  // determine the set of operations to be executed
  function Operations() {
    this.ifNotExistsSet = {};
    this.SET = {};
    this.ADD = {};
    this.REMOVE = {};

    this.addIfNotExistsSet = function(name, item) {
      this.ifNotExistsSet[name] = item;
    };

    this.addSet = function(name, item) {
      this.SET[name] = item;
    };

    this.addAdd = function(name, item) {
      this.ADD[name] = item;
    };

    this.addRemove = function(name, item) {
      this.REMOVE[name] = item;
    };

    this.getUpdateExpression = function(updateReq) {
      var attrCount = 0;
      var updateExpression = '';

      var attrName;
      var valName;
      var name;
      var item;

      var setExpressions = [];
      for (name in this.ifNotExistsSet) {
        item = this.ifNotExistsSet[name];

        attrName = '#_n' + attrCount;
        valName = ':_p' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;
        updateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(attrName + ' = if_not_exists(' + attrName + ', ' + valName + ')');

        attrCount += 1;
      }

      for (name in this.SET) {
        item = this.SET[name];

        attrName = '#_n' + attrCount;
        valName = ':_p' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;
        updateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(attrName + ' = ' + valName);

        attrCount += 1;
      }
      if (setExpressions.length > 0) {
        updateExpression += 'SET ' + setExpressions.join(',') + ' ';
      }

      var addExpressions = [];
      for (name in this.ADD) {
        item = this.ADD[name];

        attrName = '#_n' + attrCount;
        valName = ':_p' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;
        updateReq.ExpressionAttributeValues[valName] = item;

        addExpressions.push(attrName + ' ' + valName);

        attrCount += 1;
      }
      if (addExpressions.length > 0) {
        updateExpression += 'ADD ' + addExpressions.join(',') + ' ';
      }

      var removeExpressions = [];
      for (name in this.REMOVE) {
        item = this.REMOVE[name];

        attrName = '#_n' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;

        removeExpressions.push(attrName);

        attrCount += 1;
      }
      if (removeExpressions.length > 0) {
        updateExpression += 'REMOVE ' + removeExpressions.join(',');
      }

      updateReq.UpdateExpression = updateExpression;
    };
  }

  var operations = new Operations();

  if (update.$PUT || (!update.$PUT && !update.$DELETE && !update.$ADD)) {
    var updatePUT = update.$PUT || update;

    for (var putItem in updatePUT) {
      var putAttr = schema.attributes[putItem];
      if (putAttr) {
        var val = updatePUT[putItem];

        var removeParams = val === null || val === undefined || val === '';

        if (!options.allowEmptyArray) {
          removeParams = removeParams || (Array.isArray(val) && val.length === 0);
        }

        if (removeParams) {
          operations.addRemove(putItem, null);
        } else {
          try {
            operations.addSet(putItem, putAttr.toDynamo(val));
          } catch (err) {
            deferred.reject(err);
            return deferred.promise.nodeify(next);
          }
        }
      }
    }
  }

  if(update.$DELETE) {
    for(var deleteItem in update.$DELETE) {
      var deleteAttr = schema.attributes[deleteItem];
      if(deleteAttr) {
        var delVal = update.$DELETE[deleteItem];
        if(delVal !== null && delVal !== undefined) {
          try {
            operations.addRemove(deleteItem, deleteAttr.toDynamo(delVal));
          } catch (err) {
            deferred.reject(err);
            return deferred.promise.nodeify(next);
          }
        } else {
          operations.addRemove(deleteItem, null);
        }
      }
    }
  }

  if(update.$ADD) {
    for(var addItem in update.$ADD) {
      var addAttr = schema.attributes[addItem];
      if(addAttr) {
        try {
          operations.addAdd(addItem, addAttr.toDynamo(update.$ADD[addItem]));
        } catch (err) {
          deferred.reject(err);
          return deferred.promise.nodeify(next);
        }
      }
    }
  }

  // update schema timestamps
  if (options.updateTimestamps && schema.timestamps) {
    var createdAtLabel = schema.timestamps.createdAt;
    var updatedAtLabel = schema.timestamps.updatedAt;

    var createdAtAttribute = schema.attributes[createdAtLabel];
    var updatedAtAttribute = schema.attributes[updatedAtLabel];

    var createdAtDefaultValue = createdAtAttribute.options.default();
    var updatedAtDefaultValue = updatedAtAttribute.options.default();

    operations.addIfNotExistsSet(createdAtLabel, createdAtAttribute.toDynamo(createdAtDefaultValue));
    operations.addSet(updatedAtLabel, updatedAtAttribute.toDynamo(updatedAtDefaultValue));
  }

  // do the required items check. Throw an error if you have an item that is required and
  //  doesn't have a default.
  if (options.createRequired) {
    for (var attributeName in schema.attributes) {
      var attribute = schema.attributes[attributeName];
      if (attribute.required && // if the attribute is required...
          attributeName !== schema.hashKey.name && // ...and it isn't the hash key...
          (!schema.rangeKey || attributeName !== schema.rangeKey.name) && // ...and it isn't the range key...
          (!schema.timestamps || attributeName !== schema.timestamps.createdAt) && // ...and it isn't the createdAt attribute...
          (!schema.timestamps || attributeName !== schema.timestamps.updatedAt) && // ...and it isn't the updatedAt attribute...
          !operations.SET[attributeName] &&
          !operations.ADD[attributeName] &&
          !operations.REMOVE[attributeName]) {

        var defaultValueOrFunction = attribute.options.default;

        // throw an error if you have required attribute without a default (and you didn't supply
        //  anything to update with)
        if (typeof defaultValueOrFunction === 'undefined') {
          var err = 'Required attribute "' + attributeName + '" does not have a default.';
          debug('Error returned by updateItem', err);
          deferred.reject(err);
          return deferred.promise.nodeify(next);
        }

        var defaultValue = typeof defaultValueOrFunction === 'function' ? defaultValueOrFunction() : defaultValueOrFunction;

        operations.addIfNotExistsSet(attributeName, attribute.toDynamo(defaultValue));
      }
    }
  }

  operations.getUpdateExpression(updateReq);

  // AWS doesn't allow empty expressions or attribute collections
  if(!updateReq.UpdateExpression) {
    delete updateReq.UpdateExpression;
  }
  if(!Object.keys(updateReq.ExpressionAttributeNames).length) {
    delete updateReq.ExpressionAttributeNames;
  }
  if(!Object.keys(updateReq.ExpressionAttributeValues).length) {
    delete updateReq.ExpressionAttributeValues;
  }

  var newModel$ = NewModel.$__;

  function updateItem () {
    debug('updateItem', updateReq);
    newModel$.base.ddb().updateItem(updateReq, function(err, data) {
      if(err) {
        debug('Error returned by updateItem', err);
        return deferred.reject(err);
      }
      debug('updateItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();
      model.$__.isNew = false;
      schema.parseDynamo(model, data.Attributes);

      debug('updateItem parsed model', model);

      deferred.resolve(model);
    });
  }

  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(updateItem).catch(deferred.reject);
  } else {
    updateItem();
  }

  return deferred.promise.nodeify(next);
};

Model.delete = function(NewModel, key, options, next) {

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
    var deferred = Q.defer();
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }

  var model = new NewModel(key);
  return model.delete(options, next);
};

Model.prototype.delete = function(options, next) {
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = this.$__.schema;

  var hashKeyName = schema.hashKey.name;

  var deferred = Q.defer();

  if(this[hashKeyName] === null || this[hashKeyName] === undefined) {
    deferred.reject(new errors.ModelError('Hash key required: %s', hashKeyName));
    return deferred.promise.nodeify(next);
  }

  if(schema.rangeKey &&
    (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }


  var getDelete = {
    TableName: this.$__.name,
    Key: {}
  };

  try {
    getDelete.Key[hashKeyName] = schema.hashKey.toDynamo(this[hashKeyName]);

    if(schema.rangeKey) {
      var rangeKeyName = schema.rangeKey.name;
      getDelete.Key[rangeKeyName] = schema.rangeKey.toDynamo(this[rangeKeyName]);
    }
  } catch (err) {
    deferred.reject(err);
    return deferred.promise.nodeify(next);
  }

  if(options.update) {
    getDelete.ReturnValues = 'ALL_OLD';
    getDelete.ConditionExpression = 'attribute_exists(' + schema.hashKey.name + ')';
  }

  var model = this;
  var model$ = this.$__;

  function deleteItem() {

    debug('deleteItem', getDelete);
    model$.base.ddb().deleteItem(getDelete, function(err, data) {
      if(err) {
        debug('Error returned by deleteItem', err);
        return deferred.reject(err);
      }
      debug('deleteItem response', data);

      if(options.update && data.Attributes) {
        try {
          schema.parseDynamo(model, data.Attributes);
          debug('deleteItem parsed model', model);


        } catch (err) {
          return deferred.reject(err);
        }
      }

      deferred.resolve(model);
    });
  }

  if(model$.options.waitForActive) {
    model$.table.waitForActive().then(deleteItem).catch(deferred.reject);
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
Model.query = function(NewModel, query, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);

  if(next) {
    query.exec(next);
  }

  return query;
};

Model.queryOne = function(NewModel, query, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);
  query.one();

  if(next) {
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
Model.scan = function(NewModel, filter, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  var scan = new Scan(NewModel, filter, options);

  if(next) {
    scan.exec(next);
  }

  return scan;
};

Model.batchGet = function(NewModel, keys, options, next) {
  debug('BatchGet %j', keys);
  var deferred = Q.defer();
  if(!(keys instanceof Array)) {
    deferred.reject(new errors.ModelError('batchGet requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  keys = keys.map(function (key) {
    if(!key[hashKeyName]) {
      var ret = {};
      ret[hashKeyName] = key;
      return ret;
    }
    return key;
  });

  if(schema.rangeKey && !keys.every(function (key) { return key[schema.rangeKey.name]; })) {
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

    if(schema.rangeKey) {
      var rangeKeyName = schema.rangeKey.name;
      ret[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
    }
    return ret;
  });

  if(options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    getReq.ConsistentRead = true;
  }

  var newModel$ = NewModel.$__;

  function batchGet () {
    debug('batchGetItem', batchReq);
    newModel$.base.ddb().batchGetItem(batchReq, function(err, data) {
      if(err) {
        debug('Error returned by batchGetItem', err);
        return deferred.reject(err);
      }
      debug('batchGetItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      function toModel (item) {
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

          if(schema.rangeKey) {
            var rangeKeyName = schema.rangeKey.name;
            ret[rangeKeyName] = schema.rangeKey.parseDynamo(key[rangeKeyName]);
          }
          return ret;
        });
      }
      deferred.resolve(models);
    });
  }


  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchGet).catch(deferred.reject);
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

  return resultList.reduce(function(acc, res) {
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

function batchWriteItems (NewModel, batchRequests) {
  debug('batchWriteItems');
  var newModel$ = NewModel.$__;

  var batchList = batchRequests.map(function (batchReq) {
    var deferredBatch = Q.defer();

    newModel$.base.ddb().batchWriteItem(batchReq, function(err, data) {
      if(err) {
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

Model.batchPut = function(NewModel, items, options, next) {
  debug('BatchPut %j', items);
  var deferred = Q.defer();

  if(!(items instanceof Array)) {
    deferred.reject(new errors.ModelError('batchPut requires items to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;
  var newModel$ = NewModel.$__;

  var batchRequests = toBatchChunks(newModel$.name, items, MAX_BATCH_WRITE_SIZE, function(item) {
    return {
      PutRequest: {
        Item: schema.toDynamo(item)
      }
    };
  });

  var batchPut = function() {
    batchWriteItems(NewModel, batchRequests).then(function (result) {
      deferred.resolve(result);
    }).fail(function (err) {
      deferred.reject(err);
    });
  };

  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchPut).catch(deferred.reject);
  } else {
    batchPut();
  }
  return deferred.promise.nodeify(next);
};

Model.batchDelete = function(NewModel, keys, options, next) {
  debug('BatchDel %j', keys);
  var deferred = Q.defer();

  if(!(keys instanceof Array)) {
    deferred.reject(new errors.ModelError('batchDelete requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;
  var newModel$ = NewModel.$__;
  var hashKeyName = schema.hashKey.name;

  var batchRequests = toBatchChunks(newModel$.name, keys, MAX_BATCH_WRITE_SIZE, function(key) {
    var key_element = {};
    key_element[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

    if(schema.rangeKey) {
      key_element[schema.rangeKey.name] = schema.rangeKey.toDynamo(key[schema.rangeKey.name]);
    }

    return {
      DeleteRequest: {
        Key: key_element
      }
    };
  });

  var batchDelete = function() {
    batchWriteItems(NewModel, batchRequests).then(function (result) {
      deferred.resolve(result);
    }).fail(function (err) {
      deferred.reject(err);
    });
  };

  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchDelete).catch(deferred.reject);
  } else {
    batchDelete();
  }
  return deferred.promise.nodeify(next);
};

module.exports = Model;
