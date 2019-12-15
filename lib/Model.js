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
	this.pendingTasks = []; // Represents an array of promise resolver functions to be called when Model.ready gets set to true (at the end of the setup flow)
	this.pendingTaskPromise = () => { // Returns a promise that will be resolved after the Model is ready. This is used in all Model operations (Model.get, Document.save) to `await` at the beginning before running the AWS SDK method to ensure the Model is setup before running actions on it.
		return this.ready ? Promise.resolve() : new Promise((resolve) => {
			this.pendingTasks.push(resolve);
		});
	};
	const setupFlow = []; // An array of setup actions to be run in order
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
	setupFlowPromise.then(() => this.ready = true).then(() => {this.pendingTasks.forEach((task) => task()); this.pendingTasks = [];});

	this.Document = Document(this);
	return this.Document;
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

			model.options.waitForActive.check.frequency === 0 ? await (new Promise((resolve) => setImmediate(resolve))) : await utils.timeout(model.options.waitForActive.check.frequency);
			if ((Date.now() - start) >= model.options.waitForActive.check.timeout) {
				return reject(new Error.WaitForActiveTimeout(`Wait for active timed out after ${Date.now() - start} milliseconds.`));
			} else {
				check();
			}
		}
		check();
	});
}


Model.prototype.get = function(hashKey, callback) {
	// TODO: improve how this works. Currently we are making a new document, running fromDynamo then passing that into a new document. This is really inefficient, and we should only have to create the document once.
	const documentify = (document) => new this.Document((new this.Document(document)).fromDynamo());

	const promise = this.pendingTaskPromise().then(() => aws.ddb().getItem({
		// TODO: we use aws.converter().marshall() in the Document.js file as well. We should think about if there is a way to make this code DRYer.
		"Key": aws.converter().marshall({
			[this.schema.getHashKey()]: hashKey
			// TODO: add support for range keys
		}),
		"TableName": this.name
	}).promise());

	if (callback) {
		promise.then((response) => callback(null, documentify(response.Item))).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = (await promise).Item;
			return documentify(response);
		})();
	}
};

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
