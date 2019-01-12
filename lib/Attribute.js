'use strict';
const debug = require('debug')('dynamoose:attribute');
const util = require('util');
const errors = require('./errors');

function Attribute(schema, name, value) {
  this.options = {};

  debug('Creating attribute %s %o', name, value);
  if (value.type){
    this.options = value;
  }

  this.schema = schema;

  this.name = name;
  if (this.schema.options.saveUnknown) {
    this.setTypeFromRawValue(value);
  } else {
    this.setType(value);
  }

  if(!schema.useDocumentTypes) {
    if(this.type.name === 'map') {
      debug('Overwriting attribute %s type to object', name);
      this.type = this.types.object;
    } else if (this.type.name === 'list') {
      debug('Overwriting attribute %s type to array', name);
      this.type = this.types.array;
    }
  }

  if (schema.useNativeBooleans) {
    if(this.type.name === 'boolean') {
      debug('Overwriting attribute %s type to be a native boolean', name);
      this.type = this.types.nativeBoolean;
    }
  }

  this.attributes = {};

  if (this.type.name === 'map'){

    if(value.type) {
      if (!value.map) {
        throw new errors.SchemaError(`No map schema given for attribute: ${this.name}`);
      }
      value = value.map;
    }
    for (const subattrName in value){
      if(this.attributes[subattrName]) {
        throw new errors.SchemaError(`Duplicate attribute: ${subattrName} in ${this.name}`);
      }

      this.attributes[subattrName] = module.exports.create(schema, subattrName, value[subattrName]);
    }

  }
  else if (this.type.name === 'list'){

    if(value.type) {
      if (!value.list || !value.list[0]){
        throw new errors.SchemaError(`No list schema given for attribute: ${this.name}`);
      }
      value = value.list;
    }

    // stang: Don't know what this guard is for - had to remove because when parsing unknown attributes, this is legal?
    // if (value.length > 1){
    //   throw new errors.SchemaError('Only one object can be defined as a list type in ' + this.name );
    // }


    for (let i = 0; i < value.length; i++) {
      this.attributes[i] = module.exports.create(schema, 0, value[i]);
    }

  }

  if (this.options){
    this.applyDefault(this.options.default);

    this.required = this.options.required;
    if (this.options.set) {
      if (typeof this.options.set === "function") {
        this.set = this.options.set;
      } else {
        if (this.options.set.isAsync) {
          this.set = function (val) {
            return new Promise(resolve => this.options.set.set(val, result => resolve(result)));
          };
        } else {
          this.set = this.options.set.set;
        }
      }
    }
    if (this.options.fromDynamo) {
      if (typeof this.options.fromDynamo === "function") {
        this.parseDynamoCustom = this.options.fromDynamo;
      } else {
        if (this.options.fromDynamo.isAsync) {
          this.parseDynamoCustom = function (val) {
            return new Promise(resolve => this.options.fromDynamo.fromDynamo(val, result => resolve(result)));
          };
        } else {
          this.parseDynamoCustom = this.options.fromDynamo.fromDynamo;
        }
      }
    }
    if (this.options.toDynamo) {
      if (typeof this.options.toDynamo === "function") {
        this.toDynamoCustom = this.options.toDynamo;
      } else {
        if (this.options.toDynamo.isAsync) {
          this.toDynamoCustom = function (val) {
            return new Promise(resolve => this.options.toDynamo.toDynamo(val, result => resolve(result)));
          };
        } else {
          this.toDynamoCustom = this.options.toDynamo.toDynamo;
        }
      }
    }
    if (this.options.get) {
      if (typeof this.options.get === "function") {
        this.get = this.options.get;
      } else {
        if (this.options.get.isAsync) {
          this.get = function (val) {
            return new Promise(resolve => this.options.get.get(val, result => resolve(result)));
          };
        } else {
          this.get = this.options.get.get;
        }
      }
    }

    this.applyValidation(this.options.validate);

    this.applyIndexes(this.options.index);
  }
}


function datify(v) {
  if(!v.getTime) {
    v = new Date(v);
  }
  return JSON.stringify(v.getTime());
}

Attribute.prototype.types = {
  string: {
    name: 'string',
    dynamo: 'S'
  },
  number: {
    name: 'number',
    dynamo: 'N'
  },
  boolean: {
    name: 'boolean',
    dynamo: 'S',
    dynamofy: JSON.stringify
  },
  nativeBoolean: {
    name: 'boolean',
    dynamo: 'BOOL'
  },
  date: {
    name: 'date',
    dynamo: 'N',
    dynamofy: datify
  },
  object: {
    name: 'object',
    dynamo: 'S',
    dynamofy: JSON.stringify
  },
  array: {
    name: 'array',
    dynamo: 'S',
    dynamofy: JSON.stringify
  },
  map: {
    name: 'map',
    dynamo: 'M',
    dynamofy: JSON.stringify
  },
  list: {
    name: 'list',
    dynamo: 'L',
    dynamofy: JSON.stringify
  },
  buffer: {
    name: 'buffer',
    dynamo: 'B'
  }
};

Attribute.prototype.setTypeFromRawValue = function(value) {
  //no type defined - assume this is not a type definition and we must grab type directly from value
  let type;
  let typeVal = value;
  if (value.type){
    typeVal = value.type;
  }

  if (Array.isArray(typeVal) || typeVal === 'list'){
    type = 'List';
  } else if ( (Array.isArray(typeVal) && typeVal.length === 1) || typeof typeVal === 'function') {
    this.isSet = Array.isArray(typeVal);
    let regexFuncName = /^Function ([^(]+)\(/i;
    let found = typeVal.toString().match(regexFuncName);
    type = found[1];
    if (type === 'Object') {
      type = 'Map';
    }
  } else if (typeof typeVal === 'object' || typeVal === 'map'){
    type = 'Map';
  } else {
    type = typeof typeVal;
  }

  if(!type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

  type = type.toLowerCase();

  this.type = this.types[type];

  if(!this.type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

};

Attribute.prototype.setType = function(value) {
  if(!value) {
    throw new errors.SchemaError('Invalid attribute value: ' + value);
  }

  let type;
  let typeVal = value;
  if (value.type){
    typeVal = value.type;
  }

  if (Array.isArray(typeVal) && typeVal.length === 1 && typeof typeVal[0] === 'object'){
    type = 'List';
  } else if ( (Array.isArray(typeVal) && typeVal.length === 1) || typeof typeVal === 'function') {
    this.isSet = Array.isArray(typeVal);
    let regexFuncName = /^Function ([^(]+)\(/i;
    let found = typeVal.toString().match(regexFuncName);
    type = found[1];
  } else if (typeof typeVal === 'object'){
    type = 'Map';
  } else if (typeof typeVal === 'string') {
    type = typeVal;
  }

  if(!type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

  type = type.toLowerCase();

  this.type = this.types[type];

  if(!this.type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

};

Attribute.prototype.applyDefault = function(dflt) {
  if(dflt === null || dflt === undefined){
    delete this.default;
  } else if(typeof dflt === 'function') {
    this.default = dflt;
  } else {
    this.default = function() {
      return dflt;
    };
  }
};

Attribute.prototype.applyValidation = function(validator) {
  if(validator === null || validator === undefined) {
    delete this.validator;
  } else if(typeof validator === 'function') {
    this.validator = validator;
  } else if(validator.constructor.name === 'RegExp') {
    this.validator = function (val) {
      return validator.test(val);
    };
  } else if (typeof validator === 'object') {
    let method = validator.validator || validator.validate;
    if (validator.isAsync) {
      this.validator = function (val, model) {
        return new Promise((resolve, reject) => {
          const argsArray = [val, model];
          if (validator.disableModelParameter) {
            argsArray.pop();
          }
          method(...argsArray, (success) => {
            resolve(success);
          });
        });
      };
    } else {
      this.validator = method;
    }
  } else {
    this.validator = function (val) {
      return validator === val;
    };
  }
};

Attribute.prototype.applyIndexes = function(indexes) {
  if(indexes === null || indexes === undefined) {
    delete this.indexes;
    return;
  }

  let attr = this;
  attr.indexes = {};

  function applyIndex(i) {
    if(typeof i !== 'object') {
      i = {};
    }

    let index = {};

    if(i.global) {
      index.global = true;

      if(i.rangeKey) {
        index.rangeKey = i.rangeKey;
      }

      if(i.throughput) {
        let throughput = i.throughput;
        if(typeof throughput === 'number') {
          throughput = {read: throughput, write: throughput};
        }
        index.throughput = throughput;
        if((!index.throughput.read || !index.throughput.write) && index.throughput.read >= 1 && index.throughput.write >= 1) {
          throw new errors.SchemaError('Invalid Index throughput: '+ index.throughput);
        }
      } else {
        index.throughput = attr.schema.throughput;
      }
    }

    if(i.name) {
      index.name = i.name;
    } else {
      index.name = attr.name + (i.global ? 'GlobalIndex' : 'LocalIndex');
    }

    if(i.project !== null && i.project !== undefined) {
      index.project = i.project;
    } else {
      index.project = true;
    }


    if(attr.indexes[index.name]) {
      throw new errors.SchemaError('Duplicate index names: ' + index.name);
    }
    attr.indexes[index.name] = index;
  }

  if(Array.isArray(indexes)) {
    indexes.map(applyIndex);
  } else {
    applyIndex(indexes);
  }
};

Attribute.prototype.setDefault = async function(model) {
  if (model === undefined || model === null){ return;}
  let val = model[this.name];
  if((val === null || val === undefined || val === '' || this.options.forceDefault) && this.default) {
    model[this.name] = await this.default(model);
    debug('Defaulted %s to %s', this.name,  model[this.name]);
  }
};

Attribute.prototype.toDynamo = async function(val, noSet, model, options) {
  if (this.toDynamoCustom) {
    return this.toDynamoCustom(val, noSet, model, options);
  }

  if(val === null || val === undefined || val === '') {
    if(this.required) {
      throw new errors.ValidationError('Required value missing: ' + this.name);
    }
    return null;
  }

  if(!noSet && this.isSet){
    if(!Array.isArray(val)) {
      throw new errors.ValidationError('Values must be array: ' + this.name);
    }
    if(val.length === 0) {
      return null;
    }
  }

  if(this.validator && !(await this.validator(val, model))) {
    throw new errors.ValidationError('Validation failed: ' + this.name);
  }


  // Check to see if attribute is a timestamp
  let runSet = true;
  let isExpires = false;
  let isTimestamp = false;

  if (model && model.$__ && model.$__.schema && model.$__.schema.timestamps && (model.$__.schema.timestamps.createdAt === this.name || model.$__.schema.timestamps.updatedAt === this.name)) {
    isTimestamp = true;
  }

  if (model && model.$__ && model.$__.schema && model.$__.schema.expires && (model.$__.schema.expires.attribute === this.name)) {
    isExpires = true;
  }

  if (isTimestamp && options.updateTimestamps === false) {
    runSet = false;
  }

  if (isExpires && options.updateExpires === true) {
    val = await this.default();
    runSet = true;
  }

  if (this.set && runSet) {
    val = await this.set(val);
  }


  let type = this.type;

  const isSet = this.isSet && !noSet;
  let dynamoObj = {};

  if(isSet) {
    dynamoObj[type.dynamo + 'S'] = val.map(function(v) {
      if(type.dynamofy) {
        return type.dynamofy(v);
      }
      v = v.toString();
      if(type.dynamo === 'S') {
        if(this.options.trim) {
          v = v.trim();
        }
        if(this.options.lowercase) {
          v = v.toLowerCase();
        }
        if(this.options.uppercase) {
          v = v.toUpperCase();
        }
      }

      return v;
    }.bind(this));
  } else if (type.name === 'map') {

    let dynamoMapObj = {};
    for(const name in this.attributes) {
      const attr = this.attributes[name];
      await attr.setDefault(model);
      const dynamoAttr = await attr.toDynamo(val[name], undefined, model);
      if(dynamoAttr) {
        dynamoMapObj[attr.name] = dynamoAttr;
      }
    }
    dynamoObj.M = dynamoMapObj;

  } else if (type.name === 'list') {

    if(!Array.isArray(val)) {
      throw new errors.ValidationError('Values must be array in a `list`: ' + this.name);
    }

    let dynamoList = [];

    for (let i = 0; i < val.length; i++) {
      const item = val[i];

      // TODO currently only supports one attribute type
      const objAttr = this.attributes[0];
      if (objAttr){
        await objAttr.setDefault(model);
        dynamoList.push(await objAttr.toDynamo(item, undefined, model));
      }
    }
    dynamoObj.L = dynamoList;

  } else {

    if(type.dynamofy) {
      val = type.dynamofy(val);
    }

    if(type.dynamo !== 'BOOL' && (type.dynamo !== 'B' || !(val instanceof Buffer))) {
      val = val.toString();
    }

    if(type.dynamo === 'S') {
      if (this.options.enum) {
        if (this.options.enum.indexOf(val) === -1) {
          throw new errors.ValidationError('Value must be one of : ' + JSON.stringify(this.options.enum));
        }
      }
      if(this.options.trim) {
        val = val.trim();
      }
      if(this.options.lowercase) {
        val = val.toLowerCase();
      }
      if(this.options.uppercase) {
        val = val.toUpperCase();
      }
    }
    dynamoObj[type.dynamo] = val;
  }

  debug('toDynamo %j', dynamoObj);

  return dynamoObj;
};


Attribute.prototype.parseDynamo = async function(json) {

  if (this.parseDynamoCustom) {
    return this.parseDynamoCustom(json);
  }

  async function dedynamofy(type, isSet, json, transform, attr) {
    const errorHandlingTransform = transform && async function (v) {
      try {
        return await transform(v, attr);
      } catch (e) {
        e.message += `\nAttribute "${attr.name}" of type "${type}" has an invalid value of ${JSON.stringify(json)}`
        throw new errors.ParseError(e.message);
      }
    }

    if(!json){
      return;
    }
    if(isSet) {
      const set = json[type + 'S'];
      return (await Promise.all(set.map(async function (v) {
        if(errorHandlingTransform) {
          return await errorHandlingTransform(v);
        }
        return v;
      })));
    }
    const val = json[type];
    if(errorHandlingTransform) {
      return (await errorHandlingTransform((val !== undefined) ? val : json));
    }
    return val;
  }

  async function mapify(v, attr){
    if(!v){ return; }
    let val = {};

    const { attributes, schema } = attr;
    // loop over all the properties of the input
    for(const [name, value] of Object.entries(v)) {
      let subAttr = attributes[name];
      // if saveUnknown is activated the input has an unknown attribute, let's create one on the fly.
      if (!subAttr && schema.options.errorUnknown) {
        throw new errors.ParseError(`Unknown nested attribute ${name} with value: ${JSON.stringify(value)}`);
      }
      if (!subAttr && (schema.options.saveUnknown || Array.isArray(schema.options.saveUnknown) && schema.options.saveUnknown.indexOf(name) >= 0)) {
        subAttr = createUnknownAttributeFromDynamo(schema, name, value);
        attr.attributes[name] = subAttr;
      }
      if (subAttr) {
        const attrVal = await subAttr.parseDynamo(value);
        if(attrVal !== undefined && attrVal !== null){
          val[name] = attrVal;
        }
      }
    }
    return val;
  }

  async function listify(v, attr){
    if(!v){ return; }
    let val = [];
    debug('parsing list');

    if (Array.isArray(v)){

      for (let i = 0; i < v.length ; i++){
        // TODO assume only one attribute type allowed for a list
        const attrType = attr.attributes[0];
        const attrVal = await attrType.parseDynamo(v[i]);
        if(attrVal !== undefined && attrVal !== null){
          val.push(attrVal);
        }
      }
    }
    return val;
  }

  function datify(v) {
    debug('parsing date from %s', v);
    return new Date(parseInt(v, 10));
  }
  function bufferify(v) {
    return Buffer.from(v);
  }
  function stringify(v){
    if (typeof v !== 'string'){
      debug('******', v);
      return JSON.stringify(v);
    }
    return v;
  }


  let val;

  switch(this.type.name) {
    case 'string':
    val = await dedynamofy('S', this.isSet, json, stringify, this);
    break;
    case 'number':
    val = await dedynamofy('N', this.isSet, json, JSON.parse, this);
    break;
    case 'boolean':
    // 'S' is backwards compatible however 'BOOL' is a new valid argument
    val = await dedynamofy(this.type.dynamo, this.isSet, json, JSON.parse, this);
    break;
    case 'date':
    val = await dedynamofy('N', this.isSet, json, datify, this);
    break;
    case 'object':
    val = await dedynamofy('S', this.isSet, json, JSON.parse, this);
    break;
    case 'array':
    val = await dedynamofy('S', this.isSet, json, JSON.parse, this);
    break;
    case 'map':
    val = await dedynamofy('M', this.isSet, json, mapify, this);
    break;
    case 'list':
    val = await dedynamofy('L', this.isSet, json, listify, this);
    break;
    case 'buffer':
    val = await dedynamofy('B', this.isSet, json, bufferify, this);
    break;
    default:
    throw new errors.SchemaError('Invalid attribute type: ' + this.type);
  }



  if(this.get) {
    val = await this.get(val);
  }

  debug('parseDynamo: %s : "%s" : %j', this.name, this.type.name, val);

  return val;
};


/*
* Converts DynamoDB document types (Map and List) to dynamoose
* attribute definition map and ist types
*
* For example, DynamoDB value:
* {
*   M: {
*     subAttr1: { S: '' },
*     subAttr2: { N: '' },
*   }
* }
*
* to
* {
*   type: 'map',
*   map: {
*     subAttr1: { type: String },
*     subAttr1: { type: Number },
*   },
* }
*/
function createAttrDefFromDynamo(dynamoAttribute) {
  let dynamoType;
  let attrDef = {
    type: module.exports.lookupType(dynamoAttribute),
  };
  if (attrDef.type === Object) {
    attrDef.type = 'map';
    for (dynamoType in dynamoAttribute) {
      attrDef.map = {};
      for (const subAttrName in dynamoAttribute[dynamoType]) {
        attrDef.map[subAttrName] = createAttrDefFromDynamo(dynamoAttribute[dynamoType][subAttrName]);
      }
    }
  } else if (attrDef.type === Array) {
    attrDef.type = 'list';
    for (dynamoType in dynamoAttribute) {
      attrDef.list = dynamoAttribute[dynamoType].map(createAttrDefFromDynamo);
    }
  }
  return attrDef;
}


const createUnknownAttributeFromDynamo = module.exports.createUnknownAttributeFromDynamo = function(schema, name, dynamoAttribute) {

  debug('createUnknownAttributeFromDynamo: %j : "%s" : %j', schema, name, dynamoAttribute);
  const attrDef = createAttrDefFromDynamo(dynamoAttribute);
  const attr = new Attribute(schema, name, attrDef);
  return attr;
};


module.exports.create = function(schema, name, obj) {

  debug('create: %j : "%s" : %j', schema, name, obj);


  const value = obj;
  let options = {};
  if(typeof obj === 'object' && obj.type) {
    options = obj;
  }

  const attr = new Attribute(schema, name, value);

  if(options.hashKey && options.rangeKey) {
    throw new errors.SchemaError('Cannot be both hashKey and rangeKey: ' + name);
  }

  if(options.hashKey || (!schema.hashKey && !options.rangeKey)) {
    schema.hashKey = attr;
  }

  if(options.rangeKey) {
    schema.rangeKey = attr;
  }

  // check for global attributes in the tree..
  if(attr.indexes) {
    for(const indexName in attr.indexes) {
      const index = attr.indexes[indexName];
      if(schema.indexes.global[indexName] || schema.indexes.local[indexName]) {
        throw new errors.SchemaError('Duplicate index name: ' + indexName);
      }
      if(index.global) {
        schema.indexes.global[indexName] = attr;
      } else {
        schema.indexes.local[indexName] = attr;
      }
    }
  }

  return attr;
};


module.exports.lookupType = function (dynamoObj) {
  if(dynamoObj.S !== null && dynamoObj.S !== undefined) {
    // try {
    //   JSON.parse(dynamoObj.S);
    //   return Object;
    // } catch (err) {
      return String;
    // }
  }
  if(dynamoObj.L !== null && dynamoObj.L !== undefined) {
    return Array;
  }
  if(dynamoObj.M !== null && dynamoObj.M !== undefined) {
    return Object;
  }
  if(dynamoObj.N !== null && dynamoObj.N !== undefined) {
    return Number;
  }
  if(dynamoObj.BOOL !== null && dynamoObj.BOOL !== undefined) {
    return Boolean;
  }
  if(dynamoObj.B !== null && dynamoObj.B !== undefined) {
    return Buffer;
  }
  if(dynamoObj.NS !== null && dynamoObj.NS !== undefined) {
    return [Number];
  }

};
