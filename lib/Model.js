const Error = require("./Error");
const Schema = require("./Schema");

// Model represents 1 DynamoDB table
function Model(name, schema) {
	this.name = name;

	if (!schema) {
		throw new Error.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse dynamoose.model(name, schema)`);
	} else if (!(schema instanceof Schema)) {
		schema = new Schema(schema);
	}
	this.schema = schema;

	function model(obj) {
		this.obj = obj;
	}

	model.Model = this;
	return model;
}

module.exports = Model;
