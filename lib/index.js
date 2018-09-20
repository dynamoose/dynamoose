'use strict';

const Schema = require('./Schema');
const Model = require('./Model');
const https = require('https');
const AWS = require('aws-sdk');
const debug = require('debug')('dynamoose');

function createLocalDb(endpointURL) {
  return new AWS.DynamoDB({
    endpoint: new AWS.Endpoint(endpointURL)
  });
}

function Dynamoose () {
  this.models = {};

  this.defaults = {
    create: true,
    waitForActive: true, // Wait for table to be created
    waitForActiveTimeout: 180000, // 3 minutes
    prefix: '', // prefix_Table
    suffix: '' // Table_suffix
  }; // defaults
}

Dynamoose.prototype.model = function(name, schema, options) {
  options = options || {};

  for(const key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  name = options.prefix + name + options.suffix;

  debug('Looking up model %s', name);

  if(this.models[name]) {
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema, options);
  }

  const model = Model.compile(name, schema, options, this);
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

Dynamoose.prototype.AWS = AWS;

Dynamoose.prototype.local = function (url) {
  this.endpointURL = url || 'http://localhost:8000';
  this.dynamoDB = createLocalDb(this.endpointURL);
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

Dynamoose.prototype.setDocumentClient = function(documentClient) {
  debug('Setting dynamodb document client');
  this.dynamoDocumentClient = documentClient;
};

Dynamoose.prototype.ddb = function () {
  if(this.dynamoDB) {
    return this.dynamoDB;
  }

  if(this.endpointURL) {
    debug('Setting DynamoDB to %s', this.endpointURL);
    this.dynamoDB = createLocalDb(this.endpointURL);
  } else {
    debug('Getting default DynamoDB');
    this.dynamoDB = new this.AWS.DynamoDB({
      httpOptions: {
        agent: new https.Agent({
          rejectUnauthorized: true,
          keepAlive: true
        })
      }
    });
  }
  return this.dynamoDB;
};

Dynamoose.prototype.setDefaults = function (options) {

  for(const key in this.defaults) {
    options[key] = (typeof options[key] === 'undefined') ? this.defaults[key] : options[key];
  }

  this.defaults = options;
};

Dynamoose.prototype.Schema = Schema;
Dynamoose.prototype.Table = require('./Table');
Dynamoose.prototype.Dynamoose = Dynamoose;

module.exports = new Dynamoose();
