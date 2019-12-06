const Error = require("./Error");
const Schema = require("./Schema");
const Document = require("./Document");
const utils = require("./utils");
const aws = require("./aws");

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

	// Setup flow
	this.ready = false; // Represents if model is ready to be used for actions such as "get", "put", etc.
	const setupFlow = [];
	// Create table
	if (this.options.create) {

	}
	// console.log(this.options);

	Document.Model = this;
	return Document;
}

// Utility functions
function createTable(model) {
	const object = {
		"ProvisionedThroughput": getProvisionedThroughput(model),
		"TableName": model.name,
		...model.schema.getCreateTableAttributeParams()
	};
	return aws.ddb().createTable();
}
function getProvisionedThroughput(model) {
	return {
		"ReadCapacityUnits": model.options.throughput.read,
		"WriteCapacityUnits": model.options.throughput.write
	};
}

// Defaults

const defaults = {
	"create": true,
	"throughput": {
		"read": 5,
		"write": 5
	},
	"prefix": "",
	"suffix": "",
	// "update": false,
	// "waitForActive": true,
	// "waitForActiveTimeout": 180000,
	// "streamOptions": {
	// 	"enabled": false,
	// 	"type": undefined
	// },
	// "serverSideEncryption": false,
	// "defaultReturnValues": "ALL_NEW",
};
Model.defaults = defaults;

module.exports = Model;
