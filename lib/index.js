'use strict';

var Schema = require('./Schema');
var Model = require('./Model');

var debug = require('debug')('dynamoose');

function Dynamoose () {
  this.models = {};

  this.defaults = {
    create: true,
    waitForActive: true, // Wait for table to be created
    waitForActiveTimeout: 180000, // 3 minutes
    prefix: ''
  }; // defaults
}

Dynamoose.prototype.model = function(name, schema, options) {
  options = options || {};

  for(var key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  name = options.prefix + name;

  debug('Looking up model %s', name);

  if(this.models[name]) {
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema, options);
  }

  var model = Model.compile(name, schema, options, this);
  this.models[name] = model;
  return model;
};

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */

Dynamoose.prototype.VirtualType = require('./VirtualType');

Dynamoose.prototype.AWS = require('aws-sdk');

Dynamoose.prototype.local = function (url) {
  this.endpointURL = url || 'http://localhost:8000';
  debug('Setting DynamoDB to local (%s)', this.endpointURL);
};

/**
 * Document client for executing nested scans
 */
Dynamoose.prototype.documentClient = function() {
  if (this.dynamoDocumentClient) {
    return this.dynamoDocumentClient;
  }
  if (this.endpointURL) {
    debug('Setting dynamodb document client to %s', this.endpointURL);
    this.AWS.config.update({ endpoint: this.endpointURL });
  } else {
    debug('Getting default dynamodb document client');
  }
  this.dynamoDocumentClient = new this.AWS.DynamoDB.DocumentClient();
  return this.dynamoDocumentClient;
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

Dynamoose.prototype.setDefaults = function (options) {

  for(var key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  this.defaults = options;
};

Dynamoose.prototype.Schema = Schema;
Dynamoose.prototype.Table = require('./Table');
Dynamoose.prototype.Dynamoose = Dynamoose;

module.exports = new Dynamoose();
