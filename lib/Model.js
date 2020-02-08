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
	this.latestTableDetails = null; // Stores the latest result from `describeTable` for the given table
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
	const setupFlowPromise = setupFlow.reduce((existingFlow, flow) => existingFlow.then(() => flow).then((flow) => (typeof flow === "function" ? flow : flow.promise).bind(flow)()), Promise.resolve());
	setupFlowPromise.then(() => this.ready = true).then(() => {this.pendingTasks.forEach((task) => task()); this.pendingTasks = [];});

	this.Document = Document(this);
	return this.Document;
}

// Utility functions
async function createTable(model) {
	if ((((await getTableDetails(model)) || {}).Table || {}).TableStatus === "ACTIVE") {
		return {"promise": () => Promise.resolve()};
	}

	const object = {
		"TableName": model.name,
		...getProvisionedThroughput(model),
		...await model.schema.getCreateTableAttributeParams()
	};
	return aws.ddb().createTable(object);
}
function getProvisionedThroughput(model) {
	if (model.options.throughput === "ON_DEMAND") {
		return {
			"BillingMode": "PAY_PER_REQUEST"
		};
	} else {
		return {
			"ProvisionedThroughput": {
				"ReadCapacityUnits": typeof model.options.throughput === "number" ? model.options.throughput : model.options.throughput.read,
				"WriteCapacityUnits": typeof model.options.throughput === "number" ? model.options.throughput : model.options.throughput.write
			}
		};
	}
}
function waitForActive(model) {
	return () => new Promise((resolve, reject) => {
		const start = Date.now();
		async function check(count) {
			try {
				// Normally we'd want to do `dynamodb.waitFor` here, but since it doesn't work with tables that are being updated we can't use it in this case
				if ((await getTableDetails(model, count > 0)).Table.TableStatus === "ACTIVE") {
					return resolve();
				}
			} catch (e) {
				return reject(e);
			}

			if (count > 0) {
				model.options.waitForActive.check.frequency === 0 ? await utils.set_immediate_promise() : await utils.timeout(model.options.waitForActive.check.frequency);
			}
			if ((Date.now() - start) >= model.options.waitForActive.check.timeout) {
				return reject(new Error.WaitForActiveTimeout(`Wait for active timed out after ${Date.now() - start} milliseconds.`));
			} else {
				check(++count);
			}
		}
		check(0);
	});
}
async function getTableDetails(model, forceRefresh = false) {
	if (forceRefresh || !model.latestTableDetails) {
		const tableDetails = await aws.ddb().describeTable({"TableName": model.name}).promise();
		model.latestTableDetails = tableDetails; // eslint-disable-line require-atomic-updates
	}

	return model.latestTableDetails;
}


Model.prototype.get = function(key, callback) {
	const documentify = (document) => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "saveUnknown": true, "type": "fromDynamo"});

	const promise = this.pendingTaskPromise().then(() => aws.ddb().getItem({
		"Key": this.Document.toDynamo(typeof key === "object" ? key : {
			[this.schema.getHashKey()]: key
		}),
		"TableName": this.name
	}).promise());

	if (callback) {
		promise.then((response) => response.Item ? documentify(response.Item) : undefined).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return response.Item ? await documentify(response.Item) : undefined;
		})();
	}
};

Model.prototype.create = function(document, settings = {}, callback) {
	if (typeof settings === "function" && !callback) {
		callback = settings;
		settings = {};
	}

	return (new this.Document(document)).save({"overwrite": false, ...settings}, callback);
};

Model.prototype.update = function(keyObj, updateObj, callback) {
	if (typeof updateObj === "function") {
		callback = updateObj;
		updateObj = null;
	}
	if (!updateObj) {
		const hashKeyName = this.schema.getHashKey();
		updateObj = keyObj;
		keyObj = {
			[hashKeyName]: keyObj[hashKeyName]
		};
		delete updateObj[hashKeyName];
	}

	const getUpdateExpressionObject = async () => {
		const updateTypes = [
			{"name": "$SET", "operator": " = ", "objectFromSchemaSettings": {"validate": true}},
			{"name": "$ADD"},
			{"name": "$REMOVE", "attributeOnly": true}
		].reverse();
		let index = 0;
		const returnObject = await Object.keys(updateObj).reduce(async (accumulatorPromise, key) => {
			const accumulator = await accumulatorPromise;
			let value = updateObj[key];

			if (!(typeof value === "object" && updateTypes.map((a) => a.name).includes(key))) {
				value = {[key]: value};
				key = "$SET";
			}

			await Promise.all(Object.keys(value).map(async (subKey) => {
				let subValue = value[subKey];

				let updateType = updateTypes.find((a) => a.name === key);

				const expressionKey = `#a${index}`;
				let expressionValue = updateType.attributeOnly ? "" : `:v${index}`;
				subKey = Array.isArray(value) ? subValue : subKey;

				const dynamoType = this.schema.getAttributeTypeDetails(subKey).dynamodbType;

				if (!updateType.attributeOnly) {
					subValue = (await this.Document.objectFromSchema({[subKey]: dynamoType === "L" && !Array.isArray(subValue) ? [subValue] : subValue}, {"type": "toDynamo", "customTypesDynamo": true, ...updateType.objectFromSchemaSettings}))[subKey];
				}

				accumulator.ExpressionAttributeNames[expressionKey] = subKey;
				if (!updateType.attributeOnly) {
					accumulator.ExpressionAttributeValues[expressionValue] = subValue;
				}

				if (dynamoType === "L") {
					expressionValue = `list_append(${expressionKey}, ${expressionValue})`;
					updateType = updateTypes.find((a) => a.name === "$SET");
				}

				const operator = updateType.operator || (updateType.attributeOnly ? "" : " ");

				accumulator.UpdateExpression[updateType.name.slice(1)].push(`${expressionKey}${operator}${expressionValue}`);

				index++;
			}));

			return accumulator;
		}, Promise.resolve((async () => {
			const obj = {
				"ExpressionAttributeNames": {},
				"ExpressionAttributeValues": {},
				"UpdateExpression": updateTypes.map((a) => a.name).reduce((accumulator, key) => {
					accumulator[key.slice(1)] = [];
					return accumulator;
				}, {})
			};

			const documentFunctionSettings = {"updateTimestamps": {"updatedAt": true}, "customTypesDynamo": true, "type": "toDynamo"};
			const defaultObjectFromSchema = await this.Document.objectFromSchema(this.Document.prepareForObjectFromSchema({}, documentFunctionSettings), documentFunctionSettings);
			Object.keys(defaultObjectFromSchema).forEach((key) => {
				const value = defaultObjectFromSchema[key];
				const updateType = updateTypes.find((a) => a.name === "$SET");

				obj.ExpressionAttributeNames[`#a${index}`] = key;
				obj.ExpressionAttributeValues[`:v${index}`] = value;
				obj.UpdateExpression[updateType.name.slice(1)].push(`#a${index}${updateType.operator}:v${index}`);

				index++;
			});

			return obj;
		})()));

		returnObject.ExpressionAttributeValues = this.Document.toDynamo(returnObject.ExpressionAttributeValues);
		returnObject.UpdateExpression = Object.keys(returnObject.UpdateExpression).reduce((accumulator, key) => {
			const value = returnObject.UpdateExpression[key];

			if (value.length > 0) {
				return `${accumulator}${accumulator.length > 0 ? " " : ""}${key} ${value.join(", ")}`;
			} else {
				return accumulator;
			}
		}, "");
		return returnObject;
	};

	const documentify = (document) => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "type": "fromDynamo"});
	const promise = this.pendingTaskPromise().then(async () => aws.ddb().updateItem({
		"Key": this.Document.toDynamo(keyObj),
		"ReturnValues": "ALL_NEW",
		...await getUpdateExpressionObject(),
		"TableName": this.name
	}).promise());

	if (callback) {
		promise.then((response) => response.Attributes ? documentify(response.Attributes) : undefined).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return response.Attributes ? await documentify(response.Attributes) : undefined;
		})();
	}
};

Model.prototype.scan = {"carrier": require("./DocumentRetriever")("scan")};
Model.prototype.query = {"carrier": require("./DocumentRetriever")("query")};

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
