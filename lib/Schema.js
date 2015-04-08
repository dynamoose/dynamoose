'use strict';

var Attribute = require('./Attribute');
var errors = require('./errors');
//var util = require('util');

var debug = require('debug')('set DEBUG=*');



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

  //console.log(obj);
  for(var name in obj) {

    //console.log('NAME: ' + name + '  OBJ: ' + obj);

    if(this.attributes[name]) {
      throw new errors.SchemaError('Duplicate attribute: ' + name);
    }

    debug('Adding Attribute to Schema (%s)', name, obj);
    this.attributes[name] = Attribute.create(this, name, obj[name]);
  }
}

/*Schema.prototype.attribute = function(name, obj) {
  debug('Adding Attribute to Schema (%s)', name, obj);

  this Attribute.create(name, obj);

};*/

Schema.prototype.toDynamo = function(model) {

  var dynamoObj = {};
  debug('toDynamo with schema attributes', this.attributes);
  for(var name in this.attributes) {
    var attr = this.attributes[name];
    attr.setDefault(model);
    var dynamoAttr = attr.toDynamo(model[name], undefined, model);
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
//console.log(dynamoObj);

  return dynamoObj;

};

module.exports = Schema;
