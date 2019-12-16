const util = require("util");

function ErrorType(defaultMessage, errorName) {
	function newError(message) {
		Error.call(this);
		Error.captureStackTrace(this, this.constructor);

		this.name = errorName;
		this.message = message || defaultMessage;
	}
	util.inherits(newError, Error);
	return newError;
}

module.exports = {
	"MissingSchemaError": new ErrorType("Missing Schema", "MissingSchemaError"),
	"InvalidParameter": new ErrorType("Invalid Parameter", "InvalidParameter"),
	"InvalidParameterType": new ErrorType("Invalid Parameter Type", "InvalidParameterType"),
	"UnknownAttribute": new ErrorType("The attribute can not be found", "UnknownAttribute"),
	"InvalidType": new ErrorType("Invalid Type", "InvalidType"),
	"WaitForActiveTimeout": new ErrorType("Waiting for table to be active has timed out", "WaitForActiveTimeout"),
	"TypeMismatch": new ErrorType("There was a type mismatch between the schema and document", "TypeMismatch")
};
