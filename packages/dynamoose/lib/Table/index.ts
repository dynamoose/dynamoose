import CustomError from "../Error";
import {CallbackType, DeepPartial, ObjectType} from "../General";
import Internal from "../Internal";
const {internalProperties} = Internal.General;
import {Model} from "../Model";
import {custom as customDefaults, original as originalDefaults} from "./defaults";
import utils from "../utils";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import {IndexItem, TableIndex} from "../Schema";
import {Item as ItemCarrier} from "../Item";
import {createTable, createTableRequest, updateTable, updateTimeToLive, waitForActive} from "./utilities";
import {TableClass} from "./types";
import {InternalPropertiesClass} from "../InternalPropertiesClass";
import {Instance} from "../Instance";

interface TableInternalProperties {
	options: TableOptions;
	name: string;
	originalName: string;

	instance: Instance;
	ready: boolean;
	alreadyCreated: boolean;
	setupFlowRunning: boolean;
	pendingTasks: any[];
	pendingTaskPromise: () => Promise<void>;
	models: any[];
	// Stores the latest result from `describeTable` for the given table
	latestTableDetails?: DynamoDB.DescribeTableOutput;

	getIndexes: () => Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}>;
	modelForObject: (object: ObjectType) => Promise<Model<ItemCarrier>>;
	getCreateTableAttributeParams: () => Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">>;
	getHashKey: () => string;
	getRangeKey: () => string;
	runSetupFlow: () => Promise<void>;
}

// This class represents a single DynamoDB table
export class Table extends InternalPropertiesClass<TableInternalProperties> {
	// transaction: any;
	static defaults: TableOptions;

	/**
	 * This method is the basic entry point for creating a table in Dynamoose.
	 *
	 * The `name` parameter is a string representing the table name.  Prefixes and suffixes may be added to this name using the `config` options.
	 *
	 * The `models` parameter is an array of [Model](/guide/Model) instances.
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const Order = dynamoose.model("Order", {"id": String});
	 * const Shipment = dynamoose.model("Shipment", {"id": String});
	 * const Table = new dynamoose.Table("Table", [Order, Shipment]);
	 * ```
	 *
	 * The `options` parameter is an optional object used to customize settings for the table.
	 *
	 * | Name | Description | Type | Default |
	 * |------|-------------|------|---------|
	 * | create | If Dynamoose should attempt to create the table on DynamoDB. This function will run a `describeTable` call first to ensure the table doesn't already exist. For production environments we recommend setting this value to `false`. | Boolean | true |
	 * | throughput | An object with settings for what the throughput for the table should be on creation, or a number which will use the same throughput for both read and write. If this is set to `ON_DEMAND` the table will use the `PAY_PER_REQUEST` billing mode. If the table is not created by Dynamoose, this object has no effect. | Object \| Number \| String |  |
	 * | throughput.read | What the read throughput should be set to. Only valid if `throughput` is an object. | Number | 1 |
	 * | throughput.write | What the write throughput should be set to. Only valid if `throughput` is an object. | Number | 1 |
	 * | prefix | A string that should be pre-pended to the table name. | String |   |
	 * | suffix | A string that should be appended to the table name. | String |   |
	 * | waitForActive | Settings for how DynamoDB should handle waiting for the table to be active before enabling actions to be run on the table. This property can also be set to `false` to easily disable the behavior of waiting for the table to be active. For production environments we recommend setting this value to `false`. | Object |  |
	 * | waitForActive.enabled | If Dynamoose should wait for the table to be active before running actions on it. | Boolean | true |
	 * | waitForActive.check | Settings for how Dynamoose should check if the table is active | Object |  |
	 * | waitForActive.check.timeout | How many milliseconds before Dynamoose should timeout and stop checking if the table is active. | Number | 180000 |
	 * | waitForActive.check.frequency | How many milliseconds Dynamoose should delay between checks to see if the table is active. If this number is set to 0 it will use `setImmediate()` to run the check again. | Number | 1000 |
	 * | update | If Dynamoose should update the capacity of the existing table to match the model throughput. If this is a boolean of `true` all update actions will be run. If this is an array of strings, only the actions in the array will be run. The array of strings can include the following settings to update, `ttl`, `indexes`, `throughput`, `tags`, `tableClass`. | Boolean \| [String] | false |
	 * | expires | The setting to describe the time to live for items created. If you pass in a number it will be used for the `expires.ttl` setting, with default values for everything else. If this is `undefined`, no time to live will be active on the model. | Number \| Object | undefined |
	 * | expires.ttl | The default amount of time the item should stay alive from creation time in milliseconds. | Number | undefined |
	 * | expires.attribute | The attribute name for where the item time to live attribute. | String | `ttl` |
	 * | expires.items | The options for items with ttl. | Object | {} |
	 * | expires.items.returnExpired | If Dynamoose should include expired items when returning retrieved items. | Boolean | true |
	 * | tags | An object containing key value pairs that should be added to the table as tags. | Object | {} |
	 * | tableClass | A string representing the table class to use. | "standard" \| "infrequentAccess" | "standard" |
	 * | initialize | If Dynamoose should run it's initialization flow (creating the table, updating the throughput, etc) automatically. | Boolean | true |
	 *
	 * The default object is listed below.
	 *
	 * ```js
	 * {
	 * 	"create": true,
	 * 	"throughput": {
	 * 		"read": 5,
	 * 		"write": 5
	 * 	}, // Same as `"throughput": 5`
	 * 	"prefix": "",
	 * 	"suffix": "",
	 * 	"waitForActive": {
	 * 		"enabled": true,
	 * 		"check": {
	 * 			"timeout": 180000,
	 * 			"frequency": 1000
	 * 		}
	 * 	},
	 * 	"update": false,
	 * 	"expires": null,
	 * 	"tags": {},
	 * 	"tableClass": "standard",
	 * 	"initialize": true
	 * }
	 * ```
	 * @param instance INTERNAL PARAMETER
	 * @param name The name of the table.
	 * @param models An array of [Model](/guide/Model.md) instances.
	 * @param options An optional object used to customize settings for the table.
	 */
	constructor (instance: Instance, name: string, models: Model[], options: TableOptionsOptional = {}) {
		super();

		// Check name argument
		if (!name) {
			throw new CustomError.InvalidParameter("Name must be passed into table constructor.");
		}
		if (typeof name !== "string") {
			throw new CustomError.InvalidParameterType("Name passed into table constructor should be of type string.");
		}
		// Check model argument
		if (!models) {
			throw new CustomError.InvalidParameter("Models must be passed into table constructor.");
		}
		if (!Array.isArray(models) || !models.every((model: any) => model.Model && model.Model instanceof Model) || models.length === 0) {
			throw new CustomError.InvalidParameterType("Models passed into table constructor should be an array of models.");
		}

		const storedOptions = utils.combine_objects(options, customDefaults.get(), originalDefaults) as TableOptions;
		this.setInternalProperties(internalProperties, {
			"options": storedOptions,
			"name": `${storedOptions.prefix}${name}${storedOptions.suffix}`,
			"originalName": name, // This represents the name before prefix and suffix were added

			instance,
			// Represents if model is ready to be used for actions such as "get", "put", etc. This property being true does not guarantee anything on the DynamoDB server. It only guarantees that Dynamoose has finished the initialization steps required to allow the model to function as expected on the client side.
			"ready": false,
			// Represents if the table in DynamoDB was created prior to initialization. This will only be updated if `create` is true.
			"alreadyCreated": false,
			"setupFlowRunning": false,
			// Represents an array of promise resolver functions to be called when Model.ready gets set to true (at the end of the setup flow)
			"pendingTasks": [],
			// Returns a promise that will be resolved after the Model is ready. This is used in all Model operations (Model.get, Item.save) to `await` at the beginning before running the AWS SDK method to ensure the Model is setup before running actions on it.
			"pendingTaskPromise": (): Promise<void> => {
				const internalPropertiesObject = this.getInternalProperties(internalProperties);
				if (internalPropertiesObject.setupFlowRunning === false && internalPropertiesObject.ready === false) {
					return Promise.reject(new CustomError.OtherError(`Table ${this.name} has not been initialized.`));
				}

				return internalPropertiesObject.ready ? Promise.resolve() : new Promise((resolve) => {
					internalPropertiesObject.pendingTasks.push(resolve);
				});
			},
			"models": models.map((model: any) => {
				if (model.Model.getInternalProperties(internalProperties)._table) {
					throw new CustomError.InvalidParameter(`Model ${model.Model.name} has already been assigned to a table.`);
				}

				model.Model.setInternalProperties(internalProperties, {
					...model.Model.getInternalProperties(internalProperties),
					"_table": this
				});
				return model;
			}),

			"getIndexes": async (): Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}> => {
				return (await Promise.all(this.getInternalProperties(internalProperties).models.map((model): Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}> => model.Model.getInternalProperties(internalProperties).getIndexes(this)))).reduce((result: {GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}, indexes: {GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}) => {
					Object.entries(indexes).forEach(([key, value]) => {
						if (key === "TableIndex") {
							result[key] = value as TableIndex;
						} else {
							result[key] = result[key] ? utils.unique_array_elements([...result[key], ...(value as IndexItem[])]) : value;
						}
					});

					return result;
				}, {});
			},
			// This function returns the best matched model for the given object input
			"modelForObject": async (object: ObjectType): Promise<Model<ItemCarrier>> => {
				const models = this.getInternalProperties(internalProperties).models;
				const modelSchemaCorrectnessScores = models.map((model) => Math.max(...model.Model.getInternalProperties(internalProperties).schemaCorrectnessScores(object)));
				const highestModelSchemaCorrectnessScore = Math.max(...modelSchemaCorrectnessScores);
				const bestModelIndex = modelSchemaCorrectnessScores.indexOf(highestModelSchemaCorrectnessScore);

				return models[bestModelIndex];
			},
			"getCreateTableAttributeParams": async (): Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">> => {
				// TODO: implement this
				return this.getInternalProperties(internalProperties).models[0].Model.getInternalProperties(internalProperties).getCreateTableAttributeParams(this);
			},
			"getHashKey": (): string => {
				return this.getInternalProperties(internalProperties).models[0].Model.getInternalProperties(internalProperties).getHashKey();
			},
			"getRangeKey": (): string => {
				return this.getInternalProperties(internalProperties).models[0].Model.getInternalProperties(internalProperties).getRangeKey();
			},
			"runSetupFlow": async (): Promise<void> => {
				if (this.getInternalProperties(internalProperties).setupFlowRunning) {
					throw new CustomError.OtherError("Setup flow is already running.");
				}

				// Setup flow
				const setupFlow = []; // An array of setup actions to be run in order
				// Create table
				if (this.getInternalProperties(internalProperties).options.create) {
					setupFlow.push(() => createTable(this));
				}
				// Wait for Active
				if (this.getInternalProperties(internalProperties).options.waitForActive === true || (this.getInternalProperties(internalProperties).options.waitForActive as TableWaitForActiveSettings).enabled) {
					setupFlow.push(() => waitForActive(this, false));
				}
				// Update Time To Live
				if ((this.getInternalProperties(internalProperties).options.create || (Array.isArray(this.getInternalProperties(internalProperties).options.update) ? (this.getInternalProperties(internalProperties).options.update as TableUpdateOptions[]).includes(TableUpdateOptions.ttl) : this.getInternalProperties(internalProperties).options.update)) && options.expires) {
					setupFlow.push(() => updateTimeToLive(this));
				}
				// Update
				if (this.getInternalProperties(internalProperties).options.update && !this.getInternalProperties(internalProperties).alreadyCreated) {
					setupFlow.push(() => updateTable(this));
				}

				// Run setup flow
				this.getInternalProperties(internalProperties).setupFlowRunning = true;
				const setupFlowPromise = setupFlow.reduce((existingFlow, flow) => {
					return existingFlow.then(() => flow()).then((flow) => {
						return typeof flow === "function" ? flow() : flow;
					});
				}, Promise.resolve());

				await setupFlowPromise;

				this.getInternalProperties(internalProperties).ready = true;
				this.getInternalProperties(internalProperties).setupFlowRunning = false;

				this.getInternalProperties(internalProperties).pendingTasks.forEach((task) => task());
				this.getInternalProperties(internalProperties).pendingTasks = [];
			}
		});

		if (!utils.all_elements_match(models.map((model: any) => model.Model.getInternalProperties(internalProperties).getHashKey()))) {
			throw new CustomError.InvalidParameter("hashKey's for all models must match.");
		}
		if (!utils.all_elements_match(models.map((model: any) => model.Model.getInternalProperties(internalProperties).getRangeKey()).filter((key) => Boolean(key)))) {
			throw new CustomError.InvalidParameter("rangeKey's for all models must match.");
		}
		if (options.expires) {
			if (typeof options.expires === "number") {
				options.expires = {
					"attribute": "ttl",
					"ttl": options.expires
				};
			}
			options.expires = utils.combine_objects(options.expires as any, {"attribute": "ttl"});

			utils.array_flatten(models.map((model: any) => model.Model.getInternalProperties(internalProperties).schemas)).forEach((schema) => {
				schema.getInternalProperties(internalProperties).schemaObject[(options.expires as TableExpiresSettings).attribute] = {
					"type": {
						"value": Date,
						"settings": {
							"storage": "seconds"
						}
					},
					"default": (): Date => new Date(Date.now() + (options.expires as TableExpiresSettings).ttl)
				};
			});
		}

		if (options.initialize === undefined || options.initialize === true) {
			this.getInternalProperties(internalProperties).runSetupFlow();
		}

		// this.transaction = [
		// 	// `function` Default: `this[key]`
		// 	// `settingsIndex` Default: 1
		// 	// `dynamoKey` Default: utils.capitalize_first_letter(key)
		// 	{"key": "get"},
		// 	{"key": "create", "dynamoKey": "Put"},
		// 	{"key": "delete"},
		// 	{"key": "update", "settingsIndex": 2, "modifier": (response: DynamoDB.UpdateItemInput): DynamoDB.UpdateItemInput => {
		// 		delete response.ReturnValues;
		// 		return response;
		// 	}},
		// 	{"key": "condition", "settingsIndex": -1, "dynamoKey": "ConditionCheck", "function": async (key: string, condition: Condition): Promise<DynamoDB.ConditionCheck> => ({
		// 		"Key": this.getInternalProperties(internalProperties).models[0].Item.objectToDynamo(this.getInternalProperties(internalProperties).convertObjectToKey(key)),
		// 		"TableName": this.getInternalProperties(internalProperties).name,
		// 		...condition ? await condition.requestObject(this) : {}
		// 	} as any)}
		// ].reduce((accumulator: ObjectType, currentValue) => {
		// 	const {key, modifier} = currentValue;
		// 	const dynamoKey = currentValue.dynamoKey || utils.capitalize_first_letter(key);
		// 	const settingsIndex = currentValue.settingsIndex || 1;
		// 	const func = currentValue.function || this[key].bind(this);

		// 	accumulator[key] = async (...args): Promise<DynamoDB.TransactWriteItem> => {
		// 		if (typeof args[args.length - 1] === "function") {
		// 			console.warn("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
		// 			args.pop();
		// 		}

		// 		if (settingsIndex >= 0) {
		// 			args[settingsIndex] = utils.merge_objects({"return": "request"}, args[settingsIndex] || {});
		// 		}
		// 		let result = await func(...args);
		// 		if (modifier) {
		// 			result = modifier(result);
		// 		}
		// 		return {[dynamoKey]: result};
		// 	};

		// 	return accumulator;
		// }, {});
	}

	/**
	 * This property is a string that represents the table's hashKey.
	 *
	 * This property is unable to be set.
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 *
	 * console.log(DynamoTable.hashKey); // id
	 * ```
	 * @readonly
	 */
	get hashKey (): string {
		return this.getInternalProperties(internalProperties).getHashKey();
	}
	/**
	 * This property is a string that represents the table's rangeKey. It is possible this value will be `undefined` if your table doesn't have a range key.
	 *
	 * This property is unable to be set.
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 *
	 * console.log(DynamoTable.rangeKey); // data
	 * ```
	 * @readonly
	 */
	get rangeKey (): string | undefined {
		return this.getInternalProperties(internalProperties).getRangeKey();
	}
	/**
	 * This property is a string that represents the table name. The result will include all prefixes and suffixes.
	 *
	 * This property is unable to be set.
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 *
	 * console.log(DynamoTable.name); // Table
	 * ```
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"prefix": "MyApp_"});
	 *
	 * console.log(DynamoTable.name); // MyApp_Table
	 * ```
	 * @readonly
	 */
	get name (): string {
		return this.getInternalProperties(internalProperties).name;
	}

	create (): Promise<void>;
	create (callback: CallbackType<void, any>): void;
	create (settings: TableCreateOptions): Promise<void>;
	create (settings: TableCreateOptions, callback: CallbackType<void, any>): void;
	create (settings: TableCreateOptions & {return: "request"}): Promise<DynamoDB.CreateTableInput>;
	create (settings: TableCreateOptions & {return: "request"}, callback: CallbackType<DynamoDB.CreateTableInput, any>): void;
	/**
	 * This method can be used to manually create the given table. You can also pass a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format.
	 *
	 * The `config` parameter is an optional object used to customize settings for the model.
	 *
	 * | Name | Description | Type | Default |
	 * |------|-------------|------|---------|
	 * | return | What Dynamoose should return. Either a string `request`, or `undefined`. If `request` is passed in, the request object will be returned and no request will be made to DynamoDB. If `undefined` is passed in, the request will be sent to DynamoDB and the table will attempt to be created. | String \| `undefined` | `undefined` |
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 *
	 * try {
	 * 	await DynamoTable.create();
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 *
	 * // OR
	 *
	 * DynamoTable.create((error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Successfully created table");
	 * 	}
	 * });
	 * ```
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 *
	 * try {
	 * 	const request = await DynamoTable.create({"return": "request"});
	 * 	console.log("DynamoTable create request object:", request);
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 *
	 * // OR
	 *
	 * DynamoTable.create({"return": "request"}, (error, request) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("DynamoTable create request object:", request);
	 * 	}
	 * });
	 * ```
	 * @param settings Table creation settings.
	 * @param callback Callback function.
	 * @returns void | Promise<DynamoDB.CreateTableInput | void>
	 */
	create (settings?: TableCreateOptions | CallbackType<void, any>, callback?: CallbackType<DynamoDB.CreateTableInput, any> | CallbackType<void, any>): void | Promise<DynamoDB.CreateTableInput | void> {
		if (typeof settings === "function") {
			callback = settings;
		}

		const promise = (settings as TableCreateOptions)?.return === "request" ? createTableRequest(this) : createTable(this, true);

		if (callback) {
			promise.then((response) => callback(null, response)).catch((error) => callback(error));
		} else {
			return promise;
		}
	}

	/**
	 * This method will run Dynamoose's initialization flow. The actions run will be based on your tables options at initialization.
	 *
	 * - `create`
	 * - `waitForActive`
	 * - `update`
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"initialize": false});
	 * await DynamoTable.initialize();
	 * ```
	 * @returns Promise\<void\>
	 */
	initialize (): Promise<void>;
	/**
	 * This method will run Dynamoose's initialization flow. The actions run will be based on your tables options at initialization.
	 *
	 * - `create`
	 * - `waitForActive`
	 * - `update`
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"initialize": false});
	 * DynamoTable.initialize((error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Successfully initialized table");
	 * 	}
	 * });
	 * ```
	 * @param callback Function - `(error: any, response: void): void`
	 */
	initialize (callback: CallbackType<any, void>): void;
	/**
	 * This method will run Dynamoose's initialization flow. The actions run will be based on your tables options at initialization.
	 *
	 * - `create`
	 * - `waitForActive`
	 * - `update`
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"initialize": false});
	 * await DynamoTable.initialize();
	 * ```
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"initialize": false});
	 * DynamoTable.initialize((error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Successfully initialized table");
	 * 	}
	 * });
	 * ```
	 * @param callback Function - `(error: any, response: void): void`
	 * @returns Promise<void> | void
	 */
	async initialize (callback?: CallbackType<any, void>): Promise<void> {
		if (callback) {
			this.getInternalProperties(internalProperties).runSetupFlow().then(() => callback(null)).catch((error) => callback(error));
		} else {
			return this.getInternalProperties(internalProperties).runSetupFlow();
		}
	}
}
Table.defaults = originalDefaults;


interface TableCreateOptions {
	return: "request" | undefined;
}

export interface TableWaitForActiveSettings {
	enabled: boolean;
	check: {timeout: number; frequency: number};
}
export interface TableExpiresSettings {
	ttl: number;
	attribute: string;
	items?: {
		returnExpired: boolean;
	};
}
export enum TableUpdateOptions {
	ttl = "ttl",
	indexes = "indexes",
	throughput = "throughput",
	tags = "tags",
	tableClass = "tableClass"
}
export interface TableOptions {
	create: boolean;
	throughput: "ON_DEMAND" | number | {read: number; write: number};
	prefix: string;
	suffix: string;
	waitForActive: boolean | TableWaitForActiveSettings;
	update: boolean | TableUpdateOptions[];
	populate: string | string[] | boolean;
	expires: number | TableExpiresSettings;
	tags: {[key: string]: string};
	tableClass: TableClass;
	initialize: boolean;
}
export type TableOptionsOptional = DeepPartial<TableOptions>;
