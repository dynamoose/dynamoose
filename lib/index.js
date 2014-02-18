'use strict';

var Schema = require('./Schema');
var Model = require('./Model');

var debug = require('debug')('dynamoose');

function Dynamoose () {
  this.models = {};
}

Dynamoose.prototype.model = function(name, schema, options) {
  debug('Looking up model %s', name);
  if(this.models[name]) {
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema);
  }
  if(!options) {
    options = {};
  }

  var model = Model.compile(name, schema, options, this);
  this.models[name] = model;
  return model;
};

Dynamoose.prototype.AWS = require('aws-sdk');

Dynamoose.prototype.local = function (url) {
  this.endpointURL = url || 'http://localhost:8000';
};

Dynamoose.prototype.ddb = function () {
  if(this.dynamoDB) {
    return this.dynamoDB;
  }
  if(this.endpointURL) {
    this.dynamoDB = new this.AWS.DynamoDB({ endpoint: new this.AWS.Endpoint(this.endpointURL) });
  } else {
    this.dynamoDB = new this.AWS.DynamoDB();
  }
  return this.dynamoDB;
};

Dynamoose.prototype.Schema = require('./Schema');
Dynamoose.prototype.Table = require('./Table');
Dynamoose.prototype.Dynamoose = Dynamoose;

module.exports = new Dynamoose();