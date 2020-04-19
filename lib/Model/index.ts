import CustomError from "../Error";
import {Schema, SchemaDefinition} from "../Schema";
import {Document as DocumentCarrier} from "../Document";
import utils from "../utils";
import ddb from "../aws/ddb/internal";
import Internal from "../Internal";
import Condition from "../Condition";
import {Scan, Query, ConditionInitalizer} from "../DocumentRetriever";
import {CallbackType} from "../General";
import {custom as customDefaults, original as originalDefaults} from "./defaults";

import {DynamoDB, Request, AWSError} from "aws-sdk";

// Defaults
interface ModelWaitForActiveSettings {
	enabled: boolean;
	check: {timeout: number; frequency: number};
}
export interface ModelExpiresSettings {
	ttl: number;
	attribute: string;
	items?: {
		returnExpired: boolean;
	};
}
export interface ModelOptions {
	create: boolean;
	throughput: number | {read: number; write: number};
	prefix: string;
	suffix: string;
	waitForActive: ModelWaitForActiveSettings;
	update: boolean;
	expires?: number | ModelExpiresSettings;
}
export type ModelOptionsOptional = Partial<ModelOptions>;



type InputKey = string | {[attribute: string]: string};
function convertObjectToKey(this: Model<DocumentCarrier>, key: InputKey): {[key: string]: string} {
	let keyObject: {[key: string]: string};
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



// Utility functions
async function getTableDetails(model: Model<DocumentCarrier>, settings: {allowError?: boolean; forceRefresh?: boolean} = {}): Promise<DynamoDB.DescribeTableOutput> {
	const func = async (): Promise<void> => {
		const tableDetails: DynamoDB.DescribeTableOutput = (await ddb("describeTable", {"TableName": model.name}) as any);
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
async function createTableRequest(model: Model<DocumentCarrier>): Promise<DynamoDB.CreateTableInput> {
	return {
		"TableName": model.name,
		...utils.dynamoose.get_provisioned_throughput(model.options),
		...await model.schema.getCreateTableAttributeParams(model)
	};
}
async function createTable(model: Model<DocumentCarrier>): Promise<Request<DynamoDB.CreateTableOutput, AWSError> | (() => Promise<void>)> {
	if ((((await getTableDetails(model, {"allowError": true})) || {}).Table || {}).TableStatus === "ACTIVE") {
		return (): Promise<void> => Promise.resolve.bind(Promise)();
	}

	return ddb("createTable", await createTableRequest(model));
}
async function updateTimeToLive(model: Model<DocumentCarrier>): Promise<void> {
	let ttlDetails;

	async function updateDetails(): Promise<void> {
		ttlDetails = await ddb("describeTimeToLive", {
			"TableName": model.name
		});
	}
	await updateDetails();

	function updateTTL(): Request<DynamoDB.UpdateTimeToLiveOutput, AWSError> {
		return (ddb("updateTimeToLive", {
			"TableName": model.name,
			"TimeToLiveSpecification": {
				"AttributeName": (model.options.expires as any).attribute,
				"Enabled": true
			}
		}) as any);
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
function waitForActive(model: Model<DocumentCarrier>) {
	return (): Promise<void> => new Promise((resolve, reject) => {
		const start = Date.now();
		async function check(count): Promise<void> {
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
				return reject(new CustomError.WaitForActiveTimeout(`Wait for active timed out after ${Date.now() - start} milliseconds.`));
			} else {
				check(++count);
			}
		}
		check(0);
	});
}
async function updateTable(model: Model<DocumentCarrier>): Promise<Request<DynamoDB.UpdateTableOutput, AWSError> | (() => Promise<void>)> {
	const currentThroughput = (await getTableDetails(model)).Table;
	const expectedThroughput: any = utils.dynamoose.get_provisioned_throughput(model.options);
	if ((expectedThroughput.BillingMode === currentThroughput.BillingModeSummary?.BillingMode && expectedThroughput.BillingMode) || ((currentThroughput.ProvisionedThroughput || {}).ReadCapacityUnits === (expectedThroughput.ProvisionedThroughput || {}).ReadCapacityUnits && currentThroughput.ProvisionedThroughput.WriteCapacityUnits === expectedThroughput.ProvisionedThroughput.WriteCapacityUnits)) {
	// if ((expectedThroughput.BillingMode === currentThroughput.BillingModeSummary.BillingMode && expectedThroughput.BillingMode) || ((currentThroughput.ProvisionedThroughput || {}).ReadCapacityUnits === (expectedThroughput.ProvisionedThroughput || {}).ReadCapacityUnits && currentThroughput.ProvisionedThroughput.WriteCapacityUnits === expectedThroughput.ProvisionedThroughput.WriteCapacityUnits)) {
		return (): Promise<void> => Promise.resolve.bind(Promise)();
	}

	const object: DynamoDB.UpdateTableInput = {
		"TableName": model.name,
		...expectedThroughput
	};
	return (ddb("updateTable", object) as any);
}


// Model represents one DynamoDB table
export class Model<T extends DocumentCarrier> {
	name: string;
	options: ModelOptions;
	schema: Schema;
	private ready: boolean;
	private pendingTasks: any[];
	latestTableDetails: DynamoDB.DescribeTableOutput;
	pendingTaskPromise: () => Promise<void>;
	static defaults: ModelOptions;
	Document: typeof DocumentCarrier;
	scan: (this: Model<DocumentCarrier>, object?: ConditionInitalizer) => Scan;
	query: (this: Model<DocumentCarrier>, object?: ConditionInitalizer) => Query;
	get: (this: Model<DocumentCarrier>, key: InputKey, settings?: ModelGetSettings, callback?: CallbackType<DocumentCarrier | DynamoDB.GetItemInput, AWSError>) => void | DynamoDB.GetItemInput | Promise<DocumentCarrier>;
	delete: (this: Model<DocumentCarrier>, key: InputKey, settings?: ModelDeleteSettings, callback?: CallbackType<void | DynamoDB.DeleteItemInput, AWSError>) => void | DynamoDB.DeleteItemInput | Promise<void>;
	batchDelete: (this: Model<DocumentCarrier>, keys: InputKey[], settings?: ModelBatchDeleteSettings, callback?: CallbackType<void | DynamoDB.BatchWriteItemInput, AWSError>) => void | DynamoDB.BatchWriteItemInput | Promise<void>;
	create: (this: Model<DocumentCarrier>, document: any, settings?: {}, callback?: CallbackType<DocumentCarrier, AWSError>) => void | Promise<DocumentCarrier>;
	batchPut: (this: Model<DocumentCarrier>, items: any, settings?: {}, callback?: CallbackType<DynamoDB.BatchWriteItemInput | {"unprocessedItems": any[]}, AWSError>) => void | Promise<DynamoDB.BatchWriteItemInput | {"unprocessedItems": any[]}>;
	update: (this: Model<DocumentCarrier>, keyObj: any, updateObj: any, settings?: ModelUpdateSettings, callback?: CallbackType<DocumentCarrier | DynamoDB.UpdateItemInput, AWSError>) => void | Promise<DocumentCarrier | DynamoDB.UpdateItemInput>;
	batchGet: (this: Model<DocumentCarrier>, keys: InputKey[], settings?: ModelBatchGetSettings, callback?: CallbackType<DocumentCarrier[], AWSError>) => void | DynamoDB.BatchGetItemInput | Promise<DocumentCarrier[]>;
	methods: { document: { set: (name: string, fn: any) => void; delete: (name: string) => void }; set: (name: string, fn: any) => void; delete: (name: string) => void };

	constructor(name: string, schema: Schema | SchemaDefinition, options: ModelOptionsOptional = {}) {
		this.options = (utils.combine_objects(options, customDefaults.get(), originalDefaults) as ModelOptions);
		this.name = `${this.options.prefix}${name}${this.options.suffix}`;

		if (!schema) {
			throw new CustomError.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse "dynamoose.model(name, schema)"`);
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
			options.expires = utils.combine_objects((options.expires as any), {"attribute": "ttl"});

			schema.schemaObject[(options.expires as any).attribute] = {
				"type": {
					"value": Date,
					"settings": {
						"storage": "seconds"
					}
				},
				"default": (): Date => new Date(Date.now() + (options.expires as any).ttl)
			};
			schema[Internal.Schema.internalCache].attributes = undefined;
		}
		this.schema = schema;

		// Setup flow
		this.ready = false; // Represents if model is ready to be used for actions such as "get", "put", etc. This property being true does not guarantee anything on the DynamoDB server. It only guarantees that Dynamoose has finished the initalization steps required to allow the model to function as expected on the client side.
		this.pendingTasks = []; // Represents an array of promise resolver functions to be called when Model.ready gets set to true (at the end of the setup flow)
		this.latestTableDetails = null; // Stores the latest result from `describeTable` for the given table
		this.pendingTaskPromise = (): Promise<void> => { // Returns a promise that will be resolved after the Model is ready. This is used in all Model operations (Model.get, Document.save) to `await` at the beginning before running the AWS SDK method to ensure the Model is setup before running actions on it.
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

		const self: Model<DocumentCarrier> = this;
		class Document extends DocumentCarrier {
			static Model: Model<DocumentCarrier>;
			constructor(object: DynamoDB.AttributeMap | {[key: string]: any} = {}, settings: any = {}) {
				super(self, object, settings);
			}
		}
		Document.Model = self;
		// TODO: figure out if there is a better way to do this below.
		// This is needed since when creating a Model we return a Document. But we want to be able to call Model.get and other functions on the model itself. This feels like a really messy solution, but it the only way I can think of how to do it for now.
		// Without this things like Model.get wouldn't work. You would have to do Model.Model.get instead which would be referencing the `Document.Model = model` line above.
		Object.keys(Object.getPrototypeOf(this)).forEach((key) => {
			if (typeof this[key] === "object") {
				const main = (key: string): void => {
					utils.object.set(DocumentCarrier as any, key, {});
					Object.keys(utils.object.get((this as any), key)).forEach((subKey) => {
						const newKey = `${key}.${subKey}`;
						if (typeof utils.object.get((this as any), newKey) === "object") {
							main(newKey);
						} else {
							utils.object.set(DocumentCarrier as any, newKey, (utils.object.get(this, newKey) as any).bind(this));
						}
					});
				};
				main(key);
			} else {
				Document[key] = this[key].bind(this);
			}
		});
		this.Document = Document;
		const returnObject: any = this.Document;
		returnObject.table = {
			"create": {
				"request": (): Promise<DynamoDB.CreateTableInput> => createTableRequest(this)
			}
		};

		returnObject.transaction = [
			// `function` Default: `this[key]`
			// `settingsIndex` Default: 1
			// `dynamoKey` Default: utils.capitalize_first_letter(key)
			{"key": "get"},
			{"key": "create", "dynamoKey": "Put"},
			{"key": "delete"},
			{"key": "update", "settingsIndex": 2, "modifier": (response: DynamoDB.UpdateItemInput): DynamoDB.UpdateItemInput => {
				delete response.ReturnValues;
				return response;
			}},
			{"key": "condition", "settingsIndex": -1, "dynamoKey": "ConditionCheck", "function": (key: string, condition: Condition): DynamoDB.ConditionCheck => ({
				"Key": this.Document.objectToDynamo(convertObjectToKey.bind(this)(key)),
				"TableName": this.name,
				...(condition ? condition.requestObject() : {})
			} as any)}
		].reduce((accumulator, currentValue) => {
			const {key, modifier} = currentValue;
			const dynamoKey = currentValue.dynamoKey || utils.capitalize_first_letter(key);
			const settingsIndex = currentValue.settingsIndex || 1;
			const func = currentValue.function || this[key].bind(this);

			accumulator[key] = async (...args): Promise<DynamoDB.TransactWriteItem> => {
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

		const ModelStore = require("../ModelStore");
		ModelStore(this);
	}
}

Model.defaults = originalDefaults;


interface ModelGetSettings {
	return: "document" | "request";
}
Model.prototype.get = function (this: Model<DocumentCarrier>, key: InputKey, settings: ModelGetSettings = {"return": "document"}, callback): void | DynamoDB.GetItemInput | Promise<DocumentCarrier> {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": "document"};
	}

	const documentify = (document: DynamoDB.AttributeMap): Promise<DocumentCarrier> => (new this.Document((document as any), {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"});

	const getItemParams = {
		"Key": this.Document.objectToDynamo(convertObjectToKey.bind(this)(key)),
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
		return (async (): Promise<any> => {
			const response = await promise;
			return response.Item ? await documentify(response.Item) : undefined;
		})();
	}
};
interface ModelBatchGetSettings {
	return: "documents" | "request";
}
Model.prototype.batchGet = function (this: Model<DocumentCarrier>, keys: InputKey[], settings: ModelBatchGetSettings = {"return": "documents"}, callback): void | DynamoDB.BatchGetItemInput | Promise<any> {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": "documents"};
	}

	const keyObjects = keys.map((key) => convertObjectToKey.bind(this)(key));

	const documentify = (document): Promise<any> => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"});
	const prepareResponse = async (response): Promise<any> => {
		const tmpResult = await Promise.all(response.Responses[this.name].map((item) => documentify(item)));
		const unprocessedArray = response.UnprocessedKeys[this.name] ? response.UnprocessedKeys[this.name].Keys : [];
		const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Document.fromDynamo(item)));
		const startArray: any = [];
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

	const params = {
		"RequestItems": {
			[this.name]: {
				"Keys": keyObjects.map((key) => this.Document.objectToDynamo(key))
			}
		}
	};
	if (settings.return === "request") {
		if (callback) {
			callback(null, params as any);
			return;
		} else {
			return params;
		}
	}
	const promise = this.pendingTaskPromise().then(() => ddb("batchGetItem", params));

	if (callback) {
		promise.then((response) => prepareResponse(response)).then((response) => callback(null, response)).catch((error) => callback(error));
	} else {
		return (async (): Promise<any> => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

Model.prototype.create = function (this: Model<DocumentCarrier>, document, settings = {}, callback): void | Promise<any> {
	if (typeof settings === "function" && !callback) {
		callback = settings as any;
		settings = {};
	}

	return (new this.Document(document)).save({"overwrite": false, ...settings}, callback);
};
interface ModelBatchPutSettings {
	return: "response" | "request";
}
Model.prototype.batchPut = function (this: Model<DocumentCarrier>, items, settings: ModelBatchPutSettings = {"return": "response"}, callback): void | Promise<any> {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": "response"};
	}

	const prepareResponse = async (response: DynamoDB.BatchWriteItemOutput): Promise<{unprocessedItems: any[]}> => {
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

	const paramsPromise: Promise<DynamoDB.BatchWriteItemInput> = (async (): Promise<DynamoDB.BatchWriteItemInput> => ({
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
		return (async (): Promise<{unprocessedItems: any[]}> => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

interface ModelUpdateSettings {
	return: "document" | "request";
	condition?: Condition;
}
Model.prototype.update = function (this: Model<DocumentCarrier>, keyObj, updateObj, settings: ModelUpdateSettings = {"return": "document"}, callback): void | Promise<any> {
	if (typeof updateObj === "function") {
		callback = updateObj;
		updateObj = null;
		settings = {"return": "document"};
	}
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": "document"};
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
	// TODO: change the line below to not be partial
	const getUpdateExpressionObject: () => Promise<any> = async () => {
		const updateTypes = [
			{"name": "$SET", "operator": " = ", "objectFromSchemaSettings": {"validate": true, "enum": true, "forceDefault": true, "required": "nested", "modifiers": ["set"]}},
			{"name": "$ADD", "objectFromSchemaSettings": {"forceDefault": true}},
			{"name": "$REMOVE", "attributeOnly": true, "objectFromSchemaSettings": {"required": true, "defaults": true}}
		].reverse();
		const returnObject: any = await Object.keys(updateObj).reduce(async (accumulatorPromise, key) => {
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
					subValue = (await this.Document.objectFromSchema({[subKey]: dynamoType === "L" && !Array.isArray(subValue) ? [subValue] : subValue}, this, ({"type": "toDynamo", "customTypesDynamo": true, "saveUnknown": true, ...updateType.objectFromSchemaSettings} as any)))[subKey];
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
		}, Promise.resolve((async (): Promise<{ExpressionAttributeNames: any; ExpressionAttributeValues: any; UpdateExpression: any}> => {
			const obj = {
				"ExpressionAttributeNames": {},
				"ExpressionAttributeValues": {},
				"UpdateExpression": updateTypes.map((a) => a.name).reduce((accumulator, key) => {
					accumulator[key.slice(1)] = [];
					return accumulator;
				}, {})
			};

			const documentFunctionSettings = {"updateTimestamps": {"updatedAt": true}, "customTypesDynamo": true, "type": "toDynamo"};
			const defaultObjectFromSchema = await this.Document.objectFromSchema(this.Document.prepareForObjectFromSchema({}, this, (documentFunctionSettings as any)), this, (documentFunctionSettings as any));
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

		Object.values(returnObject.ExpressionAttributeNames).map((attribute: string, index) => {
			const value = Object.values(returnObject.ExpressionAttributeValues)[index];
			const valueKey = Object.keys(returnObject.ExpressionAttributeValues)[index];
			const dynamoType = this.schema.getAttributeType(attribute, (value as any), {"unknownAttributeAllowed": true});
			const attributeType = Schema.attributeTypes.findDynamoDBType(dynamoType);

			if (attributeType.toDynamo && !attributeType.isOfType(value, "fromDynamo")) {
				returnObject.ExpressionAttributeValues[valueKey] = attributeType.toDynamo(value);
			}
		});

		returnObject.ExpressionAttributeValues = this.Document.objectToDynamo(returnObject.ExpressionAttributeValues);
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

	const documentify = (document): Promise<any> => (new this.Document(document, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "type": "fromDynamo"});
	const updateItemParamsPromise: Promise<DynamoDB.UpdateItemInput> = this.pendingTaskPromise().then(async () => ({
		"Key": this.Document.objectToDynamo(keyObj),
		"ReturnValues": "ALL_NEW",
		...utils.merge_objects.main({"combineMethod": "object_combine"})((settings.condition ? settings.condition.requestObject({"index": {"start": index, "set": (i): void => {index = i;}}, "conditionString": "ConditionExpression", "conditionStringType": "string"}) : {}), await getUpdateExpressionObject()),
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
		return (async (): Promise<any> => {
			const response = await promise;
			return response.Attributes ? await documentify(response.Attributes) : undefined;
		})();
	}
};

interface ModelDeleteSettings {
	return: null | "request";
}
Model.prototype.delete = function (this: Model<DocumentCarrier>, key: InputKey, settings: ModelDeleteSettings = {"return": null}, callback): void | DynamoDB.DeleteItemInput | Promise<void> {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": null};
	}

	const deleteItemParams: DynamoDB.DeleteItemInput = {
		"Key": this.Document.objectToDynamo(convertObjectToKey.bind(this)(key)),
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
		return (async (): Promise<void> => {
			await promise;
		})();
	}
};
interface ModelBatchDeleteSettings {
	return: "response" | "request";
}
Model.prototype.batchDelete = function (this: Model<DocumentCarrier>, keys: InputKey[], settings: ModelBatchDeleteSettings = {"return": "response"}, callback): void | DynamoDB.BatchWriteItemInput | Promise<any> {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": "response"};
	}

	const keyObjects = keys.map((key) => convertObjectToKey.bind(this)(key));


	const prepareResponse = async (response): Promise<{unprocessedItems: any[]}> => {
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

	const params: DynamoDB.BatchWriteItemInput = {
		"RequestItems": {
			[this.name]: keyObjects.map((key) => ({
				"DeleteRequest": {
					"Key": this.Document.objectToDynamo(key)
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
		promise.then((response) => prepareResponse(response)).then((response) => callback(null, response as any)).catch((error) => callback(error));
	} else {
		return (async (): Promise<{unprocessedItems: any[]}> => {
			const response = await promise;
			return prepareResponse(response);
		})();
	}
};

Model.prototype.scan = function (this: Model<DocumentCarrier>, object?: ConditionInitalizer): Scan {
	return new Scan(this, object);
};
Model.prototype.query = function (this: Model<DocumentCarrier>, object?: ConditionInitalizer): Query {
	return new Query(this, object);
};

// Methods
const customMethodFunctions = (type: "model" | "document"): {set: (name: string, fn: any) => void; delete: (name: string) => void} => {
	const entryPoint = (self): any => type === "document" ? self.Document.prototype : self.Document;
	return {
		"set": function (name: string, fn): void {
			const self: any = this;
			if (!entryPoint(this)[name] || (entryPoint(this)[name][Internal.General.internalProperties] && entryPoint(this)[name][Internal.General.internalProperties].type === "customMethod")) {
				entryPoint(this)[name] = function (...args): Promise<any> {
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
		"delete": function (name: string): void {
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
