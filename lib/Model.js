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
	this.ready = false; // Represents if model is ready to be used for actions such as "get", "put", etc. This property being true does not guarantee anything on the DynamoDB server. It only guarantees that Dynamoose has finished the initalization steps required to allow the model to function as expected on the client side.
	const setupFlow = [];
	// Create table
	if (this.options.create) {
		setupFlow.push(createTable(this));
	}
	// Wait for Active
	if ((this.options.waitForActive || {}).enabled) {
		setupFlow.push(waitForActive(this));
	}

	// Run setup flow
	const setupFlowPromise = setupFlow.reduce((existingFlow, flow) => existingFlow.then(() => {
		return (typeof flow === "function" ? flow : flow.promise).bind(flow)();
	}), Promise.resolve());
	setupFlowPromise.then(() => this.ready = true);

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
	return aws.ddb().createTable(object);
}
function getProvisionedThroughput(model) {
	return {
		"ReadCapacityUnits": model.options.throughput.read,
		"WriteCapacityUnits": model.options.throughput.write
	};
}
function waitForActive(model) {
	return () => new Promise((resolve, reject) => {
		const start = Date.now();
		async function check() {
			try {
				const tableDetails = await aws.ddb().describeTable({"TableName": model.name}).promise();
				if (tableDetails.Table.TableStatus === "ACTIVE") {
					return resolve();
				}
			} catch (e) {}

			await utils.timeout(model.options.waitForActive.check.frequency);
			if ((Date.now() - start) >= model.options.waitForActive.check.timeout) {
				return reject(new Error.WaitForActiveTimeout(`Wait for active timed out after ${Date.now() - start} milliseconds.`));
			} else {
				check();
			}
		}
		check();
	});
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
	"waitForActive": {
		"enabled": true,
		"check": {
			"timeout": 180000,
			"frequency": 1000
		}
	},
	// "update": false,
	// "streamOptions": {
	// 	"enabled": false,
	// 	"type": undefined
	// },
	// "serverSideEncryption": false,
	// "defaultReturnValues": "ALL_NEW",
};
Model.defaults = defaults;

module.exports = Model;
