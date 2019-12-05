const Error = require("./Error");
const Schema = require("./Schema");
const Document = require("./Document");
const utils = require("./utils");

// Model represents one DynamoDB table
function Model(name, schema, options = {}) {
	this.options = utils.combine_objects(options, Model.defaults, defaults);
	this.name = `${this.options.prefix}${name}${this.options.suffix}`;

	if (!schema) {
		throw new Error.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse dynamoose.model(name, schema)`);
	} else if (!(schema instanceof Schema)) {
		schema = new Schema(schema);
	}
	this.schema = schema;

	Document.Model = this;
	return Document;
}

// Defaults

const defaults = {
	"create": true,
	// "update": false,
	// "waitForActive": true,
	// "waitForActiveTimeout": 180000,
	// "streamOptions": {
	// 	"enabled": false,
	// 	"type": undefined
	// },
	// "serverSideEncryption": false,
	// "defaultReturnValues": "ALL_NEW",
	"prefix": "",
	"suffix": ""
};
Model.defaults = defaults;

module.exports = Model;
