import util from 'util';

function ErrorType (defaultMessage: string , errorName: string) {
  function newError (message: string) {
    Error.call(this); // super constructor
    Error.captureStackTrace(this, this.constructor); // super helper method to include stack trace in error object

    this.name = errorName; // set our function’s name as error name.
    this.message = message || defaultMessage;
  }
  util.inherits(newError, Error);
  return newError;
}

interface IErrors {
  'SchemaError': any;
  'ModelError': any;
  'QueryError': any;
  'ScanError': any;
  'TransactionError': any;
  'ValidationError': any;
  'ParseError': any;
}

export const Errors: IErrors = {
  'SchemaError': ErrorType('Error with schema', 'SchemaError'),
  'ModelError': ErrorType('Error with model', 'ModelError'),
  'QueryError': ErrorType('Error with query', 'QueryError'),
  'ScanError': ErrorType('Error with scan', 'ScanError'),
  'TransactionError': ErrorType('Error with transaction', 'TransactionError'),
  'ValidationError': ErrorType('Validation error', 'ValidationError'),
  'ParseError': ErrorType('Parse error', 'ParseError')
};

export default Errors;
