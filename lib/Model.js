const Error = require("./Error");
const Schema = require("./Schema");
const Document = require("./Document");

// Model represents one DynamoDB table
function Model(name, schema) {
	this.name = name;

	if (!schema) {
		throw new Error.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse dynamoose.model(name, schema)`);
	} else if (!(schema instanceof Schema)) {
		schema = new Schema(schema);
	}
	this.schema = schema;

	Document.Model = this;
	return model;
}

module.exports = Model;
