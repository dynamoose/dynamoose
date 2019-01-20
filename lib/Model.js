'use strict';

const util = require('util');
const Q = require('q');
const hooks = require('hooks');
const Attribute = require('./Attribute');
const Table = require('./Table');
const Query = require('./Query');
const Scan = require('./Scan');
const Plugin = require('./Plugin');
const errors = require('./errors');
const reservedKeywords = require('./reserved-keywords');
const objectPath = require('object-path');

//const MAX_BATCH_READ_SIZE   = 100;
const MAX_BATCH_WRITE_SIZE  = 25;
const debug = require('debug')('dynamoose:model');

function Model(obj) {
  this.$__.isNew = true;

  for(const key in obj) {
    this[key] = obj[key];
  }
}

async function processCondition(req, options, schema) {
  if (options.condition) {
    if(req.ConditionExpression) {
      req.ConditionExpression = `(${req.ConditionExpression}) and (${options.condition})`;
    } else {
      req.ConditionExpression = options.condition;
    }

    if(options.conditionNames) {
      req.ExpressionAttributeNames = {};
      for(const name in options.conditionNames) {
        req.ExpressionAttributeNames['#' + name] = options.conditionNames[name];
      }
    }
    if(options.conditionValues) {
      req.ExpressionAttributeValues = {};
      const keys = Object.keys(options.conditionValues);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];

        const val = options.conditionValues[k];
        const attr = schema.attributes[k];
        if(attr) {
          req.ExpressionAttributeValues[':' + k] = await attr.toDynamo(val);
        } else {
          throw new errors.ModelError(`Invalid condition value: ${k}. The name must either be in the schema or a full DynamoDB object must be specified.`);
        }
      }
    }
  }
}

Model.compile = function compile (name, schema, options, base) {
  debug('compiling NewModel %s', name);

  let table = new Table(name, schema, options, base);

  /*jshint validthis: true */
  function NewModel (obj) {
    Model.call(this, obj);
    applyVirtuals(this, schema);
    this.$__.originalItem = obj;
  }

  // Set NewModel.name to match name of table. Original property descriptor
  // values are reused.
  let nameDescriptor = Object.getOwnPropertyDescriptor(NewModel, 'name');
  // Skip if 'name' property can not be redefined. This probably means
  // code is running in a "non-standard, pre-ES2015 implementations",
  // like node 0.12.
  if (nameDescriptor.configurable) {
    nameDescriptor.value = 'Model-' + name;
    Object.defineProperty(NewModel, 'name', nameDescriptor);
  }

  util.inherits(NewModel, Model);

  // minimize what is restricted
  NewModel.prototype.$__ = {
    table: table,
    base: base,
    name: name,
    schema: schema,
    options: options,
    NewModel: NewModel,
    plugins: []
  };
  NewModel.$__ = NewModel.prototype.$__;


  NewModel.plugin = function(pluginPackage, options) {
    var obj = {
      event: {
        plugin: pluginPackage,
        pluginOptions: options
      }
    };
    // Emit plugin type `plugin:register` with stage `pre`
    this._emit('plugin:register', 'pre', obj);

    // Run actual action to create plugin
    this.$__.plugins.push(new Plugin(this, pluginPackage, options, this.plugin.bind(this)));

    // Emit plugin type `plugin:register` with stage `post`
    this._emit('plugin:register', 'post', obj);
  };

  NewModel.clearAllPlugins = function() {
    debug('Clearing all plugins');
    this.$__.plugins = [];
  };

  // This is a private function that is only used to emit signals to plugins within the Dynamoose plugin, this function should not be documentated or used outside of Dynamoose.
  NewModel._emit = async function(type, stage, obj, deferred) {

    if (!obj) {
      obj = {};
    }

    // If obj.actions is undefined set to empty object
    if (!obj.actions) {
      obj.actions = {};
    }

    for (let i = 0; i < this.$__.plugins.length; i++) {
      const plugin = this.$__.plugins[i];
      const result = await plugin.emit(type, stage, obj);
      if (result) {
        if (result.resolve) {
          deferred.resolve(result.resolve);
          return false;
        } else if (result.reject) {
          deferred.reject(result.reject);
          return false;
        }
      }
    }
  };

  NewModel.prototype.originalItem = function () {
    return this.$__.originalItem;
  };
  NewModel.prototype.model = function(modelName) {
    const models = this.$__.base.models;
    if (!models.hasOwnProperty(modelName)) {
      const errorMsg = 'Schema hasn\'t been registered for model "' +
      modelName + '".\n' + 'Use dynamoose.model(name, schema)';
      throw new errors.ModelError(errorMsg);
    }
    return models[modelName];
  };


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

  NewModel.getTableReq = function() {
    return table.buildTableReq(table.name, table.schema);
  };

  NewModel.conditionCheck = function (key, options, next) {
    try {
      return Model.conditionCheck(NewModel, key, options, next);
    } catch(err) {
      sendErrorToCallback(err, options, next);
      return Q.reject(err);
    }
  };

  function createTransactionFunction(func, val, optionsIndex) {
    return async function (...args) {
      if (typeof args[args.length - 1] === "function") {
        console.warning("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
        // Callback function passed in which is not allowed, removing that from arguments list
        args.pop();
      }

      // Adding returnRequest to options
      if (args.length >= (optionsIndex + 1)) {
        args[optionsIndex] = {...args[optionsIndex], returnRequest: true};
      } else if (args.length < optionsIndex) {
        args[optionsIndex] = {returnRequest: true};
      } else {
        args.push({returnRequest: true});
      }

      const requestObj = await func(...args);

      if (val === "Update") {
        delete requestObj.ReturnValues;
      }

      return {[val]: requestObj};
    };
  }
  NewModel.transaction = [
    // method - the method to be called when the user calls this method
    // key - the key to be attached to the returned request object to pass into the DynamoDB transaciton request
    // name - the name to attach to the resulting object for NewModel.transaction
    // optionsIndex - the zero-based index for where the options parameter should be in the method arguments list
    {method: NewModel.get, key: "Get", name: "get", optionsIndex: 1},
    {method: NewModel.delete, key: "Delete", name: "delete", optionsIndex: 1},
    {method: NewModel.create, key: "Put", name: "create", optionsIndex: 1},
    {method: NewModel.update, key: "Update", name: "update", optionsIndex: 2},
    {method: NewModel.conditionCheck, key: "ConditionCheck", name: "conditionCheck", optionsIndex: 1}
  ].reduce((original, newItem) => {
    original[newItem.name] = createTransactionFunction(newItem.method, newItem.key, newItem.optionsIndex);
    return original;
  }, {});

  // apply methods and statics
  applyMethods(NewModel, schema);
  applyStatics(NewModel, schema);

  // set up middleware
  for (const k in hooks) {
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
const applyMethods = function(model, schema) {
  debug('applying methods');
  for (const i in schema.methods) {
    model.prototype[i] = schema.methods[i];
  }
};

/*!
* Register statics for this model
* @param {Model} model
* @param {Schema} schema
*/
const applyStatics = function(model, schema) {
  debug('applying statics');
  for (const i in schema.statics) {
    model[i] = schema.statics[i].bind(model);
  }
};

/*!
* Register virtuals for this model
* @param {Model} model
* @param {Schema} schema
*/
const applyVirtuals = function(model, schema){
  debug('applying virtuals');
  for (const i in schema.virtuals){
    schema.virtuals[i].applyVirtuals(model);
  }
};

function validKeyValue(value) {
  return value !== undefined && value !== null && value !== '';
}

Model.conditionCheck = async function(NewModel, key, options, next) {
  debug('Condition Check', this);
  const self = this;
  const deferred = Q.defer();
  let item;

  try {
    options = options || {};
    if(typeof options === 'function') {
      next = options;
      options = {};
    }

    let schema = NewModel.$__.schema;
    let hashKeyName = schema.hashKey.name;

    if(!validKeyValue(key[hashKeyName])) {
      let keyVal = key;
      key = {};
      key[hashKeyName] = keyVal;
    }

    if(schema.rangeKey && !validKeyValue(key[schema.rangeKey.name])) {
      deferred.reject(
        new errors.ModelError('Range key required: ' + schema.rangeKey.name)
      );
      return deferred.promise.nodeify(next);
    }

    let conditionReq = {
      TableName: NewModel.$__.name,
      Key: {}
    };
    try {
      conditionReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName], undefined, key);
    } catch (e) {
      deferred.reject(e);
    }

    if(schema.rangeKey) {
      let rangeKeyName = schema.rangeKey.name;
      conditionReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
    }
    processCondition(conditionReq, options, schema);

    debug('Condition Check', conditionReq);
    deferred.resolve(conditionReq);
  } catch(err) {
    deferred.reject(err);
  }
  return deferred.promise.nodeify(next);
};

Model.prototype.put = async function(options, next) {
  var self = this;
  debug('put', this);
  const deferred = Q.defer();
  let shouldContinue = await this.$__.NewModel._emit('model:put', 'put:called', {event: {callback: next, options: options}, actions: {updateCallback: function(cb) {next = cb;}, updateOptions: function(newOptions) {options = newOptions;}}}, deferred);
  if (shouldContinue === false) { return; }
  let model, model$, item;

  async function putItem() {
    let shouldContinue = await self.$__.NewModel._emit('model:put', 'request:pre', {event: {options: options, item: item}, actions: {updateItem: function(newItem) {item = newItem;}}}, deferred);
    if (shouldContinue === false) { return; }
    model$.base.ddb().putItem(item, async function(err) {
      let shouldContinue = await self.$__.NewModel._emit('model:put', 'request:post', {event: {options: options, item: item, error: err}, actions: {updateError: function(newErr) {err = newErr;}}}, deferred);
      if (shouldContinue === false) { return; }
      if(err) {
        deferred.reject(err);
      }
      deferred.resolve(model);
    });
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

    let toDynamoOptions = {
      updateTimestamps: true
    };

    if (options.updateTimestamps === false) {
      toDynamoOptions.updateTimestamps = false;
    }

    if (options.updateExpires === true) {
      toDynamoOptions.updateExpires = true;
    }

    let schema = this.$__.schema;
    item = {
      TableName: this.$__.name,
      Item: await schema.toDynamo(this, toDynamoOptions)
    };

    await schema.parseDynamo(this, item.Item);

    if(!options.overwrite) {
      if (!reservedKeywords.isReservedKeyword(schema.hashKey.name) && !schema.hashKey.name.startsWith("_")) {
        item.ConditionExpression = `attribute_not_exists(${schema.hashKey.name})`;
      } else {
        item.ConditionExpression = 'attribute_not_exists(#__hash_key)';
        item.ExpressionAttributeNames = item.ExpressionAttributeNames || {};
        item.ExpressionAttributeNames['#__hash_key'] = schema.hashKey.name;
      }
    }
    await processCondition(item, options, schema);

    debug('putItem', item);

    model = this;
    model$ = this.$__;

    if (options.returnRequest) {
      deferred.resolve(item);
    } else if (model$.options.waitForActive) {
      model$.table.waitForActive().then(putItem).catch(deferred.reject);
    } else {
      putItem();
    }
  } catch(err) {
    deferred.reject(err);
  }
  return deferred.promise.nodeify(next);
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

  const model = new NewModel(obj);
  return model.save(options, next);
};

Model.get = async function(NewModel, key, options, next) {
  debug('Get %j', key);
  const deferred = Q.defer();
  let shouldContinue = await NewModel._emit('model:get', 'get:called', {event: {callback: next, key: key, options: options}, actions: {updateCallback: function(cb) {next = cb;}, updateKey: function(newKey) {key = newKey;}, updateOptions: function(newOptions) {options = newOptions;} }}, deferred);
  if (shouldContinue === false) { return; }

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }

  const schema = NewModel.$__.schema;
  const hashKeyName = schema.hashKey.name;

  if (typeof key === 'object' && !validKeyValue(key[hashKeyName])) {
    deferred.reject(new errors.ModelError(`Hash key required: ${schema.hashKey.name}`));
    return deferred.promise.nodeify(next);
  }

  if(!validKeyValue(key[hashKeyName])) {
    let keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !validKeyValue(key[schema.rangeKey.name])) {
    deferred.reject(
      new errors.ModelError('Range key required: ' + schema.rangeKey.name)
    );
    return deferred.promise.nodeify(next);
  }


  let getReq = {
    TableName: NewModel.$__.name,
    Key: {}
  };

  try {
    getReq.Key[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);
  } catch (e) {
    deferred.reject(e);
  }

  if(schema.rangeKey) {
    let rangeKeyName = schema.rangeKey.name;
    getReq.Key[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
  }

  if(options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    getReq.ConsistentRead = true;
  }

  let newModel$ = NewModel.$__;

  async function get () {
    debug('getItem', getReq);
    let shouldContinue = await NewModel._emit('model:get', 'request:pre', {event: {callback: next, key: key, options: options, getRequest: getReq}, actions: {updateCallback: function(cb) {next = cb;}, updateKey: function(newKey) {key = newKey;}, updateOptions: function(newOptions) {options = newOptions;}, updateGetRequest: function(newReq) {getReq = newReq;} }}, deferred);
    if (shouldContinue === false) { return; }
    newModel$.base.ddb().getItem(getReq, async function(err, data) {
      let shouldContinue = await NewModel._emit('model:get', 'request:post', {event: {callback: next, key: key, options: options, error: err, data: data}, actions: {updateCallback: function(cb) {next = cb;}, updateKey: function(newKey) {key = newKey;}, updateOptions: function(newOptions) {options = newOptions;}, updateError: function(newErr) {err = newErr;}, updateData: function(newData) {data = newData;} }}, deferred);
      if (shouldContinue === false) { return; }
      if(err) {
        debug('Error returned by getItem', err);
        return deferred.reject(err);
      }

      debug('getItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      let model = new NewModel();

      model.$__.isNew = false;
      try {
        await schema.parseDynamo(model, data.Item);
      } catch(e){
        debug('cannot parse data', data);
        return deferred.reject(e);
      }

      if (schema.expires && schema.expires.returnExpiredItems === false && model[schema.expires.attribute] < new Date()) {
      	deferred.resolve();
      }

      debug('getItem parsed model', model);
      deferred.resolve(model);
    });
  }

  if (options.returnRequest) {
	  deferred.resolve(getReq);
  } else if (newModel$.options.waitForActive) {
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
  if (!resultObj) {
    resultObj = this;
  }

  let ModelPathName = '';

  if (typeof options === 'string') {
    ModelPathName = this.$__.table.schema.attributes[options].options.ref;
  } else if (options.path) {
    ModelPathName = this.$__.table.schema.attributes[options.path].options.ref;
  } else if (!options.path && !options.model) {
    throw new Error('Invalid parameters provided to the populate method');
  }

  const modelPropName = Object.keys(this.$__.table.base.models).filter((key) => {
    const model = this.$__.table.base.models[key];
    return (
      model.$__.name === model.$__.options.prefix + options.model + model.$__.options.suffix ||
      model.$__.name === model.$__.options.prefix + options.model ||
      model.$__.name === options.model + model.$__.options.suffix ||
      model.$__.name === options.model ||
      model.$__.name === model.$__.options.prefix + ModelPathName + model.$__.options.suffix ||
      model.$__.name === model.$__.options.prefix + ModelPathName ||
      model.$__.name === ModelPathName + model.$__.options.suffix ||
      model.$__.name === ModelPathName
    );
  }).pop();
  const Model = this.$__.table.base.models[modelPropName];

  if (!Model) {
    throw new Error('The provided model doesn\'t exists');
  }

  return Model
  .get(this[options.path || options])
  .then(target => {
    if (!target) {
      throw new Error('Invalid reference');
    }
    this[options.path || options] = target;
    fillPath = fillPath.concat(options.path || options);
    objectPath.set(resultObj, fillPath, target);
    if (options.populate) {
      return this[options.path || options].populate(options.populate, resultObj, fillPath);
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
Model.update = async function(NewModel, key, update, options, next) {
  debug('Update %j', key);
  const deferred = Q.defer();
  const schema = NewModel.$__.schema;

  if(typeof update === 'function') {
    next = update;
    update = null;
  }

  if(update === undefined || update === null) {
    update = key;
  }

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

  // default return values to 'ALL_NEW' unless `defaultReturnValues` is set;
  if (typeof options.returnValues === 'undefined') {
    options.returnValues = NewModel.$__.options.defaultReturnValues || 'ALL_NEW';
  }

  // if the key part was emtpy, try the key defaults before giving up...
  if (key === null || key === undefined) {
    key = {};

    // first figure out the primary/hash key
    let hashKeyDefault = schema.attributes[schema.hashKey.name].options.default;

    if (typeof hashKeyDefault === 'undefined') {
      deferred.reject(new errors.ModelError('Key required to get item'));
      return deferred.promise.nodeify(next);
    }

    key[schema.hashKey.name] = typeof hashKeyDefault === 'function' ? hashKeyDefault() : hashKeyDefault;

    // now see if you have to figure out a range key
    if (schema.rangeKey) {
      let rangeKeyDefault = schema.attributes[schema.rangeKey.name].options.default;

      if (typeof rangeKeyDefault === 'undefined') {
        deferred.reject(new errors.ModelError('Range key required: ' + schema.rangeKey.name));
        return deferred.promise.nodeify(next);
      }

      key[schema.rangeKey.name] = typeof rangeKeyDefault === 'function' ? rangeKeyDefault() : rangeKeyDefault;
    }
  }

  let hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    let keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  let updateReq = {
    TableName: NewModel.$__.name,
    Key: {},
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
    ReturnValues: options.returnValues
  };
  await processCondition(updateReq, options, NewModel.$__.schema);

  updateReq.Key[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);

  if(schema.rangeKey) {
    let rangeKeyName = schema.rangeKey.name;
    updateReq.Key[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName]), undefined, key;
  }

  // determine the set of operations to be executed
  function Operations() {
    this.ifNotExistsSet = {};
    this.SET = {};
    this.ADD = {};
    this.REMOVE = {};
    this.LISTAPPEND = {};

    this.addIfNotExistsSet = function(name, item) {
      this.ifNotExistsSet[name] = item;
    };

    this.addSet = function(name, item) {
      if(schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.SET[name] = item;
      }
    };

    this.addListAppend = function(name, item) {
      if(schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.LISTAPPEND[name] = item;
      }
    };

    this.addAdd = function(name, item) {
      if(schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.ADD[name] = item;
      }
    };

    this.addRemove = function(name, item) {
      if(schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.REMOVE[name] = item;
      }
    };

    this.getUpdateExpression = function(updateReq) {
      let attrCount = 0;
      let updateExpression = '';

      let attrName;
      let valName;
      let name;
      let item;

      let setExpressions = [];
      for (name in this.ifNotExistsSet) {
        item = this.ifNotExistsSet[name];

        attrName = '#_n' + attrCount;
        valName = ':_p' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;
        updateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(`${attrName} = if_not_exists(${attrName}, ${valName})`);

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
      for (name in this.LISTAPPEND) {
        item = this.LISTAPPEND[name];

        attrName = '#_n' + attrCount;
        valName = ':_p' + attrCount;

        updateReq.ExpressionAttributeNames[attrName] = name;
        updateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(attrName + ' = ' + `list_append(${attrName}, ${valName})`);

        attrCount += 1;
      }
      if (setExpressions.length > 0) {
        updateExpression += `SET ${setExpressions.join(',')} `;
      }

      let addExpressions = [];
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
        updateExpression += `ADD ${addExpressions.join(',')} `;
      }

      let removeExpressions = [];
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

  let operations = new Operations();

  if (update.$PUT || (!update.$PUT && !update.$DELETE && !update.$ADD)) {
    let updatePUT = update.$PUT || update;

    for (const putItem in updatePUT) {
      let putAttr = schema.attributes[putItem];
      if (putAttr || schema.options.saveUnknown) {
        let val = updatePUT[putItem];

        let removeParams = val === null || val === undefined || val === '';

        if (!options.allowEmptyArray) {
          removeParams = removeParams || (Array.isArray(val) && val.length === 0);
        }

        if (removeParams) {
          operations.addRemove(putItem, null);
        } else {
          try {
            if (putAttr) {
              operations.addSet(putItem, await putAttr.toDynamo(val));
            } else if (schema.options.saveUnknown) {
              operations.addSet(putItem, await Attribute.create(schema, putItem, val).toDynamo(val));
            }
          } catch (err) {
            deferred.reject(err);
            return deferred.promise.nodeify(next);
          }
        }
      }
    }
  }

  if(update.$DELETE) {
    for(const deleteItem in update.$DELETE) {
      let deleteAttr = schema.attributes[deleteItem];
      if(deleteAttr || schema.options.saveUnknown) {
        let delVal = update.$DELETE[deleteItem];
        if(delVal !== null && delVal !== undefined) {
          try {
            if (deleteAttr) {
              operations.addRemove(deleteItem, await deleteAttr.toDynamo(delVal));
            } else {
              operations.addRemove(deleteItem, await Attribute.create(schema, deleteItem, delVal).toDynamo(delVal));
            }
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
    for(const addItem in update.$ADD) {
      let addAttr = schema.attributes[addItem];
      let addVal = update.$ADD[addItem];
      try {
        if (addAttr) {
          if (addAttr.type.name === "list") {
            operations.addListAppend(addItem, await addAttr.toDynamo(addVal));
          } else {
            operations.addAdd(addItem, await addAttr.toDynamo(addVal));
          }
        } else if (schema.options.saveUnknown) {
          operations.addAdd(addItem, await Attribute.create(schema, addItem, addVal).toDynamo(addVal));
        }
      } catch (err) {
        deferred.reject(err);
        return deferred.promise.nodeify(next);
      }
    }
  }

  // update schema timestamps
  if (options.updateTimestamps && schema.timestamps) {
    const createdAtLabel = schema.timestamps.createdAt;
    const updatedAtLabel = schema.timestamps.updatedAt;

    const createdAtAttribute = schema.attributes[createdAtLabel];
    const updatedAtAttribute = schema.attributes[updatedAtLabel];

    const createdAtDefaultValue = createdAtAttribute.options.default();
    const updatedAtDefaultValue = updatedAtAttribute.options.default();

    operations.addIfNotExistsSet(createdAtLabel, await createdAtAttribute.toDynamo(createdAtDefaultValue));
    operations.addSet(updatedAtLabel, await updatedAtAttribute.toDynamo(updatedAtDefaultValue));
  }

  // update schema expires
  if (options.updateExpires && schema.expires) {
    const expiresLabel = schema.expires.attribute;
    const expiresAttribute = schema.attributes[expiresLabel];
    const expiresDefaultValue = expiresAttribute.options.default();

    operations.addSet(expiresLabel, await expiresAttribute.toDynamo(expiresDefaultValue));
  }

  // do the required items check. Throw an error if you have an item that is required and
  //  doesn't have a default.
  if (options.createRequired) {
    for (const attributeName in schema.attributes) {
      let attribute = schema.attributes[attributeName];
      if (attribute.required && // if the attribute is required...
        attributeName !== schema.hashKey.name && // ...and it isn't the hash key...
        (!schema.rangeKey || attributeName !== schema.rangeKey.name) && // ...and it isn't the range key...
        (!schema.timestamps || attributeName !== schema.timestamps.createdAt) && // ...and it isn't the createdAt attribute...
        (!schema.timestamps || attributeName !== schema.timestamps.updatedAt) && // ...and it isn't the updatedAt attribute...
        !operations.SET[attributeName] &&
        !operations.ADD[attributeName] &&
        !operations.REMOVE[attributeName]) {

        let defaultValueOrFunction = attribute.options.default;

        // throw an error if you have required attribute without a default (and you didn't supply
        //  anything to update with)
        if (typeof defaultValueOrFunction === 'undefined') {
          let err = `Required attribute "${attributeName}" does not have a default.`;
          debug('Error returned by updateItem', err);
          deferred.reject(err);
          return deferred.promise.nodeify(next);
        }

        let defaultValue = typeof defaultValueOrFunction === 'function' ? defaultValueOrFunction() : defaultValueOrFunction;

        operations.addIfNotExistsSet(attributeName, await attribute.toDynamo(defaultValue));
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

  const newModel$ = NewModel.$__;

  function updateItem () {
    debug('updateItem', updateReq);
    newModel$.base.ddb().updateItem(updateReq, async function(err, data) {
      if(err) {
        debug('Error returned by updateItem', err);
        return deferred.reject(err);
      }
      debug('updateItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      const model = new NewModel();
      model.$__.isNew = false;
      try {
        await schema.parseDynamo(model, data.Attributes);
      } catch(e){
        debug('cannot parse data', data);
        return deferred.reject(e);
      }

      debug('updateItem parsed model', model);

      deferred.resolve(model);
    });
  }

  if (options.returnRequest) {
    deferred.resolve(updateReq);
  } else if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(updateItem).catch(deferred.reject);
  } else {
    updateItem();
  }

  return deferred.promise.nodeify(next);
};

Model.delete = function(NewModel, key, options, next) {

  const schema = NewModel.$__.schema;

  const hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    const keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
    const deferred = Q.defer();
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }

  const model = new NewModel(key);
  return model.delete(options, next);
};

Model.prototype.delete = async function(options, next) {
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  const schema = this.$__.schema;

  const hashKeyName = schema.hashKey.name;

  const deferred = Q.defer();

  if(this[hashKeyName] === null || this[hashKeyName] === undefined) {
    deferred.reject(new errors.ModelError('Hash key required: %s', hashKeyName));
    return deferred.promise.nodeify(next);
  }

  if(schema.rangeKey && (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }


  const getDelete = {
    TableName: this.$__.name,
    Key: {}
  };

  try {
    getDelete.Key[hashKeyName] = await schema.hashKey.toDynamo(this[hashKeyName], undefined, this);

    if(schema.rangeKey) {
      const rangeKeyName = schema.rangeKey.name;
      getDelete.Key[rangeKeyName] = await schema.rangeKey.toDynamo(this[rangeKeyName], undefined, this);
    }
  } catch (err) {
    deferred.reject(err);
    return deferred.promise.nodeify(next);
  }

  if(options.update) {
    getDelete.ReturnValues = 'ALL_OLD';
    getDelete.ConditionExpression = `attribute_exists(${schema.hashKey.name})`;
  }

  const model = this;
  const model$ = this.$__;

  function deleteItem() {

    debug('deleteItem', getDelete);
    model$.base.ddb().deleteItem(getDelete, async function(err, data) {
      if(err) {
        debug('Error returned by deleteItem', err);
        return deferred.reject(err);
      }
      debug('deleteItem response', data);

      if(options.update && data.Attributes) {
        try {
          await schema.parseDynamo(model, data.Attributes);
          debug('deleteItem parsed model', model);


        } catch (err) {
          return deferred.reject(err);
        }
      }

      deferred.resolve(model);
    });
  }

  if (options.returnRequest) {
    deferred.resolve(getDelete);
  } else if (model$.options.waitForActive) {
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

  const scan = new Scan(NewModel, filter, options);

  if(next) {
    scan.exec(next);
  }

  return scan;
};

Model.batchGet = async function(NewModel, keys, options, next) {
  debug('BatchGet %j', keys);
  const deferred = Q.defer();
  if(!(Array.isArray(keys))) {
    deferred.reject(new errors.ModelError('batchGet requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  const schema = NewModel.$__.schema;

  const hashKeyName = schema.hashKey.name;
  keys = keys.map(function (key) {
    if(!key[hashKeyName]) {
      const ret = {};
      ret[hashKeyName] = key;
      return ret;
    }
    return key;
  });

  if(schema.rangeKey && !keys.every(function (key) { return validKeyValue(key[schema.rangeKey.name]); })) {
    deferred.reject(
      new errors.ModelError('Range key required: ' + schema.rangeKey.name)
    );
    return deferred.promise.nodeify(next);
  }

  const batchReq = {
    RequestItems: {}
  };

  const getReq = {};
  batchReq.RequestItems[NewModel.$__.name] = getReq;

  getReq.Keys = await Promise.all(keys.map(async key => {
    const ret = {};
    ret[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);

    if(schema.rangeKey) {
      const rangeKeyName = schema.rangeKey.name;
      ret[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
    }
    return ret;
  }));

  if(options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    getReq.ConsistentRead = true;
  }

  const newModel$ = NewModel.$__;

  function batchGet () {
    debug('batchGetItem', batchReq);
    newModel$.base.ddb().batchGetItem(batchReq, async function(err, data) {
      if(err) {
        debug('Error returned by batchGetItem', err);
        return deferred.reject(err);
      }
      debug('batchGetItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      async function toModel (item) {
        const model = new NewModel();
        model.$__.isNew = false;
        await schema.parseDynamo(model, item);

        debug('batchGet parsed model', model);

        return model;
      }

      const models = data.Responses[newModel$.name] ? (await Promise.all(data.Responses[newModel$.name].map(toModel))).filter(item => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date())) : [];
      if (data.UnprocessedKeys[newModel$.name]) {
        // convert unprocessed keys back to dynamoose format
        models.unprocessed = await Promise.all(data.UnprocessedKeys[newModel$.name].Keys.map(async function (key) {
          const ret = {};
          ret[hashKeyName] = await schema.hashKey.parseDynamo(key[hashKeyName]);

          if(schema.rangeKey) {
            const rangeKeyName = schema.rangeKey.name;
            ret[rangeKeyName] = await schema.rangeKey.parseDynamo(key[rangeKeyName]);
          }
          return ret;
        }));
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

async function toBatchChunks(modelName, list, chunkSize, requestMaker) {
  const listClone = list.slice(0);
  let chunk = [];
  const batchChunks = [];

  while ((chunk = listClone.splice(0, chunkSize)).length) {
    const requests = await Promise.all(chunk.map(requestMaker));
    const batchReq = {
      RequestItems: {}
    };

    batchReq.RequestItems[modelName] = requests;
    batchChunks.push(batchReq);
  }

  return batchChunks;
}

function reduceBatchResult(resultList) {

  return resultList.reduce(function(acc, res) {
    const responses = res.Responses ? res.Responses : {};
    const unprocessed = res.UnprocessedItems ? res.UnprocessedItems : {};

    // merge responses
    for (const tableName in responses) {
      if (responses.hasOwnProperty(tableName)) {
        let consumed = acc.Responses[tableName] ? acc.Responses[tableName].ConsumedCapacityUnits : 0;
        consumed += responses[tableName].ConsumedCapacityUnits;

        acc.Responses[tableName] = {
          ConsumedCapacityUnits: consumed
        };
      }
    }

    // merge unprocessed items
    for (const tableName2 in unprocessed) {
      if (unprocessed.hasOwnProperty(tableName2)) {
        const items = acc.UnprocessedItems[tableName2] ? acc.UnprocessedItems[tableName2] : [];
        items.push(unprocessed[tableName2]);
        acc.UnprocessedItems[tableName2] = items;
      }
    }

    return acc;
  }, {Responses: {}, UnprocessedItems: {}});
}

function batchWriteItems (NewModel, batchRequests) {
  debug('batchWriteItems');
  const newModel$ = NewModel.$__;

  const batchList = batchRequests.map(function (batchReq) {
    const deferredBatch = Q.defer();

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

Model.batchPut = async function(NewModel, items, options, next) {
  debug('BatchPut %j', items);
  const deferred = Q.defer();

  if(!(Array.isArray(items))) {
    deferred.reject(new errors.ModelError('batchPut requires items to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  const schema = NewModel.$__.schema;
  const newModel$ = NewModel.$__;

  const toDynamoOptions = {
    updateTimestamps: options.updateTimestamps || false,
    updateExpires: options.updateExpires || false
  };

  const batchRequests = await toBatchChunks(newModel$.name, items, MAX_BATCH_WRITE_SIZE, async function(item) {
    return {
      PutRequest: {
        Item: await schema.toDynamo(item, toDynamoOptions)
      }
    };
  });

  const batchPut = function() {
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

Model.batchDelete = async function(NewModel, keys, options, next) {
  debug('BatchDel %j', keys);
  const deferred = Q.defer();

  if(!(Array.isArray(keys))) {
    deferred.reject(new errors.ModelError('batchDelete requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }

  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  const schema = NewModel.$__.schema;
  const newModel$ = NewModel.$__;
  const hashKeyName = schema.hashKey.name;

  const batchRequests = await toBatchChunks(newModel$.name, keys, MAX_BATCH_WRITE_SIZE, async function(key) {
    const key_element = {};
    key_element[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName]), undefined, key;

    if(schema.rangeKey) {
      key_element[schema.rangeKey.name] = await schema.rangeKey.toDynamo(key[schema.rangeKey.name], undefined, key);
    }

    return {
      DeleteRequest: {
        Key: key_element
      }
    };
  });

  const batchDelete = function() {
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
