const Error = require("../Error");
const Schema = require("../Schema");
const Document = require("../Document");
const ModelStore = require("../ModelStore");
const utils = require("../utils");
const ddb = require("../aws/ddb/internal");
const Internal = require("../Internal");
const DocumentRetriever = require("../DocumentRetriever");
const defaults = require("./defaults");

// Model represents one DynamoDB table
class Model {
	constructor(name, schema, options = {}) {
		this.options = utils.combine_objects(options, defaults.custom.get(), defaults.original);
		this.name = `${this.options.prefix}${name}${this.options.suffix}`;

		if (!schema) {
			throw new Error.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse "dynamoose.model(name, schema)"`);
		} else if (!(schema instanceof Schema)) {
			schema = new Schema(schema);
		}
		if (options.expires) {
			if (typeof options.expires === "number") {
				options.expires = {
					"attribute": "ttl",
					"ttl": options.expires
				};
			}
			options.expires = utils.combine_objects(options.expires, {"attribute": "ttl"});

			schema.schemaObject[options.expires.attribute] = {
				"type": {
					"value": Date,
					"settings": {
						"storage": "seconds"
					}
				},
				"default": () => new Date(Date.now() + options.expires.ttl)
			};
			schema[Internal.Schema.internalCache].attributes = undefined;
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
			setupFlow.push(() => createTable(this));
		}
		// Wait for Active
		if ((this.options.waitForActive || {}).enabled) {
			setupFlow.push(() => waitForActive(this));
		}
		// Update Time To Live
		if ((this.options.create || this.options.update) && options.expires) {
			setupFlow.push(() => updateTimeToLive(this));
		}
		// Update
		if (this.options.update) {
			setupFlow.push(() => updateTable(this));
		}

		// Run setup flow
		const setupFlowPromise = setupFlow.reduce((existingFlow, flow) => {
			return existingFlow.then(() => flow()).then((flow) => {
				return typeof flow === "function" ? flow() : flow;
			});
		}, Promise.resolve());
		setupFlowPromise.then(() => this.ready = true).then(() => {this.pendingTasks.forEach((task) => task()); this.pendingTasks = [];});

		this.Document = Document(this);
		const returnObject = this.Document;
		returnObject.table = {
			"create": {
				"request": () => createTableRequest(this)
			}
		};

		returnObject.transaction = [
			// `function` Default: `this[key]`
			// `settingsIndex` Default: 1
			// `dynamoKey` Default: utils.capitalize_first_letter(key)
			{"key": "get"},
			{"key": "create", "dynamoKey": "Put"},
			{"key": "delete"},
			{"key": "update", "settingsIndex": 2, "modifier": (response) => {
				delete response.ReturnValues;
				return response;
			}},
			{"key": "condition", "settingsIndex": -1, "dynamoKey": "ConditionCheck", "function": (key, options) => ({
				...options,
				"Key": this.Document.toDynamo(convertObjectToKey.bind(this)(key)),
				"TableName": this.name
			})}
		].reduce((accumulator, currentValue) => {
			const {key, modifier} = currentValue;
			const dynamoKey = currentValue.dynamoKey || utils.capitalize_first_letter(key);
			const settingsIndex = currentValue.settingsIndex || 1;
			const func = currentValue.function || this[key].bind(this);

			accumulator[key] = async (...args) => {
				if (typeof args[args.length - 1] === "function") {
					console.warn("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
					args.pop();
				}

				if (settingsIndex >= 0) {
					args[settingsIndex] = utils.merge_objects({"return": "request"}, args[settingsIndex] || {});
				}
				let result = await func(...args);
				if (modifier) {
					result = modifier(result);
				}
				return {[dynamoKey]: result};
			};

			return accumulator;
		}, {});

		ModelStore(this);

		// return returnObject;
	}
}

// Utility functions
async function createTable(model) {
	if ((((await getTableDetails(model, {"allowError": true})) || {}).Table || {}).TableStatus === "ACTIVE") {
		return () => Promise.resolve.bind(Promise)();
	}

	return ddb("createTable", await createTableRequest(model));
}
async function createTableRequest(model) {
	return {
		"TableName": model.name,
		...utils.dynamoose.get_provisioned_throughput(model.options),
		...await model.schema.getCreateTableAttributeParams(model)
	};
}
async function updateTimeToLive(model) {
	let ttlDetails;

	async function updateDetails() {
		ttlDetails = await ddb("describeTimeToLive", {
			"TableName": model.name
		});
	}
	await updateDetails();

	function updateTTL() {
		return ddb("updateTimeToLive", {
			"TableName": model.name,
			"TimeToLiveSpecification": {
				"AttributeName": model.options.expires.attribute,
				"Enabled": true
			}
		});
	}

	switch (ttlDetails.TimeToLiveDescription.TimeToLiveStatus) {
	case "DISABLING":
		while (ttlDetails.TimeToLiveDescription.TimeToLiveStatus === "DISABLING") {
			await utils.timeout(1000);
			await updateDetails();
		}
		// fallthrough
	case "DISABLED":
		await updateTTL();
		break;
	default:
		break;
	}
}
function waitForActive(model) {
	return () => new Promise((resolve, reject) => {
		const start = Date.now();
		async function check(count) {
			try {
				// Normally we'd want to do `dynamodb.waitFor` here, but since it doesn't work with tables that are being updated we can't use it in this case
				if ((await getTableDetails(model, {"forceRefresh": count > 0})).Table.TableStatus === "ACTIVE") {
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
async function getTableDetails(model, settings = {}) {
	const func = async () => {
		const tableDetails = await ddb("describeTable", {"TableName": model.name});
		model.latestTableDetails = tableDetails; // eslint-disable-line require-atomic-updates
	};
	if (settings.forceRefresh || !model.latestTableDetails) {
		if (settings.allowError) {
			try {
				await func();
			} catch (e) {} // eslint-disable-line no-empty
		} else {
			await func();
		}
	}

	return model.latestTableDetails;
}
async function updateTable(model) {
	const currentThroughput = (await getTableDetails(model)).Table;
	const expectedThroughput = utils.dynamoose.get_provisioned_throughput(model.options);
	if ((expectedThroughput.BillingMode === currentThroughput.BillingMode && expectedThroughput.BillingMode) || ((currentThroughput.ProvisionedThroughput || {}).ReadCapacityUnits === (expectedThroughput.ProvisionedThroughput || {}).ReadCapacityUnits && currentThroughput.ProvisionedThroughput.WriteCapacityUnits === expectedThroughput.ProvisionedThroughput.WriteCapacityUnits)) {
	// if ((expectedThroughput.BillingMode === currentThroughput.BillingModeSummary.BillingMode && expectedThroughput.BillingMode) || ((currentThroughput.ProvisionedThroughput || {}).ReadCapacityUnits === (expectedThroughput.ProvisionedThroughput || {}).ReadCapacityUnits && currentThroughput.ProvisionedThroughput.WriteCapacityUnits === expectedThroughput.ProvisionedThroughput.WriteCapacityUnits)) {
		return () => Promise.resolve.bind(Promise)();
	}

	const object = {
		"TableName": model.name,
		...expectedThroughput
	};
	return ddb("updateTable", object);
}

function convertObjectToKey(key) {
	let keyObject;
	const hashKey = this.schema.getHashKey();
	if (typeof key === "object") {
		const rangeKey = this.schema.getRangeKey();
		keyObject = {
			[hashKey]: key[hashKey]
		};
		if (rangeKey && key[rangeKey]) {
			keyObject[rangeKey] = key[rangeKey];
		}
	} else {
		keyObject = {
			[hashKey]: key
		};
	}

	return keyObject;
}


Model.prototype.get = function (key, settings = {}, callback) {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const documentify = (document) => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"});

	const getItemParams = {
		"Key": this.Document.toDynamo(convertObjectToKey.bind(this)(key)),
		"TableName": this.name
	};
	if (settings.return === "request") {
		if (callback) {
			callback(null, getItemParams);
			return;
		} else {
			return getItemParams;
		}
	}
	const promise = this.pendingTaskPromise().then(() => ddb("getItem", getItemParams));

	if (callback) {
		promise.then((response) => response.Item ? documentify(response.Item) : undefined).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return response.Item ? await documentify(response.Item) : undefined;
		})();
	}
};
Model.prototype.batchGet = function (keys, settings = {}, callback) {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const documentify = (document) => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"});
	const prepareResponse = async (response) => {
		const tmpResult = await Promise.all(response.Responses[this.name].map((item) => documentify(item)));
		const unprocessedArray = response.UnprocessedKeys[this.name] ? response.UnprocessedKeys[this.name].Keys : [];
		const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Document.fromDynamo(item)));
		const startArray = [];
		startArray.unprocessedKeys = [];
		return keyObjects.reduce((result, key) => {
			const keyProperties = Object.keys(key);
			let item = tmpResult.find((item) => keyProperties.every((keyProperty) => item[keyProperty] === key[keyProperty]));
			if (item) {
				result.push(item);
			} else {
				item = tmpResultUnprocessed.find((item) => keyProperties.every((keyProperty) => item[keyProperty] === key[keyProperty]));
				if (item) {
					result.unprocessedKeys.push(item);
				}
			}
			return result;
		}, startArray);
	};

	const keyObjects = keys.map((key) => convertObjectToKey.bind(this)(key));
	const params = {
		"RequestItems": {
			[this.name]: {
				"Keys": keyObjects.map((key) => this.Document.toDynamo(key))
			}
		}
	};
	if (settings.return === "request") {
		if (callback) {
			callback(null, params);
			return;
		} else {
			return params;
		}
	}
	const promise = this.pendingTaskPromise().then(() => ddb("batchGetItem", params));

	if (callback) {
		promise.then((response) => prepareResponse(response)).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

Model.prototype.create = function (document, settings = {}, callback) {
	if (typeof settings === "function" && !callback) {
		callback = settings;
		settings = {};
	}

	return (new this.Document(document)).save({"overwrite": false, ...settings}, callback);
};
Model.prototype.batchPut = function (items, settings = {}, callback) {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const prepareResponse = async (response) => {
		const unprocessedArray = response.UnprocessedItems && response.UnprocessedItems[this.name] ? response.UnprocessedItems[this.name] : [];
		const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Document.fromDynamo(item.PutRequest.Item)));
		return items.reduce((result, document) => {
			const item = tmpResultUnprocessed.find((item) => Object.keys(document).every((keyProperty) => item[keyProperty] === document[keyProperty]));
			if (item) {
				result.unprocessedItems.push(item);
			}
			return result;
		}, {"unprocessedItems": []});
	};

	const paramsPromise = (async () => ({
		"RequestItems": {
			[this.name]: await Promise.all(items.map(async (item) => ({
				"PutRequest": {
					"Item": await (new this.Document(item)).toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"]})
				}
			})))
		}
	}))();
	if (settings.return === "request") {
		if (callback) {
			paramsPromise.then((result) => callback(null, result));
			return;
		} else {
			return paramsPromise;
		}
	}
	const promise = this.pendingTaskPromise().then(() => paramsPromise).then((params) => ddb("batchWriteItem", params));

	if (callback) {
		promise.then((response) => prepareResponse(response)).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

Model.prototype.update = function (keyObj, updateObj, settings = {}, callback) {
	if (typeof updateObj === "function") {
		callback = updateObj;
		updateObj = null;
		settings = {};
	}
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}
	if (!updateObj) {
		const hashKeyName = this.schema.getHashKey();
		updateObj = keyObj;
		keyObj = {
			[hashKeyName]: keyObj[hashKeyName]
		};
		delete updateObj[hashKeyName];
	}

	let index = 0;
	const getUpdateExpressionObject = async () => {
		const updateTypes = [
			{"name": "$SET", "operator": " = ", "objectFromSchemaSettings": {"validate": true, "enum": true, "forceDefault": true, "required": "nested", "modifiers": ["set"]}},
			{"name": "$ADD", "objectFromSchemaSettings": {"forceDefault": true}},
			{"name": "$REMOVE", "attributeOnly": true, "objectFromSchemaSettings": {"required": true, "defaults": true}}
		].reverse();
		const returnObject = await Object.keys(updateObj).reduce(async (accumulatorPromise, key) => {
			const accumulator = await accumulatorPromise;
			let value = updateObj[key];

			if (!(typeof value === "object" && updateTypes.map((a) => a.name).includes(key))) {
				value = {[key]: value};
				key = "$SET";
			}

			const valueKeys = Object.keys(value);
			for (let i = 0; i < valueKeys.length; i++) {
				let subKey = valueKeys[i];
				let subValue = value[subKey];

				let updateType = updateTypes.find((a) => a.name === key);

				const expressionKey = `#a${index}`;
				subKey = Array.isArray(value) ? subValue : subKey;

				const dynamoType = this.schema.getAttributeType(subKey, subValue, {"unknownAttributeAllowed": true});
				const attributeExists = this.schema.attributes().includes(subKey);
				const dynamooseUndefined = require("../index").undefined;
				if (!updateType.attributeOnly && subValue !== dynamooseUndefined) {
					subValue = (await this.Document.objectFromSchema({[subKey]: dynamoType === "L" && !Array.isArray(subValue) ? [subValue] : subValue}, {"type": "toDynamo", "customTypesDynamo": true, "saveUnknown": true, ...updateType.objectFromSchemaSettings}))[subKey];
				}

				if (subValue === dynamooseUndefined || subValue === undefined) {
					if (attributeExists) {
						updateType = updateTypes.find((a) => a.name === "$REMOVE");
					} else {
						continue;
					}
				}

				if (subValue !== dynamooseUndefined) {
					const defaultValue = await this.schema.defaultCheck(subKey, undefined, updateType.objectFromSchemaSettings);
					if (defaultValue) {
						subValue = defaultValue;
						updateType = updateTypes.find((a) => a.name === "$SET");
					}
				}

				if (updateType.objectFromSchemaSettings.required === true) {
					await this.schema.requiredCheck(subKey, undefined);
				}

				let expressionValue = updateType.attributeOnly ? "" : `:v${index}`;
				accumulator.ExpressionAttributeNames[expressionKey] = subKey;
				if (!updateType.attributeOnly) {
					accumulator.ExpressionAttributeValues[expressionValue] = subValue;
				}

				if (dynamoType === "L" && updateType.name === "$ADD") {
					expressionValue = `list_append(${expressionKey}, ${expressionValue})`;
					updateType = updateTypes.find((a) => a.name === "$SET");
				}

				const operator = updateType.operator || (updateType.attributeOnly ? "" : " ");

				accumulator.UpdateExpression[updateType.name.slice(1)].push(`${expressionKey}${operator}${expressionValue}`);

				index++;
			}

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

		await Promise.all(this.schema.attributes().map(async (attribute) => {
			const defaultValue = await this.schema.defaultCheck(attribute, undefined, {"forceDefault": true});
			if (defaultValue && !Object.values(returnObject.ExpressionAttributeNames).includes(attribute)) {
				const updateType = updateTypes.find((a) => a.name === "$SET");

				returnObject.ExpressionAttributeNames[`#a${index}`] = attribute;
				returnObject.ExpressionAttributeValues[`:v${index}`] = defaultValue;
				returnObject.UpdateExpression[updateType.name.slice(1)].push(`#a${index}${updateType.operator}:v${index}`);

				index++;
			}
		}));

		Object.values(returnObject.ExpressionAttributeNames).map((attribute, index) => {
			const value = Object.values(returnObject.ExpressionAttributeValues)[index];
			const valueKey = Object.keys(returnObject.ExpressionAttributeValues)[index];
			const dynamoType = this.schema.getAttributeType(attribute, value, {"unknownAttributeAllowed": true});
			const attributeType = Schema.attributeTypes.findDynamoDBType(dynamoType);

			if (attributeType.toDynamo && !attributeType.isOfType(value, "fromDynamo")) {
				returnObject.ExpressionAttributeValues[valueKey] = attributeType.toDynamo(value);
			}
		});

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

	const documentify = (document) => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "type": "fromDynamo"});
	const updateItemParamsPromise = this.pendingTaskPromise().then(async () => ({
		"Key": this.Document.toDynamo(keyObj),
		"ReturnValues": "ALL_NEW",
		...utils.merge_objects.main({"combineMethod": "object_combine"})((settings.condition ? settings.condition.requestObject({"index": {"start": index, "set": (i) => index = i}, "conditionString": "ConditionExpression"}) : {}), await getUpdateExpressionObject()),
		"TableName": this.name
	}));
	if (settings.return === "request") {
		if (callback) {
			updateItemParamsPromise.then((params) => callback(null, params));
			return;
		} else {
			return updateItemParamsPromise;
		}
	}
	const promise = updateItemParamsPromise.then((params) => ddb("updateItem", params));

	if (callback) {
		promise.then((response) => response.Attributes ? documentify(response.Attributes) : undefined).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return response.Attributes ? await documentify(response.Attributes) : undefined;
		})();
	}
};

Model.prototype.delete = function (key, settings = {}, callback) {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const deleteItemParams = {
		"Key": this.Document.toDynamo(convertObjectToKey.bind(this)(key)),
		"TableName": this.name
	};
	if (settings.return === "request") {
		if (callback) {
			callback(null, deleteItemParams);
			return;
		} else {
			return deleteItemParams;
		}
	}
	const promise = this.pendingTaskPromise().then(() => ddb("deleteItem", deleteItemParams));

	if (callback) {
		promise.then(() => callback()).catch((error) => callback(error));
	} else {
		return promise;
	}
};
Model.prototype.batchDelete = function (keys, settings = {}, callback) {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const prepareResponse = async (response) => {
		const unprocessedArray = response.UnprocessedItems && response.UnprocessedItems[this.name] ? response.UnprocessedItems[this.name] : [];
		const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Document.fromDynamo(item.DeleteRequest.Key)));
		return keyObjects.reduce((result, key) => {
			const item = tmpResultUnprocessed.find((item) => Object.keys(key).every((keyProperty) => item[keyProperty] === key[keyProperty]));
			if (item) {
				result.unprocessedItems.push(item);
			}
			return result;
		}, {"unprocessedItems": []});
	};

	const keyObjects = keys.map((key) => convertObjectToKey.bind(this)(key));
	const params = {
		"RequestItems": {
			[this.name]: keyObjects.map((key) => ({
				"DeleteRequest": {
					"Key": this.Document.toDynamo(key)
				}
			}))
		}
	};
	if (settings.return === "request") {
		if (callback) {
			callback(null, params);
			return;
		} else {
			return params;
		}
	}
	const promise = this.pendingTaskPromise().then(() => ddb("batchWriteItem", params));

	if (callback) {
		promise.then((response) => prepareResponse(response)).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async () => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

Model.prototype.scan = {"carrier": DocumentRetriever("scan")};
Model.prototype.query = {"carrier": DocumentRetriever("query")};

// Methods
const customMethodFunctions = (type) => {
	const entryPoint = (self) => type === "document" ? self.Document.prototype : self.Document;
	return {
		"set": function (name, fn) {
			const self = this;
			if (!entryPoint(this)[name] || (entryPoint(this)[name][Internal.General.internalProperties] && entryPoint(this)[name][Internal.General.internalProperties].type === "customMethod")) {
				entryPoint(this)[name] = function (...args) {
					const bindObject = type === "document" ? this : self.Document;
					const cb = typeof args[args.length - 1] === "function" ? args[args.length - 1] : undefined;
					if (cb) {
						const result = fn.bind(bindObject)(...args);
						if (result instanceof Promise) {
							result.then((result) => cb(null, result)).catch((err) => cb(err));
						}
					} else {
						return new Promise((resolve, reject) => {
							const result = fn.bind(bindObject)(...args, (err, result) => {
								if (err) {
									reject(err);
								} else {
									resolve(result);
								}
							});
							if (result instanceof Promise) {
								result.then(resolve).catch(reject);
							}
						});
					}
				};
				entryPoint(this)[name][Internal.General.internalProperties] = {"type": "customMethod"};
			}
		},
		"delete": function (name) {
			if (entryPoint(this)[name] && entryPoint(this)[name][Internal.General.internalProperties] && entryPoint(this)[name][Internal.General.internalProperties].type === "customMethod") {
				entryPoint(this)[name] = undefined;
			}
		}
	};
};
Model.prototype.methods = {
	...customMethodFunctions("model"),
	"document": customMethodFunctions("document")
};

module.exports = Model;
