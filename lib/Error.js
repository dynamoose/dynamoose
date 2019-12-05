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
	"InvalidParameterType": new ErrorType("Invalid Parameter Type", "InvalidParameterType")
};
