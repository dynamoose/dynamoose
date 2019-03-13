import Q from 'q';
import objectPath from 'object-path';
import debugWrapper from 'debug';
import Attribute from './Attribute';
import Query from './Query';
import Scan from './Scan';
import errors from './errors';
import reservedKeywords from './reserved-keywords';
import { toBatchChunks, batchWriteItems, processCondition, validKeyValue } from './ModelLibs';

// const MAX_BATCH_READ_SIZE = 100;
const MAX_BATCH_WRITE_SIZE = 25;
const debug = debugWrapper('dynamoose:model');

function Model (obj) {
  this.$__.isNew = true;

  for (const key in obj) {
    this[key] = obj[key];
  }
}

Model.prototype.put = async function (options, next) {
  debug('put', this);
  const deferred = Q.defer();
  const shouldContinuePutCalled = await this.$__.NewModel._emit('model:put', 'put:called', {'event': {'callback': next, options}, 'actions': {'updateCallback' (cb) { next = cb; }, 'updateOptions' (newOptions) { options = newOptions; }}}, deferred);
  if (shouldContinuePutCalled === false) { return; }
  let item;

  const putItem = async () => {
    const shouldContinueRequestPre = await this.$__.NewModel._emit('model:put', 'request:pre', {'event': {options, item}, 'actions': {'updateItem' (newItem) { item = newItem; }}}, deferred);
    if (shouldContinueRequestPre === false) { return; }
    this.$__.base.ddb().putItem(item, async (err) => {
      const shouldContinueRequestPost = await this.$__.NewModel._emit('model:put', 'request:post', {'event': {options, item, 'error': err}, 'actions': {'updateError' (newErr) { err = newErr; }}}, deferred);
      if (shouldContinueRequestPost === false) { return; }
      if (err) {
        deferred.reject(err);
      }
      deferred.resolve(this);
    });
  };

  try {
    options = options || {};
    if (typeof options === 'function') {
      next = options;
      options = {};
    }
    if (options.overwrite === null || options.overwrite === undefined) {
      options.overwrite = true;
    }

    const toDynamoOptions: any = {
      'updateTimestamps': true
    };

    if (options.updateTimestamps === false) {
      toDynamoOptions.updateTimestamps = false;
    }

    if (options.updateExpires === true) {
      toDynamoOptions.updateExpires = true;
    }

    const {schema} = this.$__;
    item = {
      'TableName': this.$__.name,
      'Item': await schema.toDynamo(this, toDynamoOptions)
    };

    await schema.parseDynamo(this, item.Item);

    if (!options.overwrite) {
      if (!reservedKeywords.isReservedKeyword(schema.hashKey.name) && !schema.hashKey.name.startsWith('_')) {
        item.ConditionExpression = `attribute_not_exists(${schema.hashKey.name})`;
      } else {
        item.ConditionExpression = 'attribute_not_exists(#__hash_key)';
        item.ExpressionAttributeNames = item.ExpressionAttributeNames || {};
        item.ExpressionAttributeNames['#__hash_key'] = schema.hashKey.name;
      }
    }
    await processCondition(item, options, this);

    debug('putItem', item);

    if (options.returnRequest) {
      deferred.resolve(item);
    } else if (this.$__.options.waitForActive) {
      this.$__.table.waitForActive().then(putItem).catch(deferred.reject);
    } else {
      putItem();
    }
  } catch (err) {
    deferred.reject(err);
  }
  return deferred.promise.nodeify(next);
};

Model.prototype.save = Model.prototype.put;

Model.prototype.populate = function (options, resultObj, fillPath) {
  if (!fillPath) {
    fillPath = [];
  }
  const returnObj = resultObj || this;

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
  const ConnectedModel = this.$__.table.base.models[modelPropName];

  if (!ConnectedModel) {
    throw new Error("The provided model doesn't exists");
  }

  return ConnectedModel
    .get(this[options.path || options])
    .then((target) => {
      if (!target) {
        throw new Error('Invalid reference');
      }
      this[options.path || options] = target;
      fillPath = fillPath.concat(options.path || options);
      objectPath.set(returnObj, fillPath, target);
      if (options.populate) {
        return this[options.path || options].populate(options.populate, returnObj, fillPath);
      }
      return returnObj;
    });
};

Model.prototype.delete = async function (options, next) {
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  const {schema} = this.$__;

  const hashKeyName = schema.hashKey.name;

  const deferred = Q.defer();

  if (this[hashKeyName] === null || this[hashKeyName] === undefined) {
    deferred.reject(new errors.ModelError('Hash key required: %s', hashKeyName));
    return deferred.promise.nodeify(next);
  }

  if (schema.rangeKey && (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }


  const getDelete: any = {
    'TableName': this.$__.name,
    'Key': {}
  };

  try {
    getDelete.Key[hashKeyName] = await schema.hashKey.toDynamo(this[hashKeyName], undefined, this);

    if (schema.rangeKey) {
      const rangeKeyName = schema.rangeKey.name;
      getDelete.Key[rangeKeyName] = await schema.rangeKey.toDynamo(this[rangeKeyName], undefined, this);
    }
  } catch (err) {
    deferred.reject(err);
    return deferred.promise.nodeify(next);
  }

  if (options.update) {
    getDelete.ReturnValues = 'ALL_OLD';
    getDelete.ConditionExpression = `attribute_exists(${schema.hashKey.name})`;
  }

  const deleteItem = () => {

    debug('deleteItem', getDelete);
    this.$__.base.ddb().deleteItem(getDelete, async (err, data) => {
      if (err) {
        debug('Error returned by deleteItem', err);
        return deferred.reject(err);
      }
      debug('deleteItem response', data);

      if (options.update && data.Attributes) {
        try {
          await schema.parseDynamo(this, data.Attributes);
          debug('deleteItem parsed model', this);
        } catch (parseDynamoError) {
          return deferred.reject(parseDynamoError);
        }
      }

      deferred.resolve(this);
    });
  };

  if (options.returnRequest) {
    deferred.resolve(getDelete);
  } else if (this.$__.options.waitForActive) {
    this.$__.table.waitForActive().then(deleteItem).catch(deferred.reject);
  } else {
    deleteItem();
  }

  return deferred.promise.nodeify(next);

};

Model.conditionCheck = async function (NewModel, key, options, next) {
  debug('Condition Check', this);
  const deferred = Q.defer();

  try {
    options = options || {};
    if (typeof options === 'function') {
      next = options;
      options = {};
    }

    const {schema} = NewModel.$__;
    const hashKeyName = schema.hashKey.name;

    if (!validKeyValue(key[hashKeyName])) {
      const keyVal = key;
      key = {};
      key[hashKeyName] = keyVal;
    }

    if (schema.rangeKey && !validKeyValue(key[schema.rangeKey.name])) {
      deferred.reject(new errors.ModelError(`Range key required: ${schema.rangeKey.name}`));
      return deferred.promise.nodeify(next);
    }

    const conditionReq = {
      'TableName': NewModel.$__.name,
      'Key': {}
    };
    try {
      conditionReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName], undefined, key);
    } catch (e) {
      deferred.reject(e);
    }

    if (schema.rangeKey) {
      const rangeKeyName = schema.rangeKey.name;
      conditionReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
    }
    await processCondition(conditionReq, options, NewModel);

    debug('Condition Check', conditionReq);
    deferred.resolve(conditionReq);
  } catch (err) {
    deferred.reject(err);
  }
  return deferred.promise.nodeify(next);
};

Model.create = function (NewModel, obj, options, next) {
  options = options || {};

  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  if (options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = false;
  }

  const model = new NewModel(obj);
  return model.save(options, next);
};

Model.get = async function (NewModel, key, options, next) {
  debug('Get %j', key);
  const deferred = Q.defer();
  const shouldContinueGetCalled = await NewModel._emit('model:get', 'get:called', {'event': {'callback': next, key, options}, 'actions': {'updateCallback' (cb) { next = cb; }, 'updateKey' (newKey) { key = newKey; }, 'updateOptions' (newOptions) { options = newOptions; }}}, deferred);
  if (shouldContinueGetCalled === false) { return; }

  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  if (key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }

  const {schema} = NewModel.$__;
  const hashKeyName = schema.hashKey.name;

  if (typeof key === 'object' && !validKeyValue(key[hashKeyName])) {
    deferred.reject(new errors.ModelError(`Hash key required: ${schema.hashKey.name}`));
    return deferred.promise.nodeify(next);
  }

  if (!validKeyValue(key[hashKeyName])) {
    const keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if (schema.rangeKey && !validKeyValue(key[schema.rangeKey.name])) {
    deferred.reject(new errors.ModelError(`Range key required: ${schema.rangeKey.name}`));
    return deferred.promise.nodeify(next);
  }


  let getReq: any = {
    'TableName': NewModel.$__.name,
    'Key': {}
  };

  try {
    getReq.Key[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);
  } catch (e) {
    deferred.reject(e);
  }

  if (schema.rangeKey) {
    const rangeKeyName = schema.rangeKey.name;
    getReq.Key[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
  }

  if (options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if (options.consistent) {
    getReq.ConsistentRead = true;
  }

  const newModel$ = NewModel.$__;

  async function get () {
    debug('getItem', getReq);

    const emitEventObjectRequestPre = {'callback': next, key, options, 'getRequest': getReq};
    const emitObjectRequestPre = {'event': emitEventObjectRequestPre, 'actions': {'updateCallback' (cb) { next = cb; }, 'updateKey' (newKey) { key = newKey; }, 'updateOptions' (newOptions) { options = newOptions; }, 'updateGetRequest' (newReq) { getReq = newReq; }}};
    const shouldContinueRequestPre = await NewModel._emit('model:get', 'request:pre', emitObjectRequestPre, deferred);
    if (shouldContinueRequestPre === false) { return; }

    newModel$.base.ddb().getItem(getReq, async (err, data) => {

      const emitEventObjectRequestPost = {'callback': next, key, options, 'error': err, data};
      const emitObjectRequestPost = {'event': emitEventObjectRequestPost, 'actions': {'updateCallback' (cb) { next = cb; }, 'updateKey' (newKey) { key = newKey; }, 'updateOptions' (newOptions) { options = newOptions; }, 'updateError' (newErr) { err = newErr; }, 'updateData' (newData) { data = newData; }}};
      const shouldContinueRequestPost = await NewModel._emit('model:get', 'request:post', emitObjectRequestPost, deferred);
      if (shouldContinueRequestPost === false) { return; }

      if (err) {
        debug('Error returned by getItem', err);
        return deferred.reject(err);
      }

      debug('getItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      const model = new NewModel();

      model.$__.isNew = false;
      try {
        await schema.parseDynamo(model, data.Item);
      } catch (e) {
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



/* NewModel.update({id: 123},
// {
//   $PUT: {a: 1, b: 2},
//   $DELETE: {c: 'a'},
//   $ADD: {count: 1}
// });
// NewModel.update({id: 123}, { $PUT: {a: 1, b: 2} });
// NewModel.update({id: 123}, {a: 1, b: 2} ); // Defaults to put (same as above)*/
Model.update = async function (NewModel, key, update, options, next) {
  debug('Update %j', key);
  const deferred = Q.defer();
  const {schema} = NewModel.$__;

  if (typeof update === 'function') {
    next = update;
    update = undefined;
  }

  if (update === undefined || update === null) {
    update = key;
  }

  options = options || {};
  if (typeof options === 'function') {
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
    const hashKeyDefault = schema.attributes[schema.hashKey.name].options.default;

    if (typeof hashKeyDefault === 'undefined') {
      deferred.reject(new errors.ModelError('Key required to get item'));
      return deferred.promise.nodeify(next);
    }

    key[schema.hashKey.name] = typeof hashKeyDefault === 'function' ? hashKeyDefault() : hashKeyDefault;

    // now see if you have to figure out a range key
    if (schema.rangeKey) {
      const rangeKeyDefault = schema.attributes[schema.rangeKey.name].options.default;

      if (typeof rangeKeyDefault === 'undefined') {
        deferred.reject(new errors.ModelError(`Range key required: ${schema.rangeKey.name}`));
        return deferred.promise.nodeify(next);
      }

      key[schema.rangeKey.name] = typeof rangeKeyDefault === 'function' ? rangeKeyDefault() : rangeKeyDefault;
    }
  }

  const hashKeyName = schema.hashKey.name;
  if (!key[hashKeyName]) {
    const keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  const updateReq: any = {
    'TableName': NewModel.$__.name,
    'Key': {},
    'ExpressionAttributeNames': {},
    'ExpressionAttributeValues': {},
    'ReturnValues': options.returnValues
  };
  await processCondition(updateReq, options, NewModel);

  updateReq.Key[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);

  if (schema.rangeKey) {
    const rangeKeyName = schema.rangeKey.name;
    updateReq.Key[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
  }

  // determine the set of operations to be executed
  function Operations () {
    this.ifNotExistsSet = {};
    this.SET = {};
    this.ADD = {};
    this.REMOVE = {};
    this.LISTAPPEND = {};

    this.addIfNotExistsSet = function (name, item) {
      this.ifNotExistsSet[name] = item;
    };

    this.addSet = function (name, item) {
      if (schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.SET[name] = item;
      }
    };

    this.addListAppend = function (name, item) {
      if (schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.LISTAPPEND[name] = item;
      }
    };

    this.addAdd = function (name, item) {
      if (schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.ADD[name] = item;
      }
    };

    this.addRemove = function (name, item) {
      if (schema.hashKey.name !== name && (schema.rangeKey || {}).name !== name) {
        this.REMOVE[name] = item;
      }
    };

    this.getUpdateExpression = function (getUpdateReq) {
      let attrCount = 0;
      let updateExpression = '';

      let attrName;
      let valName;
      let name;
      let item;

      const setExpressions = [];
      for (name in this.ifNotExistsSet) {
        item = this.ifNotExistsSet[name];

        attrName = `#_n${attrCount}`;
        valName = `:_p${attrCount}`;

        getUpdateReq.ExpressionAttributeNames[attrName] = name;
        getUpdateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(`${attrName} = if_not_exists(${attrName}, ${valName})`);

        attrCount += 1;
      }

      for (name in this.SET) {
        item = this.SET[name];

        attrName = `#_n${attrCount}`;
        valName = `:_p${attrCount}`;

        getUpdateReq.ExpressionAttributeNames[attrName] = name;
        getUpdateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(`${attrName} = ${valName}`);

        attrCount += 1;
      }
      for (name in this.LISTAPPEND) {
        item = this.LISTAPPEND[name];

        attrName = `#_n${attrCount}`;
        valName = `:_p${attrCount}`;

        getUpdateReq.ExpressionAttributeNames[attrName] = name;
        getUpdateReq.ExpressionAttributeValues[valName] = item;

        setExpressions.push(`${attrName} = list_append(${attrName}, ${valName})`);

        attrCount += 1;
      }
      if (setExpressions.length > 0) {
        updateExpression += `SET ${setExpressions.join(',')} `;
      }

      const addExpressions = [];
      for (name in this.ADD) {
        item = this.ADD[name];

        attrName = `#_n${attrCount}`;
        valName = `:_p${attrCount}`;

        getUpdateReq.ExpressionAttributeNames[attrName] = name;
        getUpdateReq.ExpressionAttributeValues[valName] = item;

        addExpressions.push(`${attrName} ${valName}`);

        attrCount += 1;
      }
      if (addExpressions.length > 0) {
        updateExpression += `ADD ${addExpressions.join(',')} `;
      }

      const removeExpressions = [];
      for (name in this.REMOVE) {
        item = this.REMOVE[name];

        attrName = `#_n${attrCount}`;

        getUpdateReq.ExpressionAttributeNames[attrName] = name;

        removeExpressions.push(attrName);

        attrCount += 1;
      }
      if (removeExpressions.length > 0) {
        updateExpression += `REMOVE ${removeExpressions.join(',')}`;
      }

      getUpdateReq.UpdateExpression = updateExpression;
    };
  }

  const operations = new Operations();

  if (update.$PUT || !update.$PUT && !update.$DELETE && !update.$ADD) {
    const updatePUT = update.$PUT || update;

    for (const putItem in updatePUT) {
      const putAttr = schema.attributes[putItem];
      if (putAttr || schema.options.saveUnknown) {
        const val = updatePUT[putItem];

        let removeParams = val === null || val === undefined || val === '';

        if (!options.allowEmptyArray) {
          removeParams = removeParams || Array.isArray(val) && val.length === 0;
        }

        if (removeParams) {
          operations.addRemove(putItem, undefined);
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

  if (update.$DELETE) {
    for (const deleteItem in update.$DELETE) {
      const deleteAttr = schema.attributes[deleteItem];
      if (deleteAttr || schema.options.saveUnknown) {
        const delVal = update.$DELETE[deleteItem];
        if (delVal !== null && delVal !== undefined) {
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
          operations.addRemove(deleteItem, undefined);
        }
      }
    }
  }

  if (update.$ADD) {
    for (const addItem in update.$ADD) {
      const addAttr = schema.attributes[addItem];
      const addVal = update.$ADD[addItem];
      try {
        if (addAttr) {
          if (addAttr.type.name === 'list') {
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
      const attribute = schema.attributes[attributeName];
      if (attribute.required && // if the attribute is required...
        attributeName !== schema.hashKey.name && // ...and it isn't the hash key...
        (!schema.rangeKey || attributeName !== schema.rangeKey.name) && // ...and it isn't the range key...
        (!schema.timestamps || attributeName !== schema.timestamps.createdAt) && // ...and it isn't the createdAt attribute...
        (!schema.timestamps || attributeName !== schema.timestamps.updatedAt) && // ...and it isn't the updatedAt attribute...
        !operations.SET[attributeName] &&
        !operations.ADD[attributeName] &&
        !operations.REMOVE[attributeName]) {

        const defaultValueOrFunction = attribute.options.default;

        // throw an error if you have required attribute without a default (and you didn't supply
        //  anything to update with)
        if (typeof defaultValueOrFunction === 'undefined') {
          const err = `Required attribute "${attributeName}" does not have a default.`;
          debug('Error returned by updateItem', err);
          deferred.reject(err);
          return deferred.promise.nodeify(next);
        }

        const defaultValue = typeof defaultValueOrFunction === 'function' ? defaultValueOrFunction() : defaultValueOrFunction;

        operations.addIfNotExistsSet(attributeName, await attribute.toDynamo(defaultValue));
      }
    }
  }

  operations.getUpdateExpression(updateReq);

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

  const newModel$ = NewModel.$__;

  function updateItem () {
    debug('updateItem', updateReq);
    newModel$.base.ddb().updateItem(updateReq, async (err, data) => {
      if (err) {
        debug('Error returned by updateItem', err);
        return deferred.reject(err);
      }
      debug('updateItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      const model = new NewModel();
      model.$__.isNew = false;
      try {
        await schema.parseDynamo(model, data.Attributes);
      } catch (e) {
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

Model.delete = function (NewModel, key, options, next) {

  const {schema} = NewModel.$__;

  const hashKeyName = schema.hashKey.name;
  if (!key[hashKeyName]) {
    const keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if (schema.rangeKey && !key[schema.rangeKey.name]) {
    const deferred = Q.defer();
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }

  const model = new NewModel(key);
  return model.delete(options, next);
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
    options = undefined;
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
    options = undefined;
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
    options = undefined;
  }

  const scan = new Scan(NewModel, filter, options);

  if (next) {
    scan.exec(next);
  }

  return scan;
};

Model.batchGet = async function (NewModel, keys, options, next) {
  debug('BatchGet %j', keys);
  const deferred = Q.defer();
  if (!Array.isArray(keys)) {
    deferred.reject(new errors.ModelError('batchGet requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  const {schema} = NewModel.$__;

  const hashKeyName = schema.hashKey.name;
  keys = keys.map((key) => {
    if (!key[hashKeyName]) {
      const ret = {};
      ret[hashKeyName] = key;
      return ret;
    }
    return key;
  });

  if (schema.rangeKey && !keys.every((key) => validKeyValue(key[schema.rangeKey.name]))) {
    deferred.reject(new errors.ModelError(`Range key required: ${schema.rangeKey.name}`));
    return deferred.promise.nodeify(next);
  }

  const batchReq = {
    'RequestItems': {}
  };

  const getReq: any = {};
  batchReq.RequestItems[NewModel.$__.name] = getReq;

  getReq.Keys = await Promise.all(keys.map(async (key) => {
    const ret = {};
    ret[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);

    if (schema.rangeKey) {
      const rangeKeyName = schema.rangeKey.name;
      ret[rangeKeyName] = await schema.rangeKey.toDynamo(key[rangeKeyName], undefined, key);
    }
    return ret;
  }));

  if (options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if (options.consistent) {
    getReq.ConsistentRead = true;
  }

  const newModel$ = NewModel.$__;

  function batchGet () {
    debug('batchGetItem', batchReq);
    newModel$.base.ddb().batchGetItem(batchReq, async (err, data) => {
      if (err) {
        debug('Error returned by batchGetItem', err);
        return deferred.reject(err);
      }
      debug('batchGetItem response', data);

      if (!Object.keys(data).length) {
        return deferred.resolve();
      }

      async function toModel (item) {
        const model = new NewModel();
        model.$__.isNew = false;
        await schema.parseDynamo(model, item);

        debug('batchGet parsed model', model);

        return model;
      }

      const models: any = data.Responses[newModel$.name] ? (await Promise.all(data.Responses[newModel$.name].map(toModel))).filter((item) => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date())) : [];
      if (data.UnprocessedKeys[newModel$.name]) {
        // convert unprocessed keys back to dynamoose format
        models.unprocessed = await Promise.all(data.UnprocessedKeys[newModel$.name].Keys.map(async (key) => {
          const ret = {};
          ret[hashKeyName] = await schema.hashKey.parseDynamo(key[hashKeyName]);

          if (schema.rangeKey) {
            const rangeKeyName = schema.rangeKey.name;
            ret[rangeKeyName] = await schema.rangeKey.parseDynamo(key[rangeKeyName]);
          }
          return ret;
        }));
      }
      deferred.resolve(models);
    });
  }


  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchGet).catch(deferred.reject);
  } else {
    batchGet();
  }
  return deferred.promise.nodeify(next);
};

Model.batchPut = async function (NewModel, items, options, next) {
  debug('BatchPut %j', items);
  const deferred = Q.defer();

  if (!Array.isArray(items)) {
    deferred.reject(new errors.ModelError('batchPut requires items to be an array'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  const {schema} = NewModel.$__;
  const newModel$ = NewModel.$__;

  const toDynamoOptions = {
    'updateTimestamps': options.updateTimestamps || false,
    'updateExpires': options.updateExpires || false
  };

  const batchRequests = await toBatchChunks(newModel$.name, items, MAX_BATCH_WRITE_SIZE, async (item) => ({
    'PutRequest': {
      'Item': await schema.toDynamo(item, toDynamoOptions)
    }
  }));

  const batchPut = function () {
    batchWriteItems(NewModel, batchRequests).then((result) => {
      deferred.resolve(result);
    }).fail((err) => {
      deferred.reject(err);
    });
  };

  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchPut).catch(deferred.reject);
  } else {
    batchPut();
  }
  return deferred.promise.nodeify(next);
};

Model.batchDelete = async function (NewModel, keys, options, next) {
  debug('BatchDel %j', keys);
  const deferred = Q.defer();

  if (!Array.isArray(keys)) {
    deferred.reject(new errors.ModelError('batchDelete requires keys to be an array'));
    return deferred.promise.nodeify(next);
  }

  options = options || {};
  if (typeof options === 'function') {
    next = options;
    options = {};
  }

  const {schema} = NewModel.$__;
  const newModel$ = NewModel.$__;
  const hashKeyName = schema.hashKey.name;

  const batchRequests = await toBatchChunks(newModel$.name, keys, MAX_BATCH_WRITE_SIZE, async (key) => {
    const key_element = {};
    key_element[hashKeyName] = await schema.hashKey.toDynamo(key[hashKeyName], undefined, key);

    if (schema.rangeKey) {
      key_element[schema.rangeKey.name] = await schema.rangeKey.toDynamo(key[schema.rangeKey.name], undefined, key);
    }

    return {
      'DeleteRequest': {
        'Key': key_element
      }
    };
  });

  const batchDelete = function () {
    batchWriteItems(NewModel, batchRequests).then((result) => {
      deferred.resolve(result);
    }).fail((err) => {
      deferred.reject(err);
    });
  };

  if (newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(batchDelete).catch(deferred.reject);
  } else {
    batchDelete();
  }
  return deferred.promise.nodeify(next);
};

export default Model;
