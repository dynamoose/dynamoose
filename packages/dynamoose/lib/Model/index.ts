import CustomError from "../Error";
import ModelStore from "../ModelStore";
import {Schema, SchemaDefinition, DynamoDBSetTypeResult, ValueType, IndexItem, TableIndex} from "../Schema";
import {Item as ItemCarrier, ItemSaveSettings, ItemSettings, ItemObjectFromSchemaSettings, AnyItem} from "../Item";
import utils from "../utils";
import ddb from "../aws/ddb/internal";
import awsConverter from "../aws/converter";
import Internal from "../Internal";
import {Serializer, SerializerOptions} from "../Serializer";
import {Condition, ConditionInitializer} from "../Condition";
import {Scan, Query} from "../ItemRetriever";
import {CallbackType, ObjectType, FunctionType, ItemArray, ModelType, KeyObject, InputKey} from "../General";
import {PopulateItems} from "../Populate";
import {AttributeMap} from "../Types";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import {GetTransactionInput, CreateTransactionInput, DeleteTransactionInput, UpdateTransactionInput, ConditionTransactionInput} from "../Transaction";
import {Table, TableOptionsOptional} from "../Table";
import type from "../type";
import {InternalPropertiesClass} from "../InternalPropertiesClass";
import {Instance} from "../Instance";
import returnModel from "../utils/dynamoose/returnModel";
import {LRUCache} from "../utils/LRUCache";
const {internalProperties} = Internal.General;

// Path parsing types and functions for array indexing support
interface PathSegment {
	type: "attribute" | "index";
	value: string | number;
}

/**
 * Parses a path that may contain array indices and dot notation
 * Examples:
 * 'keywords[0]' -> [{type: 'attribute', value: 'keywords'}, {type: 'index', value: 0}]
 * 'reps[0].name' -> [{type: 'attribute', value: 'reps'}, {type: 'index', value: 0}, {type: 'attribute', value: 'name'}]
 * 'data.items[1].tags[2]' -> [{type: 'attribute', value: 'data'}, {type: 'attribute', value: 'items'},
 *                              {type: 'index', value: 1}, {type: 'attribute', value: 'tags'}, {type: 'index', value: 2}]
 */
function parsePathWithArrayIndices(path: string): PathSegment[] {
	const segments: PathSegment[] = [];
	let current = "";
	let i = 0;

	while (i < path.length) {
		const char = path[i];

		if (char === "[") {
			// We've hit an array index, save current attribute if any
			if (current) {
				segments.push({"type": "attribute", "value": current});
				current = "";
			}

			// Find the closing bracket
			const closeBracket = path.indexOf("]", i);
			if (closeBracket === -1) {
				throw new Error(`Invalid path: unclosed bracket in '${path}'`);
			}

			// Extract and validate the index
			const indexStr = path.substring(i + 1, closeBracket);
			validateArrayIndex(indexStr, path);
			segments.push({"type": "index", "value": parseInt(indexStr, 10)});

			i = closeBracket + 1;

			// Skip dot after bracket if present
			if (i < path.length && path[i] === ".") {
				i++;
			}
		} else if (char === ".") {
			// Dot separator - save current attribute
			if (current) {
				segments.push({"type": "attribute", "value": current});
				current = "";
			}
			i++;
		} else {
			// Regular character - accumulate
			current += char;
			i++;
		}
	}

	// Add any remaining attribute
	if (current) {
		segments.push({"type": "attribute", "value": current});
	}

	return segments;
}

/**
 * Validates an array index string
 */
function validateArrayIndex(indexStr: string, fullPath: string): void {
	if (!indexStr) {
		throw new Error(`Invalid array index in path '${fullPath}': array index cannot be empty`);
	}
	if (!/^\d+$/.test(indexStr)) {
		throw new Error(`Invalid array index in path '${fullPath}': '${indexStr}' must be numeric`);
	}
	const index = parseInt(indexStr, 10);
	if (index < 0) {
		throw new Error(`Invalid array index in path '${fullPath}': index must be non-negative`);
	}
}

/**
 * Validates REMOVE operations for DynamoDB limitations
 */
function validateRemoveOperation(path: string, updateType: string): void {
	// DynamoDB limitation: Cannot REMOVE properties from objects within lists
	if (updateType === "$REMOVE" && /\[\d+\]\.[^.[]+/.test(path)) {
		throw new Error(
			"DynamoDB does not support removing properties from objects within lists. " +
			`Path '${path}' attempts to remove a property from a list element. ` +
			"To modify an object in a list, use SET to replace the entire object with the property removed."
		);
	}
}

export type UpdatePartial<T> = Partial<T> & {
	$SET?: Partial<T>;
	$ADD?: Partial<T>;
	$REMOVE?: Partial<T> | string[];
	$DELETE?: Partial<T>;
};

// Transactions
type GetTransactionResult = Promise<GetTransactionInput>;
type CreateTransactionResult = Promise<CreateTransactionInput>;
type DeleteTransactionResult = Promise<DeleteTransactionInput>;
type UpdateTransactionResult = Promise<UpdateTransactionInput>;
type ConditionTransactionResult = Promise<ConditionTransactionInput>;

export interface GetTransaction {
	(key: InputKey): GetTransactionResult;
	(key: InputKey, settings?: ModelGetSettings): GetTransactionResult;
	(key: InputKey, settings: ModelGetSettings & {return: "item"}): GetTransactionResult;
	(key: InputKey, settings: ModelGetSettings & {return: "request"}): GetTransactionResult;
}
export interface CreateTransaction {
	(item: ObjectType): CreateTransactionResult;
	(item: ObjectType, settings: ItemSaveSettings & {return: "request"}): CreateTransactionResult;
	(item: ObjectType, settings: ItemSaveSettings & {return: "item"}): CreateTransactionResult;
	(item: ObjectType, settings?: ItemSaveSettings): CreateTransactionResult;
}
export interface DeleteTransaction {
	(key: InputKey): DeleteTransactionResult;
	(key: InputKey, settings: ModelDeleteSettings & {return: "request"}): DeleteTransactionResult;
	(key: InputKey, settings: ModelDeleteSettings & {return: null}): DeleteTransactionResult;
	(key: InputKey, settings?: ModelDeleteSettings): DeleteTransactionResult;
}
export interface UpdateTransaction {
	(obj: ObjectType): CreateTransactionResult;
	(keyObj: ObjectType, updateObj: ObjectType): UpdateTransactionResult;
	(keyObj: ObjectType, updateObj: ObjectType, settings: ModelUpdateSettings & {"return": "item"}): UpdateTransactionResult;
	(keyObj: ObjectType, updateObj: ObjectType, settings: ModelUpdateSettings & {"return": "request"}): UpdateTransactionResult;
	(keyObj: ObjectType, updateObj?: ObjectType, settings?: ModelUpdateSettings): UpdateTransactionResult;
}
export interface ConditionTransaction {
	(key: InputKey, condition: Condition): ConditionTransactionResult;
}

type TransactionType = {
	get: GetTransaction;
	create: CreateTransaction;
	delete: DeleteTransaction;
	update: UpdateTransaction;
	condition: ConditionTransaction;
};

export interface schemaCorrectnessScoresSettings {
	considerDefaults?: boolean
}

export interface ModelGetSettings {
	return?: "item" | "request";
	attributes?: string[];
	consistent?: boolean;
}
export interface ModelDeleteSettings {
	return?: null | "request";
	condition?: Condition;
}
export interface ModelBatchPutSettings {
	return?: "response" | "request";
}
export interface ModelUpdateSettings {
	return?: "item" | "request";
	condition?: Condition;
	returnValues?: DynamoDB.ReturnValue;
}
export interface ModelBatchGetItemsResponse<T> extends ItemArray<T> {
	unprocessedKeys: ObjectType[];
}
export interface ModelBatchGetSettings {
	return?: "items" | "request";
	attributes?: string[];
	consistent?: boolean;
}
export interface ModelBatchDeleteSettings {
	return?: "response" | "request";
}
export interface ModelIndexes {
	TableIndex?: TableIndex;
	GlobalSecondaryIndexes?: IndexItem[];
	LocalSecondaryIndexes?: IndexItem[];
}

export interface ModelTableOptions extends TableOptionsOptional {
	tableName?: string;
}

interface ModelInternalProperties {
	name: string;
	options: TableOptionsOptional;
	getIndexes: () => Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}>;
	convertKeyToObject: (key: InputKey) => Promise<KeyObject>;
	schemaCorrectnessScores: (object: ObjectType) => number[];
	schemaForObject: (object: ObjectType) => Schema;
	dynamoPropertyForAttribute: (attribute: string) => Promise<string>;
	getCreateTableAttributeParams: () => Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">>;
	getHashKey: () => string;
	getRangeKey: () => string | void;
	table: () => Table;
	tableName: string;

	schemas: Schema[];
	/**
	 * This should never be called directly. Use `table()` instead.
	 */
	_table?: Table;

	// Performance optimization caches
	schemaAttributesCache?: Set<string>;
	updateTypesMapCache?: Map<string, any>;
	updateTypeNamesCache?: string[];
	convertKeyToObjectCache?: LRUCache<string, KeyObject>;
	attributeTypeCache?: LRUCache<string, any>;
}

// Model represents a single entity (ex. User, Movie, Video, Order)
export class Model<T extends ItemCarrier = AnyItem> extends InternalPropertiesClass<ModelInternalProperties> {
	/**
	 * This method is the basic entry point for creating a model in Dynamoose. When you call this method a new model is created, and it returns an item initializer that you can use to create instances of the given model.
	 *
	 * The `name` parameter is a string representing the model name.
	 *
	 * The `schema` parameter can either be an object OR a [Schema](Schema.md) instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.
	 *
	 * The `options` parameter is the same as the options that are passed to the [Table](Table.md) constructor except it takes additional argument `tableName`:
	 *
	 * | Name | Description | Type | Default |
	 * |------|-------------|------|---------|
	 * | tableName | Optional table name to overwrite the default one that is equals to a model name. It respects both `prefix` and `suffix` provided locally or globally. The main goal of this option is to store multiple models within single table to conform the DynamoDB's single table design approach. | String | undefined |
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const Cat = dynamoose.model("Cat", {"name": String});
	 *
	 * const Cat = dynamoose.model("Cat", new dynamoose.Schema({"name": String}));
	 * ```
	 *
	 * An optional TypeScript class which extends `Item` can be provided right before the function bracket. This provides type checking when using operations like `Model.create()`.
	 *
	 * ```ts
	 * import * as dynamoose from "dynamoose";
	 * import {Item} from "dynamoose/dist/Item";
	 *
	 * // Strongly typed model
	 * class Cat extends Item {
	 * 	id: number;
	 * 	name: string;
	 * }
	 * const CatModel = dynamoose.model<Cat>("Cat", {"id": Number, "name": String});
	 *
	 * // Will raise type checking error as random is not a valid field.
	 * CatModel.create({"id": 1, "random": "string"});
	 *
	 * // Will return the correct type of Cat
	 * const cat = await CatModel.get(1);
	 * ```
	 *
	 * You can also pass in an array of Schema instances or schema objects into the `schema` parameter. This is useful for cases of single table design where you want one model to have multiple options for a schema. Behind the scenes Dynamoose will automatically pick the closest schema to match to your item, and use that schema for all operations pertaining to that item. If no matching schema can be found, it will default to the first schema in the array.
	 *
	 * :::note
	 * If you use multiple schemas in one model, the hash & range keys must match for all schemas.
	 * :::
	 *
	 * ```js
	 * const Cat = dynamoose.model("Cat", [
	 * 	new dynamoose.Schema({"id": String, "name": String}),
	 * 	{"id": String, "age": Number}
	 * ]);
	 * ```
	 *
	 * If you don't pass the `schema` parameter it is required that you have an existing model already registered with that name. This will use the existing model already registered.
	 *
	 * ```js
	 * const Cat = dynamoose.model("Cat"); // Will reference existing model, or if no model exists already with name `Cat` it will throw an error.
	 * ```
	 *
	 * If you choose to pass the model into a [`Table`](Table.md) constructor, you must ensure that you don't use the model for any DynamoDB requests before initializing the table.
	 * @param name The name of the model.
	 * @param schema The schema for the model.
	 * @param options The options for the model. This is the same type as `Table` options.
	 * @param _ModelStore INTERNAL PARAMETER
	 */
	constructor (name: string, schema: Schema | SchemaDefinition | (Schema | SchemaDefinition)[], options: ModelTableOptions, _ModelStore: typeof ModelStore) {
		super();

		// Methods
		this.setInternalProperties(internalProperties, {
			name,
			options,
			"getIndexes": async (): Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]; TableIndex?: any}> => {
				return (await Promise.all(this.getInternalProperties(internalProperties).schemas.map((schema) => schema.getIndexes(this)))).reduce((result, indexes) => {
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
			"convertKeyToObject": async (key: InputKey): Promise<KeyObject> => {
				let keyObject: KeyObject;
				const hashKey = this.getInternalProperties(internalProperties).getHashKey();
				const objectFromSchemaSettings: ItemObjectFromSchemaSettings = {"type": "toDynamo", "modifiers": ["set"], "typeCheck": false, "mapAttributes": true};
				if (typeof key === "object") {
					// If we passed aliased attribute names, we need to get them back to the key names
					const mappedKey = await this.Item.objectFromSchema(key, this, objectFromSchemaSettings);
					const rangeKey = this.getInternalProperties(internalProperties).getRangeKey();
					keyObject = {
						[hashKey]: mappedKey[hashKey]
					};
					if (rangeKey && typeof mappedKey[rangeKey] !== "undefined" && mappedKey[rangeKey] !== null) {
						keyObject[rangeKey] = mappedKey[rangeKey];
					}
				} else {
					keyObject = await this.Item.objectFromSchema({
						[hashKey]: key
					}, this, objectFromSchemaSettings);
				}
				return keyObject;
			},
			"schemaCorrectnessScores": (object: ObjectType): number[] => {
				const schemaCorrectnessScores: number[] = this.getInternalProperties(internalProperties).schemas.map((schema) => {
					const typePaths = schema.getTypePaths(object, {"type": "toDynamo", "includeAllProperties": true});
					const multipleTypeKeys: string[] = Object.keys(typePaths).filter((key) => typeof typePaths[key] === "number");
					multipleTypeKeys.forEach((key) => {
						// TODO: Ideally at some point we'd move this code into the `schema.getTypePaths` method, but that breaks some other things, so holding off on that for now.
						typePaths[key] = {
							"index": typePaths[key],
							"matchCorrectness": 1,
							"entryCorrectness": [1]
						};
					});
					return typePaths;
				}).map((obj) => Object.values(obj).map((obj) => (obj as any)?.matchCorrectness || 0)).map((array) => Math.min(...array));

				return schemaCorrectnessScores;
			},
			// This function returns the best matched schema for the given object input
			"schemaForObject": (object: ObjectType): Schema => {
				const schemas = this.getInternalProperties(internalProperties).schemas;

				if (schemas.length === 1) {
					return schemas[0];
				}

				const schemaCorrectnessScores = this.getInternalProperties(internalProperties).schemaCorrectnessScores(object);
				const highestSchemaCorrectnessScoreIndex: number = schemaCorrectnessScores.indexOf(Math.max(...schemaCorrectnessScores));

				return schemas[highestSchemaCorrectnessScoreIndex];
			},
			// This function returns the DynamoDB property name for a given attribute (alias or property name). For example if you have a `pk` with an alias of `userID` and pass in `userID` it will return `pk`. If you pass in `pk` it will return `pk`.
			"dynamoPropertyForAttribute": async (attribute: string): Promise<string> => {
				const obj = await Item.objectFromSchema({[attribute]: true}, this, {"type": "toDynamo", "modifiers": ["set"], "typeCheck": false, "mapAttributes": true});
				return Object.keys(obj)[0];
			},
			"getCreateTableAttributeParams": async (): Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">> => {
				const schemas = this.getInternalProperties(internalProperties).schemas as Schema[];
				const createTableAttributeParams = await Promise.all(schemas.map((schema) => schema.getCreateTableAttributeParams(this)));

				return utils.merge_objects.main({
					"combineMethod": utils.merge_objects.MergeObjectsCombineMethod.ArrayMerge,
					"arrayItemsMerger": utils.merge_objects.schemaAttributesMerger
				})(...createTableAttributeParams);
			},
			"getHashKey": (): string => {
				return this.getInternalProperties(internalProperties).schemas[0].hashKey;
			},
			"getRangeKey": (): string | void => {
				return this.getInternalProperties(internalProperties).schemas[0].rangeKey;
			},
			"table": (): Table => {
				const table = this.getInternalProperties(internalProperties)._table;
				if (!table) {
					const modelObject = returnModel(this);
					const createdTable = new Table(Instance.default, this.getInternalProperties(internalProperties).tableName, [modelObject], this.getInternalProperties(internalProperties).options);
					this.getInternalProperties(internalProperties)._table = createdTable;
					return createdTable;
				}

				return table;
			},
			"tableName": options?.tableName || name,
			"schemas": []
		});

		let realSchemas: Schema[];
		if (!schema || Array.isArray(schema) && schema.length === 0) {
			throw new CustomError.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse "dynamoose.model(name, schema)"`);
		} else if (!(schema instanceof Schema)) {
			if (Array.isArray(schema)) {
				realSchemas = schema.map((schema: Schema | SchemaDefinition): Schema => schema instanceof Schema ? schema : new Schema(schema));
			} else {
				realSchemas = [new Schema(schema)];
			}
		} else {
			realSchemas = [schema];
		}
		if (!utils.all_elements_match(realSchemas.map((schema) => schema.hashKey))) {
			throw new CustomError.InvalidParameter("hashKey's for all schema's must match.");
		}
		if (!utils.all_elements_match(realSchemas.map((schema) => schema.rangeKey).filter((key) => Boolean(key)))) {
			throw new CustomError.InvalidParameter("rangeKey's for all schema's must match.");
		}

		this.setInternalProperties(internalProperties, {
			...this.getInternalProperties(internalProperties),
			"schemas": realSchemas
		});

		const self: Model<ItemCarrier> = this;
		class Item extends ItemCarrier {
			static Model: Model<ItemCarrier>;
			constructor (object: AttributeMap | ObjectType = {}, settings: ItemSettings = {}) {
				super(self, utils.deep_copy(object), settings);
			}
		}
		Item.Model = self;
		this.Item = Item;

		this.serializer = new Serializer();

		(this.Item as any).transaction = [
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
			{"key": "condition", "settingsIndex": -1, "dynamoKey": "ConditionCheck", "function": async (key: string, condition: Condition): Promise<DynamoDB.ConditionCheck> => ({
				"Key": this.Item.objectToDynamo(await this.getInternalProperties(internalProperties).convertKeyToObject(key)),
				"TableName": this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).name,
				...condition ? await condition.getInternalProperties(internalProperties).requestObject(this) : {}
			} as any)}
		].reduce((accumulator: ObjectType, currentValue) => {
			const {key, modifier} = currentValue;
			const dynamoKey = currentValue.dynamoKey || utils.capitalize_first_letter(key);
			const settingsIndex = currentValue.settingsIndex || 1;
			const func = currentValue.function || this[key].bind(this);

			accumulator[key] = async (...args): Promise<DynamoDB.TransactWriteItem> => {
				if (typeof args[args.length - 1] === "function") {
					console.warn("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments."); // eslint-disable-line no-console
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

		_ModelStore(this);

		// This code attaches `this` model to an existing table instance created by other model with the same tableName.
		const modelsOfTable = _ModelStore.forTableName(this.getInternalProperties(internalProperties).tableName);
		const otherModelWithTable = modelsOfTable.find((model) => model !== this && model.table());
		const table = otherModelWithTable?.table();

		if (table) {
			table.setInternalProperties(internalProperties, {
				...table.getInternalProperties(internalProperties),
				"models": modelsOfTable.map(returnModel)
			});

			this.getInternalProperties(internalProperties)._table = table;
		}
	}

	/**
	 * This property is a string that represents the model name.
	 *
	 * This property is unable to be set.
	 *
	 * ```js
	 * const User = dynamoose.model("User", {"id": String});
	 *
	 * console.log(User.name); // User
	 * ```
	 * @readonly
	 */
	get name (): string {
		return this.getInternalProperties(internalProperties).name;
	}

	/**
	 * This function will return the [`Table`](Table.md) instance for the model.
	 *
	 * If a Table instance hasn't been created yet for this model, it will be created when calling this function.
	 *
	 * ```js
	 * const User = dynamoose.model("User", {"id": String});
	 *
	 * console.log(User.table().hashKey); // id
	 * ```
	 */
	table (): Table {
		return this.getInternalProperties(internalProperties).table();
	}

	// originalName: string; // Name without prefixes
	// options: ModelOptions;
	// schemas: Schema[];
	serializer: Serializer;
	// private ready: boolean;
	// alreadyCreated: boolean;
	// private pendingTasks: ((value?: void | PromiseLike<void>) => void)[];
	// latestTableDetails: DynamoDB.DescribeTableOutput;
	// pendingTaskPromise: () => Promise<void>;
	Item: typeof ItemCarrier;
	scan: (object?: ConditionInitializer) => Scan<T>;
	query: (object?: ConditionInitializer) => Query<T>;
	methods: { item: { set: (name: string, fn: FunctionType) => void; delete: (name: string) => void }; set: (name: string, fn: FunctionType) => void; delete: (name: string) => void };
	transaction: TransactionType;

	// Batch Get
	batchGet (keys: InputKey[]): Promise<ModelBatchGetItemsResponse<T>>;
	batchGet (keys: InputKey[], callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings & {"return": "request"}): Promise<DynamoDB.BatchGetItemInput>;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings & {"return": "request"}, callback: CallbackType<DynamoDB.BatchGetItemInput, any>): void;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings): Promise<ModelBatchGetItemsResponse<T>>;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings, callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings & {"return": "items"}): Promise<ModelBatchGetItemsResponse<T>>;
	batchGet (keys: InputKey[], settings: ModelBatchGetSettings & {"return": "items"}, callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
	batchGet (keys: InputKey[], settings?: ModelBatchGetSettings | CallbackType<ModelBatchGetItemsResponse<T>, any> | CallbackType<DynamoDB.BatchGetItemInput, any>, callback?: CallbackType<ModelBatchGetItemsResponse<T>, any> | CallbackType<DynamoDB.BatchGetItemInput, any>): void | Promise<DynamoDB.BatchGetItemInput> | Promise<ModelBatchGetItemsResponse<T>> {
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": "items"};
		}
		if (typeof settings === "undefined") {
			settings = {"return": "items"};
		}

		const table = this.getInternalProperties(internalProperties).table();
		const {instance} = table.getInternalProperties(internalProperties);

		const keyObjects = keys.map(async (key) => this.getInternalProperties(internalProperties).convertKeyToObject(key));

		const readStrict = this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.readStrict;
		const itemify = (item: AttributeMap): Promise<ItemCarrier> => new this.Item(item as any, {"type": "fromDynamo"}).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo", "readStrict": readStrict});
		const prepareResponse = async (response: DynamoDB.BatchGetItemOutput): Promise<ModelBatchGetItemsResponse<ItemCarrier>> => {
			const tmpResult = await Promise.all(response.Responses[table.getInternalProperties(internalProperties).name].map((item) => itemify(item)));
			const unprocessedArray = response.UnprocessedKeys[table.getInternalProperties(internalProperties).name] ? response.UnprocessedKeys[this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).name].Keys : [];
			const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Item.fromDynamo(item)));
			const startArray: ModelBatchGetItemsResponse<ItemCarrier> = Object.assign([], {
				"unprocessedKeys": [],
				"populate": PopulateItems,
				"toJSON": utils.dynamoose.itemToJSON
			});
			return (await Promise.all(keyObjects)).reduce((result, key) => {
				const keyProperties = Object.keys(key);
				const item = tmpResult.find((item) => keyProperties.every((keyProperty) => item[keyProperty] === key[keyProperty]));
				if (item) {
					result.push(item);
				} else {
					const item = tmpResultUnprocessed.find((item) => keyProperties.every((keyProperty) => item[keyProperty] === key[keyProperty]));
					if (item) {
						result.unprocessedKeys.push(item);
					}
				}
				return result;
			}, startArray);
		};

		const getParams = async (settings: ModelBatchGetSettings): Promise<DynamoDB.BatchGetItemInput> => {
			const params: DynamoDB.BatchGetItemInput = {
				"RequestItems": {
					[table.getInternalProperties(internalProperties).name]: {
						"Keys": (await Promise.all(keyObjects)).map((key) => this.Item.objectToDynamo(key))
					}
				}
			};

			if (settings.consistent !== undefined && settings.consistent !== null) {
				params.RequestItems[table.getInternalProperties(internalProperties).name].ConsistentRead = settings.consistent;
			}
			if (settings.attributes) {
				params.RequestItems[table.getInternalProperties(internalProperties).name].AttributesToGet = settings.attributes;
			}

			return params;
		};
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.BatchGetItemInput, any> = callback as CallbackType<DynamoDB.BatchGetItemInput, any>;
				getParams(settings).then((params) => localCallback(null, params)).catch((err) => localCallback(err));
				return;
			} else {
				return (async (): Promise<DynamoDB.BatchGetItemInput> => {
					const response = await getParams(settings);
					return response;
				})();
			}
		}
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => getParams(settings as ModelBatchGetSettings)).then((params) => ddb(instance, "batchGetItem", params));

		if (callback) {
			const localCallback: CallbackType<ItemCarrier[], any> = callback as CallbackType<ItemCarrier[], any>;
			promise.then((response) => prepareResponse(response)).then((response) => localCallback(null, response)).catch((error) => localCallback(error));
		} else {
			return (async (): Promise<ModelBatchGetItemsResponse<T>> => {
				const response = await promise;
				return prepareResponse(response) as Promise<ModelBatchGetItemsResponse<T>>;
			})();
		}
	}

	// Batch Put
	batchPut (items: ObjectType[]): Promise<{"unprocessedItems": ObjectType[]}>;
	batchPut (items: ObjectType[], callback: CallbackType<{"unprocessedItems": ObjectType[]}, any>): void;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings & {"return": "request"}): Promise<DynamoDB.BatchWriteItemInput>;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings & {"return": "request"}, callback: CallbackType<DynamoDB.BatchWriteItemInput, any>): void;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings): Promise<{"unprocessedItems": ObjectType[]}>;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings, callback: CallbackType<{"unprocessedItems": ObjectType[]}, any>): void;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings & {"return": "response"}): Promise<{"unprocessedItems": ObjectType[]}>;
	batchPut (items: ObjectType[], settings: ModelBatchPutSettings & {"return": "response"}, callback: CallbackType<{"unprocessedItems": ObjectType[]}, any>): void;
	batchPut (items: ObjectType[], settings?: ModelBatchPutSettings | CallbackType<{"unprocessedItems": ObjectType[]}, any> | CallbackType<DynamoDB.BatchWriteItemInput, any>, callback?: CallbackType<{"unprocessedItems": ObjectType[]}, any> | CallbackType<DynamoDB.BatchWriteItemInput, any>): void | Promise<DynamoDB.BatchWriteItemInput | {"unprocessedItems": ObjectType[]}> {
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": "response"};
		}
		if (typeof settings === "undefined") {
			settings = {"return": "response"};
		}

		const table = this.getInternalProperties(internalProperties).table();

		const prepareResponse = async (response: DynamoDB.BatchWriteItemOutput): Promise<{unprocessedItems: ObjectType[]}> => {
			const unprocessedArray = response.UnprocessedItems && response.UnprocessedItems[table.getInternalProperties(internalProperties).name] ? response.UnprocessedItems[this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).name] : [];
			const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Item.fromDynamo(item.PutRequest.Item)));
			return items.reduce((result: {unprocessedItems: ObjectType[]}, item) => {
				const unprocessedItem = tmpResultUnprocessed.find((searchItem) => Object.keys(item).every((keyProperty) => searchItem[keyProperty] === item[keyProperty]));
				if (unprocessedItem) {
					result.unprocessedItems.push(unprocessedItem);
				}
				return result;
			}, {"unprocessedItems": []}) as {unprocessedItems: ObjectType[]};
		};

		const paramsPromise: Promise<DynamoDB.BatchWriteItemInput> = (async (): Promise<DynamoDB.BatchWriteItemInput> => ({
			"RequestItems": {
				[table.getInternalProperties(internalProperties).name]: await Promise.all(items.map(async (item) => ({
					"PutRequest": {
						"Item": await new this.Item(item as any).toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "combine": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"], "mapAttributes": true})
					}
				})))
			}
		}))();
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.BatchWriteItemInput, any> = callback as CallbackType<DynamoDB.BatchWriteItemInput, any>;
				paramsPromise.then((result) => localCallback(null, result));
				return;
			} else {
				return paramsPromise;
			}
		}
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => paramsPromise).then((params) => ddb(table.getInternalProperties(internalProperties).instance, "batchWriteItem", params));

		if (callback) {
			const localCallback: CallbackType<{"unprocessedItems": ObjectType[]}, any> = callback as CallbackType<{"unprocessedItems": ObjectType[]}, any>;
			promise.then((response) => prepareResponse(response)).then((response) => localCallback(null, response)).catch((error) => callback(error));
		} else {
			return (async (): Promise<{unprocessedItems: ObjectType[]}> => {
				const response = await promise;
				return prepareResponse(response);
			})();
		}
	}

	// Batch Delete
	batchDelete (keys: InputKey[]): Promise<{unprocessedItems: ObjectType[]}>;
	batchDelete (keys: InputKey[], callback: CallbackType<{unprocessedItems: ObjectType[]}, any>): void;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings & {"return": "request"}): Promise<DynamoDB.BatchWriteItemInput>;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings & {"return": "request"}, callback: CallbackType<DynamoDB.BatchWriteItemInput, any>): void;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings): Promise<{unprocessedItems: ObjectType[]}>;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings, callback: CallbackType<{unprocessedItems: ObjectType[]}, any>): Promise<{unprocessedItems: ObjectType[]}>;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings & {"return": "response"}): Promise<{unprocessedItems: ObjectType[]}>;
	batchDelete (keys: InputKey[], settings: ModelBatchDeleteSettings & {"return": "response"}, callback: CallbackType<{unprocessedItems: ObjectType[]}, any>): Promise<{unprocessedItems: ObjectType[]}>;
	batchDelete (keys: InputKey[], settings?: ModelBatchDeleteSettings | CallbackType<{unprocessedItems: ObjectType[]}, any> | CallbackType<DynamoDB.BatchWriteItemInput, any>, callback?: CallbackType<{unprocessedItems: ObjectType[]}, any> | CallbackType<DynamoDB.BatchWriteItemInput, any>): void | Promise<DynamoDB.BatchWriteItemInput> | Promise<{unprocessedItems: ObjectType[]}> {
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": "response"};
		}
		if (typeof settings === "undefined") {
			settings = {"return": "response"};
		}

		const keyObjects: Promise<KeyObject>[] = keys.map(async (key) => this.getInternalProperties(internalProperties).convertKeyToObject(key));
		const table = this.getInternalProperties(internalProperties).table();
		const instance = table.getInternalProperties(internalProperties).instance;

		const prepareResponse = async (response: DynamoDB.BatchWriteItemOutput): Promise<{unprocessedItems: ObjectType[]}> => {
			const unprocessedArray = response.UnprocessedItems && response.UnprocessedItems[table.getInternalProperties(internalProperties).name] ? response.UnprocessedItems[this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).name] : [];
			const tmpResultUnprocessed = await Promise.all(unprocessedArray.map((item) => this.Item.fromDynamo(item.DeleteRequest.Key)));
			return (await Promise.all(keyObjects)).reduce((result, key) => {
				const item = tmpResultUnprocessed.find((item) => Object.keys(key).every((keyProperty) => item[keyProperty] === key[keyProperty]));
				if (item) {
					result.unprocessedItems.push(item);
				}
				return result;
			}, {"unprocessedItems": []});
		};

		const getParams = async (): Promise<DynamoDB.BatchWriteItemInput> => ({
			"RequestItems": {
				[table.getInternalProperties(internalProperties).name]: (await Promise.all(keyObjects)).map((key) => ({
					"DeleteRequest": {
						"Key": this.Item.objectToDynamo(key)
					}
				}))
			}
		});
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.BatchWriteItemInput, any> = callback as CallbackType<DynamoDB.BatchWriteItemInput, any>;
				getParams().then((result) => localCallback(null, result)).catch((error) => callback(error));
				return;
			} else {
				return (async (): Promise<DynamoDB.BatchWriteItemInput> => {
					const response = await getParams();
					return response;
				})();
			}
		}
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => getParams()).then((params) => ddb(instance, "batchWriteItem", params));

		if (callback) {
			const localCallback: CallbackType<{"unprocessedItems": ObjectType[]}, any> = callback as CallbackType<{"unprocessedItems": ObjectType[]}, any>;
			promise.then((response) => prepareResponse(response)).then((response) => localCallback(null, response)).catch((error) => localCallback(error));
		} else {
			return (async (): Promise<{unprocessedItems: ObjectType[]}> => {
				const response = await promise;
				return prepareResponse(response);
			})();
		}
	}

	// Update
	update (obj: UpdatePartial<T>): Promise<T>;
	update (obj: UpdatePartial<T>, callback: CallbackType<T, any>): void;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>): Promise<T>;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, callback: CallbackType<T, any>): void;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "request"}): Promise<DynamoDB.UpdateItemInput>;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "request"}, callback: CallbackType<DynamoDB.UpdateItemInput, any>): void;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings): Promise<T>;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings, callback: CallbackType<T, any>): void;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "document"}): Promise<T>;
	update (keyObj: InputKey, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "document"}, callback: CallbackType<T, any>): void;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>): Promise<T>;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, callback: CallbackType<T, any>): void;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "request"}): Promise<DynamoDB.UpdateItemInput>;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "request"}, callback: CallbackType<DynamoDB.UpdateItemInput, any>): void;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings): Promise<T>;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings, callback: CallbackType<T, any>): void;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "item"}): Promise<T>;
	update (keyObj: ObjectType, updateObj: UpdatePartial<T>, settings: ModelUpdateSettings & {"return": "item"}, callback: CallbackType<T, any>): void;
	update (keyObj: InputKey | ObjectType, updateObj?: UpdatePartial<T> | CallbackType<T, any> | CallbackType<DynamoDB.UpdateItemInput, any>, settings?: ModelUpdateSettings | CallbackType<T, any> | CallbackType<DynamoDB.UpdateItemInput, any>, callback?: CallbackType<T, any> | CallbackType<DynamoDB.UpdateItemInput, any>): void | Promise<T> | Promise<DynamoDB.UpdateItemInput> {
		if (typeof updateObj === "function") {
			callback = updateObj as CallbackType<ItemCarrier | DynamoDB.UpdateItemInput, any>; // TODO: fix this, for some reason `updateObj` has a type of Function which is forcing us to type cast it
			updateObj = null;
			settings = {"return": "item"};
		}
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": "item"};
		}
		if (typeof settings === "undefined") {
			settings = {"return": "item"};
		}

		const schema: Schema = this.getInternalProperties(internalProperties).schemas[0]; // TODO: fix this to get correct schema
		const table = this.getInternalProperties(internalProperties).table();
		const {instance} = table.getInternalProperties(internalProperties);
		let index = 0;
		// Track which values are already in DynamoDB format to avoid double conversion
		const alreadyConvertedValues = new Set<string>();
		const getUpdateExpressionObject: () => Promise<any> = async () => {
			const updateTypes = [
				{"name": "$SET", "operator": " = ", "objectFromSchemaSettings": {"validate": true, "enum": true, "forceDefault": true, "required": "nested", "modifiers": ["set"]}},
				{"name": "$ADD", "objectFromSchemaSettings": {"forceDefault": true}},
				{"name": "$REMOVE", "attributeOnly": true, "objectFromSchemaSettings": {"required": true, "defaults": true}},
				{"name": "$DELETE", "objectFromSchemaSettings": {"defaults": true}}
			].reverse();

			// Use cached update types map for O(1) lookups or create and cache if not exist
			let updateTypesMap = this.getInternalProperties(internalProperties).updateTypesMapCache;
			let updateTypeNames = this.getInternalProperties(internalProperties).updateTypeNamesCache;
			if (!updateTypesMap) {
				updateTypesMap = new Map(updateTypes.map((type) => [type.name, type]));
				updateTypeNames = updateTypes.map((a) => a.name);
				// Cache for future calls
				this.getInternalProperties(internalProperties).updateTypesMapCache = updateTypesMap;
				this.getInternalProperties(internalProperties).updateTypeNamesCache = updateTypeNames;
			}

			// Use cached schema attributes set for O(1) lookups or create and cache if not exist
			let schemaAttributesSet = this.getInternalProperties(internalProperties).schemaAttributesCache;
			let schemaAttributes: string[];
			if (!schemaAttributesSet) {
				schemaAttributes = schema.attributes();
				schemaAttributesSet = new Set(schemaAttributes);
				// Cache for future calls
				this.getInternalProperties(internalProperties).schemaAttributesCache = schemaAttributesSet;
			} else {
				// Convert Set back to array for existing logic that expects an array
				schemaAttributes = Array.from(schemaAttributesSet);
			}

			if (!updateObj) {
				updateObj = utils.deep_copy(keyObj) as Partial<T>;

				// Cache convertKeyToObject results for performance
				// Create stable cache key by sorting object keys to avoid collisions
				const keyObjString = JSON.stringify(keyObj, Object.keys(keyObj).sort());
				let convertedKeyObj = this.getInternalProperties(internalProperties).convertKeyToObjectCache?.get(keyObjString);
				if (!convertedKeyObj) {
					convertedKeyObj = await this.getInternalProperties(internalProperties).convertKeyToObject(keyObj);
					if (!this.getInternalProperties(internalProperties).convertKeyToObjectCache) {
						// Use LRU cache with reasonable limit (200 entries)
						this.getInternalProperties(internalProperties).convertKeyToObjectCache = new LRUCache(200);
					}
					this.getInternalProperties(internalProperties).convertKeyToObjectCache.set(keyObjString, convertedKeyObj);
				}

				Object.keys(convertedKeyObj).forEach((key) => delete updateObj[key]);
			}

			const returnObject = await Object.keys(updateObj).reduce(async (accumulatorPromise, key) => {
				const accumulator = await accumulatorPromise;
				let value = updateObj[key];

				if (!(typeof value === "object" && updateTypeNames.includes(key))) {
					value = {[key]: value};
					key = "$SET";
				}

				const valueKeys = Object.keys(value);
				for (let i = 0; i < valueKeys.length; i++) {
					let subKey = valueKeys[i];
					let subValue = value[subKey];

					let updateType = updateTypesMap.get(key);
					const originalUpdateType = updateType; // Keep track of the original operation type

					const expressionKey = `#a${index}`;
					// Handle array values correctly
					// For $REMOVE arrays, the actual paths are the values in the array
					// For other arrays, use the existing logic
					if (Array.isArray(value)) {
						if (updateType.name === "$REMOVE") {
							// For $REMOVE, subValue contains the attribute path
							subKey = subValue;
							subValue = undefined; // $REMOVE doesn't have values
						} else {
							// For other array operations, use existing pattern
							subKey = subValue;
						}
					}

					// Validate dot notation paths early to provide better error messages
					if (subKey && typeof subKey === "string" && subKey.includes(".")) {
						const pathComponents = subKey.split(".");
						if (pathComponents.some((component) => !component)) {
							throw new Error(`Invalid dot notation path: ${subKey}. Path cannot have empty components.`);
						}
					}

					// For array indexed paths, extract the base attribute name for schema validation
					let baseAttributeName = subKey;

					if (subKey && typeof subKey === "string" && subKey.includes("[")) {
						// Check if we're updating a property within an array element
						// e.g., "reps[0].firstName" means we're updating firstName, not the whole object
						const bracketIndex = subKey.indexOf("[");
						const closeBracketIndex = subKey.indexOf("]");
						if (closeBracketIndex !== -1 && closeBracketIndex < subKey.length - 1 && subKey[closeBracketIndex + 1] === ".") {
							// This is a nested property in an array element like "reps[0].firstName"
							// For nested properties, we don't need the array for validation
							// We're setting a string/number/etc, not an object
							baseAttributeName = subKey.substring(0, bracketIndex);
						} else {
							// Simple array element like "keywords[0]"
							baseAttributeName = subKey.substring(0, bracketIndex);
						}
					} else if (subKey && typeof subKey === "string" && subKey.includes(".")) {
						// For dot notation, use the first component
						// e.g., "business.address.city" -> "business"
						baseAttributeName = subKey.split(".")[0];
					}

					// Cache expensive schema.getAttributeType() calls
					// Use more robust cache key to avoid collisions (escape delimiter)
					const attributeTypeKey = `${baseAttributeName.replace(/:/g, "\\:")}:${typeof subValue}`;
					let dynamoType = this.getInternalProperties(internalProperties).attributeTypeCache?.get(attributeTypeKey);
					if (dynamoType === undefined) {
						try {
							dynamoType = schema.getAttributeType(baseAttributeName, subValue, {"unknownAttributeAllowed": true});
						} catch (e) {} // eslint-disable-line no-empty

						if (!this.getInternalProperties(internalProperties).attributeTypeCache) {
							// Use LRU cache with reasonable limit (500 entries)
							this.getInternalProperties(internalProperties).attributeTypeCache = new LRUCache(500);
						}
						this.getInternalProperties(internalProperties).attributeTypeCache.set(attributeTypeKey, dynamoType);
					}
					const attributeExists = schemaAttributesSet.has(baseAttributeName);
					const dynamooseUndefined = type.UNDEFINED;
					if (!updateType.attributeOnly && subValue !== dynamooseUndefined) {
						// Check if we're updating a path with array indices or nested dot notation
						const hasArrayIndex = subKey && typeof subKey === "string" && subKey.includes("[");
						const hasDotNotation = subKey && typeof subKey === "string" && subKey.includes(".");

						if (hasArrayIndex || hasDotNotation) {
							// For paths with array indices or dot notation, we're setting a single value at a specific location
							// Convert the value directly to DynamoDB format using the AWS converter
							// This handles cases like:
							// - "keywords[0]" = "value"
							// - "reps[0].firstName" = "John"
							// - "business.companyName" = "New Name"
							// - "business.address.city" = "Madrid"
							subValue = awsConverter().convertToAttr(subValue);
							// Mark this value as already converted to prevent double conversion later
							alreadyConvertedValues.add(`:v${index}`);
						} else {
							// Original logic for simple top-level attributes like "name", "age"
							const schemaObj = {[baseAttributeName]: dynamoType === "L" && !Array.isArray(subValue) ? [subValue] : subValue};
							const convertedObj = await this.Item.objectFromSchema(schemaObj, this, {"type": "toDynamo", "customTypesDynamo": true, "saveUnknown": true, "mapAttributes": true, ...updateType.objectFromSchemaSettings} as any);
							subValue = convertedObj[baseAttributeName];
						}
					}

					if (subValue === dynamooseUndefined || subValue === undefined) {
						if (attributeExists) {
							updateType = updateTypesMap.get("$REMOVE");
						} else {
							continue;
						}
					}

					if (subValue !== dynamooseUndefined) {
						const defaultValue = await schema.defaultCheck(baseAttributeName, undefined, updateType.objectFromSchemaSettings);
						if (defaultValue) {
							subValue = defaultValue;
							updateType = updateTypesMap.get("$SET");
						}
					}

					if (updateType.objectFromSchemaSettings.required === true) {
						await schema.requiredCheck(baseAttributeName, undefined);
					}

					// Validate REMOVE operations for DynamoDB limitations
					// Only validate if this was originally a REMOVE operation, not if SET switched to REMOVE
					if (originalUpdateType.name === "$REMOVE" && subKey && typeof subKey === "string") {
						validateRemoveOperation(subKey, originalUpdateType.name);
					}

					let expressionValue = updateType.attributeOnly ? "" : `:v${index}`;
					let finalExpressionKey = expressionKey;

					// Handle paths with dot notation and/or array indices
					if (subKey && typeof subKey === "string" && (subKey.includes(".") || subKey.includes("["))) {
						// Parse the path to handle both dot notation and array indices
						const segments = parsePathWithArrayIndices(subKey);

						// Build expression incrementally for better performance
						const expressionBuilder: string[] = [];
						let currentIndex = index;
						let previousWasAttribute = false;
						let previousWasIndex = false;

						for (const segment of segments) {
							if (segment.type === "attribute") {
								// Add dot separator between consecutive attributes or after an index
								if (previousWasAttribute || previousWasIndex) {
									expressionBuilder.push(".");
								}
								
								// Create expression attribute name
								const componentKey = `#a${currentIndex}`;
								accumulator.ExpressionAttributeNames[componentKey] = segment.value as string;
								expressionBuilder.push(componentKey);
								currentIndex++;
								
								// Track state for next iteration
								previousWasAttribute = true;
								previousWasIndex = false;
							} else if (segment.type === "index") {
								// Array indices remain literal in the expression
								expressionBuilder.push(`[${segment.value}]`);
								
								// Track state for next iteration
								previousWasAttribute = false;
								previousWasIndex = true;
							}
						}

						// Join all parts to create the final expression
						finalExpressionKey = expressionBuilder.join("");

						// Adjust the index for next iteration
						index = currentIndex - 1; // -1 because index++ happens at the end of the loop
					} else {
						// Original behavior for simple keys
						accumulator.ExpressionAttributeNames[expressionKey] = subKey;
					}

					if (!updateType.attributeOnly) {
						accumulator.ExpressionAttributeValues[expressionValue] = subValue;
					}

					if (dynamoType === "L" && updateType.name === "$ADD") {
						expressionValue = `list_append(${finalExpressionKey}, ${expressionValue})`;
						updateType = updateTypesMap.get("$SET");
					}

					const operator = updateType.operator || (updateType.attributeOnly ? "" : " ");

					accumulator.UpdateExpression[updateType.name.slice(1)].push(`${finalExpressionKey}${operator}${expressionValue}`);

					index++;
				}

				return accumulator;
			}, Promise.resolve((async (): Promise<{ExpressionAttributeNames: ObjectType; ExpressionAttributeValues: ObjectType; UpdateExpression: ObjectType}> => {
				const obj = {
					"ExpressionAttributeNames": {},
					"ExpressionAttributeValues": {},
					"UpdateExpression": updateTypes.map((a) => a.name).reduce((accumulator, key) => {
						accumulator[key.slice(1)] = [];
						return accumulator;
					}, {})
				};

				const itemFunctionSettings: ItemObjectFromSchemaSettings = {"updateTimestamps": {"updatedAt": true}, "customTypesDynamo": true, "type": "toDynamo", "mapAttributes": true};
				const defaultObjectFromSchema = await this.Item.objectFromSchema(await this.Item.prepareForObjectFromSchema({}, this, itemFunctionSettings), this, itemFunctionSettings);
				Object.keys(defaultObjectFromSchema).forEach((key) => {
					const value = defaultObjectFromSchema[key];
					const updateType = updateTypesMap.get("$SET");

					obj.ExpressionAttributeNames[`#a${index}`] = key;
					obj.ExpressionAttributeValues[`:v${index}`] = value;
					obj.UpdateExpression[updateType.name.slice(1)].push(`#a${index}${updateType.operator}:v${index}`);

					index++;
				});

				return obj;
			})()));

			// Optimize combine type processing - avoid multiple array iterations
			const expressionAttributeNamesMap = new Map(Object.entries(returnObject.ExpressionAttributeNames));
			const setAndRemoveExpressions = [...returnObject.UpdateExpression.SET, ...returnObject.UpdateExpression.REMOVE].join(", ");

			// Single pass through schema attributes to find and process combine types
			const combineAttributes = [];
			for (const attribute of schemaAttributes) {
				const type = schema.getAttributeTypeDetails(attribute);
				const isCombineType = Array.isArray(type) ? type.some((t) => t.name === "Combine") : type.name === "Combine";

				if (isCombineType) {
					if (Array.isArray(type)) {
						throw new CustomError.InvalidParameter("Combine type is not allowed to be used with multiple types.");
					}
					combineAttributes.push({attribute, type});
				}
			}

			// Process combine attributes efficiently
			for (const details of combineAttributes) {
				const invalidAttributes = [];

				// Check validity of all combine attributes
				for (const attr of details.type.typeSettings.attributes) {
					const expressionKey = [...expressionAttributeNamesMap].find(([key, value]) => value === attr)?.[0];
					const doesExist = Boolean(expressionKey);
					const isValid = doesExist && setAndRemoveExpressions.includes(expressionKey);

					if (!isValid) {
						invalidAttributes.push(attr);
					}
				}

				if (invalidAttributes.length > 0) {
					throw new CustomError.InvalidParameter(`You must update all or none of the combine attributes when running Model.update. Missing combine attributes: ${invalidAttributes.join(", ")}.`);
				} else {
					// More efficient next index calculation
					let maxIndex = -1;
					for (const key of Object.keys(returnObject.ExpressionAttributeNames)) {
						const indexNum = parseInt(key.replace("#a", ""));
						if (indexNum > maxIndex) maxIndex = indexNum;
					}
					const nextIndex = maxIndex + 1;

					returnObject.ExpressionAttributeNames[`#a${nextIndex}`] = details.attribute;

					// Efficient value collection using the map we already have
					const combinedValues = [];
					for (const attribute of details.type.typeSettings.attributes) {
						const expressionKey = [...expressionAttributeNamesMap].find(([key, value]) => value === attribute)?.[0];
						if (expressionKey) {
							const valueKey = expressionKey.replace("#a", ":v");
							const value = returnObject.ExpressionAttributeValues[valueKey];
							if (typeof value !== "undefined" && value !== null) {
								combinedValues.push(value);
							}
						}
					}

					returnObject.ExpressionAttributeValues[`:v${nextIndex}`] = combinedValues.join(details.type.typeSettings.separator);
					returnObject.UpdateExpression.SET.push(`#a${nextIndex} = :v${nextIndex}`);
				}
			}

			// Optimize default value processing - use Set for O(1) attribute lookup
			const currentAttributeNamesSet = new Set(Object.values(returnObject.ExpressionAttributeNames));

			await Promise.all(schemaAttributes.map(async (attribute) => {
				const defaultValue = await schema.defaultCheck(attribute, undefined, {"forceDefault": true});
				if (defaultValue && !currentAttributeNamesSet.has(attribute)) {
					const updateType = updateTypesMap.get("$SET");

					returnObject.ExpressionAttributeNames[`#a${index}`] = attribute;
					returnObject.ExpressionAttributeValues[`:v${index}`] = defaultValue;
					returnObject.UpdateExpression[updateType.name.slice(1)].push(`#a${index}${updateType.operator}:v${index}`);

					index++;
				}
			}));

			// Optimize final value processing - avoid repeated Object.values/keys calls
			const attributeNames = Object.values(returnObject.ExpressionAttributeNames);
			const attributeValues = Object.values(returnObject.ExpressionAttributeValues);
			const attributeValueKeys = Object.keys(returnObject.ExpressionAttributeValues);

			attributeNames.forEach((attribute: string, index) => {
				const value: ValueType = attributeValues[index];
				const valueKey = attributeValueKeys[index];
				// Cache expensive schema.getAttributeType() calls
				// Use more robust cache key to avoid collisions (escape delimiter)
				const attributeTypeKey = `${attribute.replace(/:/g, "\\:")}:${typeof value}`;
				let dynamoType = this.getInternalProperties(internalProperties).attributeTypeCache?.get(attributeTypeKey);
				if (dynamoType === undefined) {
					try {
						dynamoType = schema.getAttributeType(attribute, value, {"unknownAttributeAllowed": true});
					} catch (e) {} // eslint-disable-line no-empty

					if (!this.getInternalProperties(internalProperties).attributeTypeCache) {
						// Use LRU cache with reasonable limit (500 entries)
						this.getInternalProperties(internalProperties).attributeTypeCache = new LRUCache(500);
					}
					this.getInternalProperties(internalProperties).attributeTypeCache.set(attributeTypeKey, dynamoType);
				}
				const attributeType = Schema.attributeTypes.findDynamoDBType(dynamoType) as DynamoDBSetTypeResult;

				if (attributeType?.toDynamo && !attributeType.isOfType(value, "fromDynamo")) {
					returnObject.ExpressionAttributeValues[valueKey] = attributeType.toDynamo(value as any);
				}
			});

			// Only convert values that aren't already in DynamoDB format
			const valuesToConvert = {};
			const alreadyConverted = {};
			for (const [key, value] of Object.entries(returnObject.ExpressionAttributeValues)) {
				if (alreadyConvertedValues.has(key)) {
					alreadyConverted[key] = value;
				} else {
					valuesToConvert[key] = value;
				}
			}
			const convertedValues = this.Item.objectToDynamo(valuesToConvert);
			returnObject.ExpressionAttributeValues = {...convertedValues, ...alreadyConverted};
			if (Object.keys(returnObject.ExpressionAttributeValues).length === 0) {
				delete returnObject.ExpressionAttributeValues;
			}

			return {
				...returnObject,
				"UpdateExpression": Object.keys(returnObject.UpdateExpression).reduce((accumulator, key) => {
					const value = returnObject.UpdateExpression[key];

					if (value.length > 0) {
						return `${accumulator}${accumulator.length > 0 ? " " : ""}${key} ${value.join(", ")}`;
					} else {
						return accumulator;
					}
				}, "")
			};
		};

		const readStrict = this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.readStrict;
		const itemify = (item): Promise<any> => new this.Item(item, {"type": "fromDynamo"}).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "type": "fromDynamo", "saveUnknown": true, "readStrict": readStrict});
		const localSettings: ModelUpdateSettings = settings;
		const updateItemParamsPromise: Promise<DynamoDB.UpdateItemInput> = this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise().then(async () => ({
			"Key": this.Item.objectToDynamo(await this.getInternalProperties(internalProperties).convertKeyToObject(keyObj)),
			"ReturnValues": localSettings.returnValues || "ALL_NEW",
			...utils.merge_objects.main({"combineMethod": "object_combine"})(localSettings.condition ? await localSettings.condition.getInternalProperties(internalProperties).requestObject(this, {"index": {"start": index, "set": (i): void => {
				index = i;
			}}, "conditionString": "ConditionExpression", "conditionStringType": "string"}) : {}, await getUpdateExpressionObject()),
			"TableName": this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).name
		}));
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.UpdateItemInput, any> = callback as CallbackType<DynamoDB.UpdateItemInput, any>;
				updateItemParamsPromise.then((params) => localCallback(null, params));
				return;
			} else {
				return updateItemParamsPromise;
			}
		}
		const promise = updateItemParamsPromise.then((params) => ddb(instance, "updateItem", params));

		if (callback) {
			promise.then((response) => response.Attributes ? itemify(response.Attributes) : undefined).then((response) => callback(null, response)).catch((error) => callback(error));
		} else {
			return (async (): Promise<any> => {
				const response = await promise;
				return response.Attributes ? await itemify(response.Attributes) : undefined;
			})();
		}
	}

	// Create
	create (item: Partial<T>): Promise<T>;
	create (item: Partial<T>, callback: CallbackType<T, any>): void;
	create (item: Partial<T>, settings: ItemSaveSettings & {return: "request"}): Promise<DynamoDB.PutItemInput>;
	create (item: Partial<T>, settings: ItemSaveSettings & {return: "request"}, callback: CallbackType<DynamoDB.PutItemInput, any>): void;
	create (item: Partial<T>, settings: ItemSaveSettings): Promise<T>;
	create (item: Partial<T>, settings: ItemSaveSettings, callback: CallbackType<T, any>): void;
	create (item: Partial<T>, settings: ItemSaveSettings & {return: "item"}): Promise<T>;
	create (item: Partial<T>, settings: ItemSaveSettings & {return: "item"}, callback: CallbackType<T, any>): void;
	create (item: Partial<T>, settings?: ItemSaveSettings | CallbackType<T, any> | CallbackType<DynamoDB.PutItemInput, any>, callback?: CallbackType<T, any> | CallbackType<DynamoDB.PutItemInput, any>): void | Promise<T> | Promise<DynamoDB.PutItemInput> {
		if (typeof settings === "function" && !callback) {
			callback = settings;
			settings = {};
		}

		return new this.Item(item as any).save({"overwrite": false, ...settings} as any, callback as any);
	}

	// Delete
	delete (key: InputKey): Promise<void>;
	delete (key: InputKey, callback: CallbackType<void, any>): void;
	delete (key: InputKey, settings: ModelDeleteSettings & {return: "request"}): Promise<DynamoDB.DeleteItemInput>;
	delete (key: InputKey, settings: ModelDeleteSettings & {return: "request"}, callback: CallbackType<DynamoDB.DeleteItemInput, any>): void;
	delete (key: InputKey, settings: ModelDeleteSettings): Promise<void>;
	delete (key: InputKey, settings: ModelDeleteSettings, callback: CallbackType<void, any>): void;
	delete (key: InputKey, settings: ModelDeleteSettings & {return: null}): Promise<void>;
	delete (key: InputKey, settings: ModelDeleteSettings & {return: null}, callback: CallbackType<void, any>): void;
	delete (key: InputKey, settings?: ModelDeleteSettings | CallbackType<void, any> | CallbackType<DynamoDB.DeleteItemInput, any>, callback?: CallbackType<void, any> | CallbackType<DynamoDB.DeleteItemInput, any>): void | Promise<DynamoDB.DeleteItemInput> | Promise<void> {
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": null};
		}
		if (typeof settings === "undefined") {
			settings = {"return": null};
		}
		if (typeof settings === "object" && !settings.return) {
			settings = {...settings, "return": null};
		}

		const table = this.getInternalProperties(internalProperties).table();

		const getDeleteItemParams = async (settings: ModelDeleteSettings): Promise<DynamoDB.DeleteItemInput> => {
			let deleteItemParams: DynamoDB.DeleteItemInput = {
				"Key": this.Item.objectToDynamo(await this.getInternalProperties(internalProperties).convertKeyToObject(key)),
				"TableName": table.getInternalProperties(internalProperties).name
			};

			if (settings.condition) {
				deleteItemParams = {
					...deleteItemParams,
					...await settings.condition.getInternalProperties(internalProperties).requestObject(this)
				};
			}

			return deleteItemParams;
		};

		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.DeleteItemInput, any> = callback as CallbackType<DynamoDB.DeleteItemInput, any>;
				getDeleteItemParams(settings).then((params) => localCallback(null, params)).catch((error) => localCallback(error));
				return;
			} else {
				return (async (): Promise<DynamoDB.DeleteItemInput> => {
					const params = await getDeleteItemParams(settings);
					return params;
				})();
			}
		}
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => getDeleteItemParams(settings as ModelDeleteSettings)).then((deleteItemParams) => ddb(table.getInternalProperties(internalProperties).instance, "deleteItem", deleteItemParams));

		if (callback) {
			promise.then(() => callback()).catch((error) => callback(error));
		} else {
			return (async (): Promise<void> => {
				await promise;
			})();
		}
	}

	// Get
	get (key: InputKey): Promise<T>;
	get (key: InputKey, callback: CallbackType<T, any>): void;
	get (key: InputKey, settings: ModelGetSettings & {return: "request"}): Promise<DynamoDB.GetItemInput>;
	get (key: InputKey, settings: ModelGetSettings & {return: "request"}, callback: CallbackType<DynamoDB.GetItemInput, any>): void;
	get (key: InputKey, settings: ModelGetSettings): Promise<T>;
	get (key: InputKey, settings: ModelGetSettings, callback: CallbackType<T, any>): void;
	get (key: InputKey, settings: ModelGetSettings & {return: "item"}): Promise<T>;
	get (key: InputKey, settings: ModelGetSettings & {return: "item"}, callback: CallbackType<T, any>): void;
	get (key: InputKey, settings?: ModelGetSettings | CallbackType<T, any> | CallbackType<DynamoDB.GetItemInput, any>, callback?: CallbackType<T, any> | CallbackType<DynamoDB.GetItemInput, any>): void | Promise<DynamoDB.GetItemInput> | Promise<T> {
		if (typeof settings === "function") {
			callback = settings;
			settings = {"return": "item"};
		}
		if (typeof settings === "undefined") {
			settings = {"return": "item"};
		}

		const readStrict = this.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.readStrict;
		const conformToSchemaSettings: ItemObjectFromSchemaSettings = {"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo", "mapAttributes": true, "readStrict": readStrict};
		const itemify = (item: AttributeMap): Promise<ItemCarrier> => new this.Item(item as any, {"type": "fromDynamo"}).conformToSchema(conformToSchemaSettings);
		const table = this.getInternalProperties(internalProperties).table();

		const getItemParamsMethod = async (settings: ModelGetSettings): Promise<DynamoDB.GetItemInput> => {
			const getItemParams: DynamoDB.GetItemInput = {
				"Key": this.Item.objectToDynamo(await this.getInternalProperties(internalProperties).convertKeyToObject(key)),
				"TableName": table.getInternalProperties(internalProperties).name
			};

			if (settings.consistent !== undefined && settings.consistent !== null) {
				getItemParams.ConsistentRead = settings.consistent;
			}
			if (settings.attributes) {
				getItemParams.ProjectionExpression = settings.attributes.map((attribute, index) => `#a${index}`).join(", ");
				getItemParams.ExpressionAttributeNames = settings.attributes.reduce((accumulator, currentValue, index) => (accumulator[`#a${index}`] = currentValue, accumulator), {});
			}

			return getItemParams;
		};

		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.GetItemInput, any> = callback as CallbackType<DynamoDB.GetItemInput, any>;
				getItemParamsMethod(settings).then((getItemParams) => localCallback(null, getItemParams)).catch((error) => localCallback(error));
				return;
			} else {
				return (async (): Promise<any> => {
					const response = await getItemParamsMethod(settings);
					return response;
				})();
			}
		}
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(async () => {
			return getItemParamsMethod(settings as ModelGetSettings);
		}).then((getItemParams) => ddb(table.getInternalProperties(internalProperties).instance, "getItem", getItemParams));

		if (callback) {
			const localCallback: CallbackType<ItemCarrier, any> = callback as CallbackType<ItemCarrier, any>;
			promise.then((response) => response.Item ? itemify(response.Item) : undefined).then((response) => localCallback(null, response)).catch((error) => callback(error));
		} else {
			return (async (): Promise<any> => {
				const response = await promise;
				return response.Item ? await itemify(response.Item) : undefined;
			})();
		}
	}

	// Serialize Many
	serializeMany (itemsArray: ModelType<ItemCarrier>[] = [], nameOrOptions: SerializerOptions | string): any {
		return this.serializer.getInternalProperties(internalProperties).serializeMany(itemsArray, nameOrOptions);
	}

	/**
	 * Clear all performance caches for this model.
	 * This should be called when schema or model configuration changes
	 * to prevent stale cached data.
	 */
	clearCache (): void {
		const props = this.getInternalProperties(internalProperties);
		props.schemaAttributesCache = undefined;
		props.updateTypesMapCache = undefined;
		props.updateTypeNamesCache = undefined;
		props.convertKeyToObjectCache?.clear();
		props.attributeTypeCache?.clear();
	}
}


Model.prototype.scan = function (object?: ConditionInitializer): Scan<ItemCarrier> {
	return new Scan(this, object);
};
Model.prototype.query = function (object?: ConditionInitializer): Query<ItemCarrier> {
	return new Query(this, object);
};

// Methods
const customMethodFunctions = (type: "model" | "item"): {set: (name: string, fn: FunctionType) => void; delete: (name: string) => void} => {
	const entryPoint = (self: Model<ItemCarrier>): ItemCarrier | typeof ItemCarrier => type === "item" ? self.Item.prototype : self.Item;
	return {
		"set": function (name: string, fn): void {
			const self: Model<ItemCarrier> = this as any;
			if (!entryPoint(self)[name] || entryPoint(self)[name][Internal.General.internalProperties] && entryPoint(self)[name][Internal.General.internalProperties].type === "customMethod") {
				entryPoint(self)[name] = function (...args): Promise<any> {
					const bindObject = type === "item" ? this : self.Item;
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
				entryPoint(self)[name][Internal.General.internalProperties] = {"type": "customMethod"};
			}
		},
		"delete": function (name: string): void {
			const self: Model<ItemCarrier> = this as any;
			if (entryPoint(self)[name] && entryPoint(self)[name][Internal.General.internalProperties] && entryPoint(self)[name][Internal.General.internalProperties].type === "customMethod") {
				entryPoint(self)[name] = undefined;
			}
		}
	};
};
Model.prototype.methods = {
	...customMethodFunctions("model"),
	"item": customMethodFunctions("item")
};
