'use strict';

var Schema = require('./Schema');
var Model = require('./Model');

var debug = require('debug')('dynamoose');

function Dynamoose () {
  this.models = {};

  this.defaults = {
    create: true,
    waitForActive: true // Wait for table to be created
  }; // defaults
}

Dynamoose.prototype.model = function(name, schema, options, next) {
  debug('Looking up model %s', name);
  if(typeof options === 'function') {
    next = options;
    options = {};
  }
  if(this.models[name]) {
    if(next) {
      next(null, this.models[name]);
    }
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema);
  }

  options = options || {};

  for(var key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  var model = Model.compile(name, schema, options, this, next);
  this.models[name] = model;
  return model;
};

Dynamoose.prototype.AWS = require('aws-sdk');

Dynamoose.prototype.local = function (url) {
  this.endpointURL = url || 'http://localhost:8000';
  debug('Setting DynamoDB to local (%s)', this.endpointURL);
};

Dynamoose.prototype.ddb = function () {
  if(this.dynamoDB) {
    return this.dynamoDB;
  }
  if(this.endpointURL) {
    debug('Setting DynamoDB to %s', this.endpointURL);
    this.dynamoDB = new this.AWS.DynamoDB({ endpoint: new this.AWS.Endpoint(this.endpointURL) });
  } else {
    debug('Getting default DynamoDB');
    this.dynamoDB = new this.AWS.DynamoDB();
  }
  return this.dynamoDB;
};

Dynamoose.prototype.defaults = function (options) {
  this.defaults = options;
};

Dynamoose.prototype.Schema = require('./Schema');
Dynamoose.prototype.Table = require('./Table');
Dynamoose.prototype.Dynamoose = Dynamoose;

module.exports = new Dynamoose();
