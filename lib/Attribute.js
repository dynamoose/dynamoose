'use strict';
var debug = require('debug')('dynamoose:attribute');

var util = require('util');

var errors = require('./errors');

function Attribute(schema, name, value) {
  this.options = {};

  debug('Creating attribute %s %o', name, value);
  if (value.type) {
    this.options = value;
  }

  this.schema = schema;

  this.name = name;

  this.setType(value);

  if (!schema.useDocumentTypes) {
    if (this.type.name === 'map') {
      debug('Overwriting attribute %s type to object', name);
      this.type = this.types.object;
    } else if (this.type.name === 'list') {
      debug('Overwriting attribute %s type to array', name);
      this.type = this.types.array;
    }
  }

  this.attributes = {};

  if (this.type.name === 'map') {

    if (value.type) {
      value = value.map;
    }
    for (var subattrName in value) {
      if (this.attributes[subattrName]) {
        throw new errors.SchemaError('Duplicate attribute: ' + subattrName + ' in ' + this.name);
      }

      this.attributes[subattrName] = module.exports.create(schema, subattrName, value[subattrName]);
    }

  }
  else if (this.type.name === 'list') {

    if (value.type) {
      value = value.list;
    }

    if (value === undefined && value[0] === undefined) {
      throw new errors.SchemaError('No object given for attribute:' + this.name);
    }

    if (value.length > 1) {
      throw new errors.SchemaError('Only one object can be defined as a list type in ' + this.name);
    }


    for (var i = 0; i < value.length; i++) {
      this.attributes[i] = module.exports.create(schema, 0, value[i]);
    }

  }

  if (this.options) {
    this.applyDefault(this.options.default);

    this.required = this.options.required;
    this.set = this.options.set;
    this.get = this.options.get;

    this.applyValidation(this.options.validate);

    this.applyIndexes(this.options.index);
  }
}


function datify(v) {
  if (!v.getTime) {
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

Attribute.prototype.setType = function (value) {
  if (!value) {
    throw new errors.SchemaError('Invalid attribute value: ' + value);
  }

  var type;
  var typeVal = value;
  if (value.type) {
    typeVal = value.type;
  }

  if (util.isArray(typeVal) && typeVal.length === 1 && typeof typeVal[0] === 'object') {
    type = 'List';
  } else if ((util.isArray(typeVal) && typeVal.length === 1) || typeof typeVal === 'function') {
    this.isSet = util.isArray(typeVal);
    var regexFuncName = /^Function ([^(]+)\(/i;
    var found = typeVal.toString().match(regexFuncName);
    type = found[1];
  } else if (typeof typeVal === 'object') {
    type = 'Map';
  } else if (typeof typeVal === 'string') {
    type = typeVal;
  }

  if (!type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

  type = type.toLowerCase();

  this.type = this.types[type];

  if (!this.type) {
    throw new errors.SchemaError('Invalid attribute type: ' + type);
  }

};

Attribute.prototype.applyDefault = function (dflt) {
  if (dflt === null || dflt === undefined) {
    delete this.default;
  } else if (typeof dflt === 'function') {
    this.default = dflt;
  } else {
    this.default = function () {
      return dflt;
    };
  }
};

Attribute.prototype.applyValidation = function (validator) {
  if (validator === null || validator === undefined) {
    delete this.validator;
  } else if (typeof validator === 'function') {
    this.validator = validator;
  } else if (validator.constructor.name === 'RegExp') {
    this.validator = function (val) {
      return validator.test(val);
    };
  } else {
    this.validator = function (val) {
      return validator === val;
    };
  }
};

Attribute.prototype.applyIndexes = function (indexes) {
  if (indexes === null || indexes === undefined) {
    delete this.indexes;
    return;
  }

  var attr = this;
  attr.indexes = {};

  function applyIndex(i) {
    if (typeof i !== 'object') {
      i = {};
    }

    var index = {};

    if (i.global) {
      index.global = true;

      if (i.rangeKey) {
        index.rangeKey = i.rangeKey;
      }

      if (i.throughput) {
        var throughput = i.throughput;
        if (typeof throughput === 'number') {
          throughput = {read: throughput, write: throughput};
        }
        index.throughput = throughput;
        if ((!index.throughput.read || !index.throughput.write) &&
          index.throughput.read >= 1 && index.throughput.write >= 1) {
          throw new errors.SchemaError('Invalid Index throughput: ' + index.throughput);
        }
      } else {
        index.throughput = attr.schema.throughput;
      }
    }

    if (i.name) {
      index.name = i.name;
    } else {
      index.name = attr.name + (i.global ? 'GlobalIndex' : 'LocalIndex');
    }

    if (i.project !== null && i.project !== undefined) {
      index.project = i.project;
    } else {
      index.project = true;
    }


    if (attr.indexes[index.name]) {
      throw new errors.SchemaError('Duplicate index names: ' + index.name);
    }
    attr.indexes[index.name] = index;
  }

  if (util.isArray(indexes)) {
    indexes.map(applyIndex);
  } else {
    applyIndex(indexes);
  }
};

Attribute.prototype.setDefault = function (model) {
  if (model === undefined || model === null) {
    return;
  }
  var val = model[this.name];
  if ((val === null || val === undefined || val === '') && this.default) {
    model[this.name] = this.default();
    debug('Defaulted %s to %s', this.name, model[this.name]);
  }
};

/* eslint complexity: ["error", 23] */
Attribute.prototype.toDynamo = function toDynamo(val, noSet, model) {

  if (val === null || val === undefined || val === '') {
    if (this.required) {
      throw new errors.ValidationError('Required value missing: ' + this.name);
    }
    return null;
  }

  if (!noSet && this.isSet) {
    if (!util.isArray(val)) {
      throw new errors.ValidationError('Values must be array: ' + this.name);
    }
    if (val.length === 0) {
      return null;
    }
  }

  if (this.validator && !this.validator(val)) {
    throw new errors.ValidationError('Validation failed: ' + this.name);
  }

  if (this.set) {
    val = this.set(val);
  }


  var type = this.type;

  var isSet = this.isSet && !noSet;
  var dynamoObj = {};

  if (isSet) {
    dynamoObj[type.dynamo + 'S'] = val.map(function (v) {
      if (type.dynamofy) {
        return type.dynamofy(v);
      }
      v = v.toString();
      if (type.dynamo === 'S') {
        if (this.options.trim) {
          v = v.trim();
        }
        if (this.options.lowercase) {
          v = v.toLowerCase();
        }
        if (this.options.uppercase) {
          v = v.toUpperCase();
        }
      }

      return v;
    }.bind(this));
  } else if (type.name === 'map') {

    var dynamoMapObj = {};
    for (var name in this.attributes) {
      var attr = this.attributes[name];
      attr.setDefault(model);
      var dynamoAttr = attr.toDynamo(val[name], undefined, model);
      if (dynamoAttr) {
        dynamoMapObj[attr.name] = dynamoAttr;
      }
    }
    dynamoObj.M = dynamoMapObj;

  } else if (type.name === 'list') {

    if (!util.isArray(val)) {
      throw new errors.ValidationError('Values must be array in a `list`: ' + this.name);
    }

    var dynamoList = [];

    for (var i = 0; i < val.length; i++) {
      var item = val[i];

      // TODO currently only supports one attribute type
      var objAttr = this.attributes[0];
      if (objAttr) {
        objAttr.setDefault(model);
        dynamoList.push(objAttr.toDynamo(item, undefined, model));
      }
    }
    dynamoObj.L = dynamoList;

  } else {

    if (type.dynamofy) {
      val = type.dynamofy(val);
    }

    val = val.toString();
    if (type.dynamo === 'S') {
      if (this.options.trim) {
        val = val.trim();
      }
      if (this.options.lowercase) {
        val = val.toLowerCase();
      }
      if (this.options.uppercase) {
        val = val.toUpperCase();
      }
    }
    dynamoObj[type.dynamo] = val;
  }

  debug('toDynamo %j', dynamoObj);

  return dynamoObj;
};


Attribute.prototype.parseDynamo = function (json) {

  function dedynamofy(type, isSet, json, transform, attr) {
    if (!json) {
      return;
    }
    if (isSet) {
      var set = json[type + 'S'];
      return set.map(function (v) {
        if (transform) {
          return transform(v);
        }
        return v;
      });
    }
    var val = json[type];
    if (transform) {
      return transform((val !== undefined) ? val : json, attr);
    }
    return val;
  }

  function mapify(v, attr) {
    if (!v) {
      return;
    }
    var val = {};

    for (var attrName in attr.attributes) {
      var attrVal = attr.attributes[attrName].parseDynamo(v[attrName]);
      if (attrVal !== undefined && attrVal !== null) {
        val[attrName] = attrVal;
      }
    }
    return val;
  }

  function listify(v, attr) {
    if (!v) {
      return;
    }
    var val = [];
    debug('parsing list');

    if (util.isArray(v)) {

      for (var i = 0; i < v.length; i++) {
        // TODO assume only one attribute type allowed for a list
        var attrType = attr.attributes[0];
        var attrVal = attrType.parseDynamo(v[i]);
        if (attrVal !== undefined && attrVal !== null) {
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
    return new Buffer(v);
  }

  function stringify(v) {
    if (typeof v !== 'string') {
      debug('******', v);
      return JSON.stringify(v);
    }
    return v;
  }

  var val;

  switch (this.type.name) {
    case 'string':
      val = dedynamofy('S', this.isSet, json, stringify);
      break;
    case 'number':
      val = dedynamofy('N', this.isSet, json, JSON.parse);
      break;
    case 'boolean':
      val = dedynamofy('S', this.isSet, json, JSON.parse);
      break;
    case 'date':
      val = dedynamofy('N', this.isSet, json, datify);
      break;
    case 'object':
      val = dedynamofy('S', this.isSet, json, JSON.parse);
      break;
    case 'array':
      val = dedynamofy('S', this.isSet, json, JSON.parse);
      break;
    case 'map':
      val = dedynamofy('M', this.isSet, json, mapify, this);
      break;
    case 'list':
      val = dedynamofy('L', this.isSet, json, listify, this);
      break;
    case 'buffer':
      val = dedynamofy('B', this.isSet, json, bufferify);
      break;
    default:
      throw new errors.SchemaError('Invalid attribute type: ' + this.type);
  }

  if (this.get) {
    val = this.get(val);
  }

  debug('parseDynamo: %s : "%s" : %j', this.name, this.type.name, val);

  return val;
};


module.exports.create = function (schema, name, obj) {


  var value = obj;
  var options = {};
  if (typeof obj === 'object' && obj.type) {
    options = obj;
  }

  var attr = new Attribute(schema, name, value);

  if (options.hashKey && options.rangeKey) {
    throw new errors.SchemaError('Cannot be both hashKey and rangeKey: ' + name);
  }

  if (options.hashKey || (!schema.hashKey && !options.rangeKey)) {
    schema.hashKey = attr;
  }

  if (options.rangeKey) {
    schema.rangeKey = attr;
  }

  // check for global attributes in the tree..
  if (attr.indexes) {
    for (var indexName in attr.indexes) {
      var index = attr.indexes[indexName];
      if (schema.indexes.global[indexName] || schema.indexes.local[indexName]) {
        throw new errors.SchemaError('Duplicate index name: ' + indexName);
      }
      if (index.global) {
        schema.indexes.global[indexName] = attr;
      } else {
        schema.indexes.local[indexName] = attr;
      }
    }
  }

  return attr;
};


//module.exports = Attribute;