'use strict';

var Attribute = require('./Attribute');
var errors = require('./errors');

var debug = require('debug')('dynamoose:schema');



function Schema(obj, options) {
  debug('Creating Schema', obj);

  this.options = options || {};

  if(this.options.throughput) {
    var throughput = this.options.throughput;
    if(typeof throughput === 'number') {
      throughput = {read: throughput, write: throughput};
    }
    this.throughput = throughput;
  } else {
    this.throughput = {read: 1, write: 1};
  }

  if((!this.throughput.read || !this.throughput.write) &&
    this.throughput.read >= 1 && this.throughput.write >= 1) {
    throw new errors.SchemaError('Invalid throughput: '+ this.throughput);
  }


  this.attributes = {};
  this.indexes = {local: {}, global: {}};

  for(var name in obj) {
    this.attribute(name, obj[name]);
  }
}

Schema.prototype.attribute = function(name, obj) {
  debug('Adding Attribute to Schema (%s)', name, obj);
  if(this.attributes[name]) {
    throw new errors.SchemaError('Duplicate attribute: ' + name);
  }

  var type = obj;
  var options = {};
  if(typeof obj === 'object' && obj.type) {
    type = obj.type;
    options = obj;
  }

  var attr = new Attribute(this, name, type, options);

  if(options.hashKey && options.rangeKey) {
    throw new errors.SchemaError('Cannot be both hashKey and rangeKey: ' + name);
  }

  if(options.hashKey || (!this.hashKey && !options.rangeKey)) {
    this.hashKey = attr;
  }

  if(options.rangeKey) {
    this.rangeKey = attr;
  }

  if(attr.indexes) {
    for(var indexName in attr.indexes) {
      var index = attr.indexes[indexName];
      if(this.indexes.global[indexName] || this.indexes.local[indexName]) {
        throw new errors.SchemaError('Duplicate index name: ' + indexName);
      }
      if(index.global) {
        this.indexes.global[indexName] = attr;
      } else {
        this.indexes.local[indexName] = attr;
      }
    }
  }

  this.attributes[name] = attr;
};

Schema.prototype.toDynamo = function(model) {

  var dynamoObj = {};
  debug('toDynamo with schema attributes', this.attributes);
  for(var name in this.attributes) {
    var attr = this.attributes[name];
    attr.setDefault(model);
    var dynamoAttr = attr.toDynamo(model[name]);
    if(dynamoAttr) {
      dynamoObj[attr.name] = dynamoAttr;
    }
  }

  return dynamoObj;
};

Schema.prototype.parseDynamo = function(model, dynamoObj) {

  for(var attrName in this.attributes) {
    var attrVal = this.attributes[attrName].parseDynamo(dynamoObj[attrName]);
    if(attrVal !== undefined && attrVal !== null){
      model[attrName] = attrVal;
    }
  }

  return dynamoObj;

};

module.exports = Schema;
