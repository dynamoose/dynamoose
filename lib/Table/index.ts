import {CustomError} from "../Error";
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
	 * This property is a string that represents the table name. The result will include all prefixes and suffixes.
	 *
	 * This property is unable to be set.
	 *
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model]);
	 * console.log(DynamoTable.name); // Table
	 * ```
	 * --
	 * ```js
	 * const DynamoTable = new dynamoose.Table("Table", [Model], {"prefix": "MyApp_"});
	 * console.log(DynamoTable.name); // MyApp_Table
	 * ```
	 * @readonly
	 */
	name: string;

	constructor (instance: Instance, name: string, models: Model[], options: TableOptionsOptional) {
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
				return this.getInternalProperties(internalProperties).ready ? Promise.resolve() : new Promise((resolve) => {
					this.getInternalProperties(internalProperties).pendingTasks.push(resolve);
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

		Object.defineProperty(this, "name", {
			"configurable": false,
			"value": this.getInternalProperties(internalProperties).name
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
	 * console.log(DynamoTable.hashKey); // id
	 * ```
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
	 * console.log(DynamoTable.rangeKey); // data
	 * ```
	 */
	get rangeKey (): string | undefined {
		return this.getInternalProperties(internalProperties).getRangeKey();
	}

	create (): Promise<void>;
	create (callback: CallbackType<void, any>): void;
	create (settings: TableCreateOptions): Promise<void>;
	create (settings: TableCreateOptions, callback: CallbackType<void, any>): void;
	create (settings: TableCreateOptions & {return: "request"}): Promise<DynamoDB.CreateTableInput>;
	create (settings: TableCreateOptions & {return: "request"}, callback: CallbackType<DynamoDB.CreateTableInput, any>): void;
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
