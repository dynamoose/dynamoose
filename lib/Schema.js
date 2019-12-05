const Error = require("./Error");

function Schema(object) {
	if (!object || typeof object !== "object" || Array.isArray(object)) {
		throw new Error.InvalidParameterType("Schema initalization parameter must be an object.");
	}
	if (Object.keys(object).length === 0) {
		throw new Error.InvalidParameter("Schema initalization parameter must not be an empty object.");
	}

	this.object = {};
	Object.keys(object).forEach((key) => this.object[key] = object[key]);

	this.schemaObject = object;
}

module.exports = Schema;
