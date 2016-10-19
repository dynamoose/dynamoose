'use strict';

var util = require('util');

function SchemaError(message) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message || 'Error with schema';
}
util.inherits(SchemaError, Error);

function ModelError(message) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message || 'Error with model';
}
util.inherits(SchemaError, Error);


function QueryError(message) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message || 'Error with query';
}
util.inherits(QueryError, Error);


function ScanError(message) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message || 'Error with scan';
}
util.inherits(ScanError, Error);


function ValidationError(message) {
  Error.call(this); //super constructor
  Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

  this.name = this.constructor.name; //set our function’s name as error name.
  this.message = message || 'Validation error';
}
util.inherits(ValidationError, Error);

module.exports.SchemaError = SchemaError;
module.exports.ModelError = ModelError;
module.exports.QueryError = QueryError;
module.exports.ScanError = ScanError;
module.exports.ValidationError = ValidationError;