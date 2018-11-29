'use strict';
const util = require('util');

function ErrorType(defaultMessage, errorName) {
  function newError(message) {
    Error.call(this); //super constructor
    Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object

    this.name = errorName; //set our function’s name as error name.
    this.message = message || defaultMessage;
  }
  util.inherits(newError, Error);
  return newError;
}

module.exports = {
  SchemaError: new ErrorType('Error with schema', 'SchemaError'),
  ModelError: new ErrorType('Error with model', 'ModelError'),
  QueryError: new ErrorType('Error with query', 'QueryError'),
  ScanError: new ErrorType('Error with scan', 'ScanError'),
  TransactionError: new ErrorType('Error with transaction', 'TransactionError'),
  ValidationError: new ErrorType('Validation error', 'ValidationError'),
  ParseError: new ErrorType('Parse error', 'ParseError')
};
