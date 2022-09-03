import awsConverter from "./aws/converter";
import ddb from "./aws/ddb/internal";
import utils from "./utils";
import Error from "./Error";
import Internal from "./Internal";
import {Model} from "./Model";
import {DynamoDBTypeResult, Schema, DynamoDBSetTypeResult} from "./Schema";
const {internalProperties} = Internal.General;
const dynamooseUndefined = Internal.Public.undefined;
const dynamooseAny = Internal.Public.any;

import {AttributeMap} from "./Types";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import {ValueType} from "./Schema";
import {CallbackType, ObjectType} from "./General";
import {SerializerOptions} from "./Serializer";
import {PopulateItem, PopulateSettings} from "./Populate";
import {Condition} from "./Condition";
import {TableExpiresSettings} from "./Table";
import {InternalPropertiesClass} from "./InternalPropertiesClass";
import CustomError from "./Error";

export interface ItemSaveSettings {
	overwrite?: boolean;
	return?: "request" | "item";
	condition?: Condition;
}
export interface ItemSettings {
	type?: "fromDynamo" | "toDynamo";
}

interface ItemInternalProperties {
	originalObject: any;
	originalSettings: ItemSettings;
	model: Model<Item>;
	storedInDynamo: boolean;
}

// Item represents an item in a Model that is either pending (not saved) or saved
export class Item extends InternalPropertiesClass<ItemInternalProperties> {
	/**
	 * Create a new item.
	 * @param model Internal property. Not used publicly.
	 * @param object The object for the item.
	 * @param settings The settings for the item.
	 */
	constructor (model: Model<Item>, object?: AttributeMap | ObjectType, settings?: ItemSettings) {
		super();

		const itemObject = Item.isDynamoObject(object) ? Item.fromDynamo(object) : object;
		Object.keys(itemObject).forEach((key) => this[key] = itemObject[key]);

		this.setInternalProperties(internalProperties, {
			"originalObject": utils.deep_copy(itemObject),
			"originalSettings": {...settings},
			model,
			"storedInDynamo": settings.type === "fromDynamo"
		});
	}

	// Internal
	static objectToDynamo (object: ObjectType): AttributeMap;
	static objectToDynamo (object: any, settings: {type: "value"}): DynamoDB.AttributeValue;
	static objectToDynamo (object: ObjectType, settings: {type: "object"}): AttributeMap;
	static objectToDynamo (object: any, settings: {type: "object" | "value"} = {"type": "object"}): DynamoDB.AttributeValue | AttributeMap {
		if (object === undefined) {
			return undefined;
		}

		const options = settings.type === "value" ? undefined : {"removeUndefinedValues": true};
		return (settings.type === "value" ? awsConverter().convertToAttr : awsConverter().marshall)(object, options as any);
	}
	static fromDynamo (object: AttributeMap): ObjectType {
		const result = awsConverter().unmarshall(object);
		utils.object.entries(result).forEach(([key, value]) => {
			if (value instanceof Uint8Array) {
				utils.object.set(result, key, Buffer.from(value));
			}
		});
		return result;
	}
	// This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
	static isDynamoObject (object: ObjectType, recursive?: boolean): boolean | null {
		function isValid (value): boolean {
			if (typeof value === "undefined" || value === null) {
				return false;
			}
			const keys = Object.keys(value);
			const key = keys[0];
			const nestedResult = typeof value[key] === "object" && !(value[key] instanceof Buffer) && !(value[key] instanceof Uint8Array) ? Array.isArray(value[key]) ? value[key].every((value) => Item.isDynamoObject(value, true)) : Item.isDynamoObject(value[key]) : true;
			const {Schema} = require("./Schema");
			const attributeType = Schema.attributeTypes.findDynamoDBType(key);
			return typeof value === "object" && keys.length === 1 && attributeType && (nestedResult || Object.keys(value[key]).length === 0 || attributeType.isSet);
		}

		const keys = Object.keys(object);
		const values = Object.values(object);
		if (keys.length === 0) {
			return null;
		} else {
			return recursive ? isValid(object) : values.every((value) => isValid(value));
		}
	}

	static attributesWithSchema: (item: Item, model: Model<Item>) => Promise<string[]>;
	static objectFromSchema: (object: any, model: Model<Item>, settings?: ItemObjectFromSchemaSettings) => Promise<any>;
	static prepareForObjectFromSchema: (object: any, model: Model<Item>, settings: ItemObjectFromSchemaSettings) => any;
	conformToSchema: (this: Item, settings?: ItemObjectFromSchemaSettings) => Promise<Item>;
	toDynamo: (this: Item, settings?: Partial<ItemObjectFromSchemaSettings>) => Promise<any>;

	// This function handles actions that should take place before every response (get, scan, query, batchGet, etc.)
	async prepareForResponse (): Promise<Item> {
		if (this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.populate) {
			return this.populate({"properties": this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.populate});
		}
		return this;
	}

	/**
	 * This function returns the original item that was received from DynamoDB. This function will return a JSON object that represents the original item. In the event no item has been retrieved from DynamoDB `null` will be returned.
	 *
	 * ```js
	 * const user = await User.get(1);
	 * console.log(user); // {"id": 1, "name": "Bob"}
	 * user.name = "Tim";
	 *
	 * console.log(user); // {"id": 1, "name": "Tim"}
	 * console.log(user.original()); // {"id": 1, "name": "Bob"}
	 * ```
	 * @returns Object | null
	 */
	original (): ObjectType | null {
		return this.getInternalProperties(internalProperties).originalSettings.type === "fromDynamo" ? this.getInternalProperties(internalProperties).originalObject : null;
	}

	/**
	 * This function returns a JSON object representation of the item. This is most commonly used when comparing a item to an object you receive elsewhere without worrying about prototypes.
	 *
	 * ```js
	 * const user = new User({"id": 1, "name": "Tim"});
	 *
	 * console.log(user); // Item {"id": 1, "name": "Tim"}
	 * console.log(user.toJSON()); // {"id": 1, "name": "Tim"}
	 * ```
	 *
	 * Due to the fact that a item instance is based on an object it is rare that you will have to use this function since you can access all the properties of the item directly. For example, both of the results will yield the same output.
	 *
	 * ```js
	 * const user = new User({"id": 1, "name": "Tim"});
	 *
	 * console.log(user.id); // 1
	 * console.log(user.toJSON().id); // 1
	 * ```
	 * @returns Object
	 */
	toJSON (): ObjectType {
		return utils.dynamoose.itemToJSON.bind(this)();
	}

	/**
	 * This method will return a promise containing an object of the item that includes default values for any undefined values in the item.
	 *
	 * ```js
	 * const schema = new Schema({
	 * 	"id": String,
	 * 	"data": {
	 * 		"type": String,
	 * 		"default": "Hello World"
	 * 	}
	 * });
	 * const User = dynamoose.model("User", schema);
	 * const user = new User({"id": 1});
	 * console.log(await user.withDefaults()); // {"id": 1, "data": "Hello World"}
	 * ```
	 * @returns Promise<Object>
	 */
	async withDefaults (): Promise<ObjectType> {
		return Item.objectFromSchema(utils.deep_copy(this.toJSON()), this.getInternalProperties(internalProperties).model, {
			"typeCheck": false,
			"defaults": true,
			"type": "toDynamo"
		});
	}

	// Serializer
	serialize (nameOrOptions?: SerializerOptions | string): ObjectType {
		return this.getInternalProperties(internalProperties).model.serializer.getInternalProperties(internalProperties).serialize(this, nameOrOptions);
	}

	/**
	 * This deletes the given item from DynamoDB. This method uses the `deleteItem` DynamoDB API call to delete your object in the given table associated with the model.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. Nothing will be passed into the result for the promise.
	 *
	 * ```js
	 * const myUser = User.get("1");
	 *
	 * try {
	 * 	await myUser.delete();
	 * 	console.log("Delete operation was successful.");
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * ```
	 * @returns Promise\<void\>
	 */
	delete (): Promise<void>;
	/**
	 * This deletes the given item from DynamoDB. This method uses the `deleteItem` DynamoDB API call to delete your object in the given table associated with the model.
	 *
	 * This method returns nothing. It accepts a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the callback.
	 *
	 * ```js
	 * const myUser = User.get("1");
	 *
	 * myUser.delete((error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Delete operation was successful.");
	 * 	}
	 * });
	 * ```
	 * @param callback Function - `(): void`
	 * @returns void
	 */
	delete (callback: CallbackType<void, any>): void;
	delete (callback?: CallbackType<void, any>): Promise<void> | void {
		const hashKey = this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).getHashKey();
		const rangeKey = this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).getRangeKey();

		const key = {[hashKey]: this[hashKey]};
		if (rangeKey) {
			key[rangeKey] = this[rangeKey];
		}

		return this.getInternalProperties(internalProperties).model.delete(key, callback);
	}

	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. Nothing will be passed into the result for the promise.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * try {
	 * 	await myUser.save();
	 * 	console.log("Save operation was successful.");
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * ```
	 * @returns Promise\<Item\>
	 */
	save (): Promise<Item>;
	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns nothing. It accepts a function into the `callback` parameter. Nothing will be passed into the result for the callback.
	 *
	 * Both `settings` and `callback` parameters are optional. You can pass in a `callback` without `settings`, just by passing in one argument and having that argument be the `callback`. You are not required to pass in `settings` if you just want to pass in a `callback`.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * myUser.save((error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Save operation was successful.");
	 * 	}
	 * });
	 * ```
	 * @param callback Function - `(error: any, item: Item): void`
	 */
	save (callback: CallbackType<Item, any>): void;
	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. Nothing will be passed into the result for the promise.
	 *
	 * You can also pass a settings object in as the first parameter. The following options are available for settings are:
	 *
	 * | Name | Type | Default | Notes |
	 * |---|---|---|---|
	 * | overwrite | boolean | true | If an existing item with the same hash key should be overwritten in the database. You can set this to false to not overwrite an existing item with the same hash key. |
	 * | return | string | `item` | If the function should return the `item` or `request`. If you set this to `request` the request that would be made to DynamoDB will be returned, but no requests will be made to DynamoDB. |
	 * | condition | [`dynamoose.Condition`](https://dynamoosejs.com/guide/Condition) | `null` | This is an optional instance of a Condition for the save. |
	 *
	 * The `settings` parameter is optional.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * try {
	 * 	await myUser.save({
	 * 		"overwrite": false,
	 * 		"return": "request"
	 * 	});
	 * 	console.log("Save operation was successful.");
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * ```
	 * @param settings Object - `{"overwrite": boolean, "return": "request", "condition": Condition}`
	 * @returns Promise\<DynamoDB.PutItemInput\>
	 */
	save (settings: ItemSaveSettings & {return: "request"}): Promise<DynamoDB.PutItemInput>;
	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the promise or callback.
	 *
	 * You can also pass a settings object in as the first parameter. The following options are available for settings are:
	 *
	 * | Name | Type | Default | Notes |
	 * |---|---|---|---|
	 * | overwrite | boolean | true | If an existing item with the same hash key should be overwritten in the database. You can set this to false to not overwrite an existing item with the same hash key. |
	 * | return | string | `item` | If the function should return the `item` or `request`. If you set this to `request` the request that would be made to DynamoDB will be returned, but no requests will be made to DynamoDB. |
	 * | condition | [`dynamoose.Condition`](https://dynamoosejs.com/guide/Condition) | `null` | This is an optional instance of a Condition for the save. |
	 *
	 * Both `settings` and `callback` parameters are optional. You can pass in a `callback` without `settings`, just by passing in one argument and having that argument be the `callback`. You are not required to pass in `settings` if you just want to pass in a `callback`.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * myUser.save({
	 * 	"overwrite": false,
	 * 	"return": "request"
	 * }, (error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Save operation was successful.");
	 * 	}
	 * });
	 * ```
	 * @param settings Object - `{"overwrite": boolean, "return": "request", "condition": Condition}`
	 * @param callback Function - `(error: any, request: DynamoDB.PutItemInput): void`
	 */
	save (settings: ItemSaveSettings & {return: "request"}, callback: CallbackType<DynamoDB.PutItemInput, any>): void;
	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the promise or callback.
	 *
	 * You can also pass a settings object in as the first parameter. The following options are available for settings are:
	 *
	 * | Name | Type | Default | Notes |
	 * |---|---|---|---|
	 * | overwrite | boolean | true | If an existing item with the same hash key should be overwritten in the database. You can set this to false to not overwrite an existing item with the same hash key. |
	 * | return | string | `item` | If the function should return the `item` or `request`. If you set this to `request` the request that would be made to DynamoDB will be returned, but no requests will be made to DynamoDB. |
	 * | condition | [`dynamoose.Condition`](https://dynamoosejs.com/guide/Condition) | `null` | This is an optional instance of a Condition for the save. |
	 *
	 * The `settings` parameter is optional.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * try {
	 * 	await myUser.save({
	 * 		"overwrite": false,
	 * 		"return": "item"
	 * 	});
	 * 	console.log("Save operation was successful.");
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * ```
	 * @param settings Object - `{"overwrite": boolean, "return": "item", "condition": Condition}`
	 * @returns Promise\<Item\>
	 */
	save (settings: ItemSaveSettings & {return: "item"}): Promise<Item>;
	/**
	 * This saves a item to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.
	 *
	 * This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the promise or callback.
	 *
	 * You can also pass a settings object in as the first parameter. The following options are available for settings are:
	 *
	 * | Name | Type | Default | Notes |
	 * |---|---|---|---|
	 * | overwrite | boolean | true | If an existing item with the same hash key should be overwritten in the database. You can set this to false to not overwrite an existing item with the same hash key. |
	 * | return | string | `item` | If the function should return the `item` or `request`. If you set this to `request` the request that would be made to DynamoDB will be returned, but no requests will be made to DynamoDB. |
	 * | condition | [`dynamoose.Condition`](https://dynamoosejs.com/guide/Condition) | `null` | This is an optional instance of a Condition for the save. |
	 *
	 * Both `settings` and `callback` parameters are optional. You can pass in a `callback` without `settings`, just by passing in one argument and having that argument be the `callback`. You are not required to pass in `settings` if you just want to pass in a `callback`.
	 *
	 * ```js
	 * const myUser = new User({
	 * 	"id": 1,
	 * 	"name": "Tim"
	 * });
	 *
	 * myUser.save({
	 * 	"overwrite": false,
	 * 	"return": "item"
	 * }, (error) => {
	 * 	if (error) {
	 * 		console.error(error);
	 * 	} else {
	 * 		console.log("Save operation was successful.");
	 * 	}
	 * });
	 * ```
	 * @param settings Object - `{"overwrite": boolean, "return": "item", "condition": Condition}`
	 * @param callback Function - `(error: any, request: Item): void`
	 */
	save (settings: ItemSaveSettings & {return: "item"}, callback: CallbackType<Item, any>): void;
	save (settings?: ItemSaveSettings | CallbackType<Item, any> | CallbackType<DynamoDB.PutItemInput, any>, callback?: CallbackType<Item, any> | CallbackType<DynamoDB.PutItemInput, any>): void | Promise<Item | DynamoDB.PutItemInput> {
		if (typeof settings !== "object" && typeof settings !== "undefined") {
			callback = settings;
			settings = {};
		}
		if (typeof settings === "undefined") {
			settings = {};
		}

		const table = this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).table();

		let savedItem;

		const localSettings: ItemSaveSettings = settings;
		const paramsPromise = this.toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "combine": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"], "mapAttributes": true}).then(async (item) => {
			savedItem = item;
			let putItemObj: DynamoDB.PutItemInput = {
				"Item": item,
				"TableName": table.getInternalProperties(internalProperties).name
			};

			if (localSettings.condition) {
				putItemObj = {
					...putItemObj,
					...await localSettings.condition.getInternalProperties(internalProperties).requestObject(this.getInternalProperties(internalProperties).model)
				};
			}

			if (localSettings.overwrite === false) {
				const conditionExpression = "attribute_not_exists(#__hash_key)";
				putItemObj.ConditionExpression = putItemObj.ConditionExpression ? `(${putItemObj.ConditionExpression}) AND (${conditionExpression})` : conditionExpression;
				putItemObj.ExpressionAttributeNames = {
					...putItemObj.ExpressionAttributeNames || {},
					"#__hash_key": this.getInternalProperties(internalProperties).model.getInternalProperties(internalProperties).getHashKey()
				};
			}

			return putItemObj;
		});
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.PutItemInput, any> = callback as CallbackType<DynamoDB.PutItemInput, any>;
				paramsPromise.then((result) => localCallback(null, result));
				return;
			} else {
				return paramsPromise;
			}
		}
		const promise: Promise<DynamoDB.PutItemOutput> = Promise.all([paramsPromise, table.getInternalProperties(internalProperties).pendingTaskPromise()]).then((promises) => {
			const [putItemObj] = promises;
			return ddb(table.getInternalProperties(internalProperties).instance, "putItem", putItemObj);
		});

		if (callback) {
			const localCallback: CallbackType<Item, any> = callback as CallbackType<Item, any>;
			promise.then(() => {
				this.getInternalProperties(internalProperties).storedInDynamo = true;

				const returnItem = new (this.getInternalProperties(internalProperties).model).Item(savedItem as any);
				returnItem.getInternalProperties(internalProperties).storedInDynamo = true;

				localCallback(null, returnItem);
			}).catch((error) => callback(error));
		} else {
			return (async (): Promise<Item> => {
				await promise;
				this.getInternalProperties(internalProperties).storedInDynamo = true;

				const returnItem = new (this.getInternalProperties(internalProperties).model).Item(savedItem as any);
				returnItem.getInternalProperties(internalProperties).storedInDynamo = true;

				return returnItem;
			})();
		}
	}

	// Populate
	populate (): Promise<Item>;
	populate (callback: CallbackType<Item, any>): void;
	populate (settings: PopulateSettings): Promise<Item>;
	populate (settings: PopulateSettings, callback: CallbackType<Item, any>): void;
	populate (...args): Promise<Item> | void {
		return PopulateItem.bind(this)(...args);
	}
}

export class AnyItem extends Item {
	[key: string]: any;
}

// This function will mutate the object passed in to run any actions to conform to the schema that cannot be achieved through non mutating methods in Item.objectFromSchema (setting timestamps, etc.)
Item.prepareForObjectFromSchema = async function<T extends InternalPropertiesClass<any>>(object: T, model: Model<Item>, settings: ItemObjectFromSchemaSettings): Promise<T> {
	if (settings.updateTimestamps) {
		const schema: Schema = model.getInternalProperties(internalProperties).schemaForObject(object);
		if (schema.getInternalProperties(internalProperties).settings.timestamps && settings.type === "toDynamo") {
			const date = new Date();
			const timeResult = (prop) => {
				const typeDetails = schema.getAttributeTypeDetails(prop.name);
				if (Array.isArray(typeDetails)) {
					throw new CustomError.InvalidType(`Not allowed to use an array of types for the timestamps attribute "${prop.name}".`);
				}
				switch (typeDetails.typeSettings.storage) {
				case "iso": return date.toISOString();
				case "seconds": return Math.floor(date.getTime() / 1000);
				default: return date.getTime();
				}
			};

			const timestampProperties = schema.getInternalProperties(internalProperties).getTimestampAttributes();

			const createdAtProperties = timestampProperties.filter((val) => val.type === "createdAt");
			const updatedAtProperties = timestampProperties.filter((val) => val.type === "updatedAt");
			if (object.getInternalProperties && object.getInternalProperties(internalProperties) && !object.getInternalProperties(internalProperties).storedInDynamo && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.createdAt)) {
				createdAtProperties.forEach((prop) => {
					utils.object.set(object as any, prop.name, timeResult(prop));
				});
			}
			if (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.updatedAt) {
				updatedAtProperties.forEach((prop) => {
					utils.object.set(object as any, prop.name, timeResult(prop));
				});
			}
		}
	}
	return object;
};
// This function will return a list of attributes combining both the schema attributes with the item attributes. This also takes into account all attributes that could exist (ex. properties in sets that don't exist in item), adding the indexes for each item in the item set.
// https://stackoverflow.com/a/59928314/894067
Item.attributesWithSchema = async function (item: Item, model: Model<Item>): Promise<string[]> {
	const schema: Schema = model.getInternalProperties(internalProperties).schemaForObject(item);
	const attributes = schema.attributes();
	// build a tree out of schema attributes
	const root = {};
	attributes.forEach((attribute) => {
		let node = root;
		attribute.split(".").forEach((part) => {
			node[part] = node[part] || {};
			node = node[part];
		});
	});
	// explore the tree
	function traverse (node, treeNode, outPath, callback): void {
		callback(outPath);
		if (Object.keys(treeNode).length === 0) { // a leaf
			return;
		}

		Object.keys(treeNode).forEach((attr) => {
			if (attr === "0") {
				// We check for empty objects here (added `typeof node === "object" && Object.keys(node).length == 0`, see PR https://github.com/dynamoose/dynamoose/pull/1034) to handle the use case of 2d arrays, or arrays within arrays. `node` in that case will be an empty object.
				if (!node || node.length == 0 || typeof node === "object" && Object.keys(node).length == 0) {
					node = [{}]; // fake the path for arrays
				}
				node.forEach((a, index) => {
					outPath.push(index);
					traverse(node[index], treeNode[attr], outPath, callback);
					outPath.pop();
				});
			} else {
				if (!node) {
					node = {}; // fake the path for properties
				}
				outPath.push(attr);
				traverse(node[attr], treeNode[attr], outPath, callback);
				outPath.pop();
			}
		});
	}
	const out = [];
	traverse(item, root, [], (val) => out.push(val.join(".")));
	const result = out.slice(1);
	return result;
};
export interface ItemObjectFromSchemaSettings {
	type: "toDynamo" | "fromDynamo";
	schema?: Schema;
	checkExpiredItem?: boolean;
	saveUnknown?: boolean;
	defaults?: boolean;
	forceDefault?: boolean;
	customTypesDynamo?: boolean;
	validate?: boolean;
	required?: boolean | "nested";
	enum?: boolean;
	populate?: boolean;
	combine?: boolean;
	modifiers?: ("set" | "get")[];
	updateTimestamps?: boolean | {updatedAt?: boolean; createdAt?: boolean};
	typeCheck?: boolean;
	mapAttributes?: boolean;
}
// This function will return an object that conforms to the schema (removing any properties that don't exist, using default values, etc.) & throws an error if there is a type mismatch.
Item.objectFromSchema = async function (object: any, model: Model<Item>, settings: ItemObjectFromSchemaSettings = {"type": "toDynamo"}): Promise<ObjectType> {
	if (settings.checkExpiredItem && model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.expires && ((model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.expires as TableExpiresSettings).items || {}).returnExpired === false && object[(model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.expires as TableExpiresSettings).attribute] && object[(model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.expires as TableExpiresSettings).attribute] * 1000 < Date.now()) {
		return undefined;
	}

	let returnObject = utils.deep_copy(object);
	const schema: Schema = settings.schema || model.getInternalProperties(internalProperties).schemaForObject(returnObject);
	const schemaAttributes = schema.attributes(returnObject);

	function mapAttributes (type: "toDynamo" | "fromDynamo") {
		if (settings.mapAttributes && settings.type === type) {
			const schemaInternalProperties = schema.getInternalProperties(internalProperties);
			const mappedAttributesObject = type === "toDynamo" ? schemaInternalProperties.getMapSettingObject() : schema.attributes().reduce((obj, attribute) => {
				const mapValues = schemaInternalProperties.getMapSettingValuesForKey(attribute);
				if (mapValues && mapValues.length > 0) {
					const defaultMapAttribute = schema.getInternalProperties(internalProperties).getDefaultMapAttribute(attribute);
					if (defaultMapAttribute) {
						if (defaultMapAttribute !== attribute) {
							obj[attribute] = defaultMapAttribute;
						}
					} else {
						obj[attribute] = mapValues[0];
					}
				}
				return obj;
			}, {});

			Object.entries(mappedAttributesObject).forEach(([oldKey, newKey]) => {
				if (returnObject[oldKey] !== undefined && returnObject[newKey] !== undefined) {
					throw new CustomError.InvalidParameter(`Cannot map attribute ${oldKey} to ${newKey} because both are defined`);
				}

				if (returnObject[oldKey] !== undefined) {
					returnObject[newKey] = returnObject[oldKey];
					delete returnObject[oldKey];
				}
			});
		}
	}

	// Map Attributes toDynamo
	mapAttributes("toDynamo");

	// Type check
	const typeIndexOptionMap = schema.getTypePaths(returnObject, settings);
	if (settings.typeCheck === undefined || settings.typeCheck === true) {
		const validParents = []; // This array is used to allow for set contents to not be type checked
		const keysToDelete = [];
		const checkTypeFunction = (item): void => {
			const [key, value] = item;
			if (validParents.find((parent) => key.startsWith(parent.key) && (parent.infinite || key.split(".").length === parent.key.split(".").length + 1))) {
				return;
			}
			const genericKey = key.replace(/\.\d+/gu, ".0"); // This is a key replacing all list numbers with 0 to standardize things like checking if it exists in the schema
			const existsInSchema = schemaAttributes.includes(genericKey);
			if (existsInSchema) {
				const {isValidType, matchedTypeDetails, typeDetailsArray} = utils.dynamoose.getValueTypeCheckResult(schema, value, genericKey, settings, {"standardKey": true, typeIndexOptionMap});
				if (!isValidType) {
					throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetailsArray.map((detail) => detail.dynamicName ? detail.dynamicName() : detail.name.toLowerCase()).join(", ")}, instead found type ${utils.type_name(value, typeDetailsArray)}.`);
				} else if (matchedTypeDetails.isSet || matchedTypeDetails.name.toLowerCase() === "model" || (matchedTypeDetails.name === "Object" || matchedTypeDetails.name === "Array") && schema.getAttributeSettingValue("schema", genericKey) === dynamooseAny) {
					validParents.push({key, "infinite": true});
				} else if (/*typeDetails.dynamodbType === "M" || */matchedTypeDetails.dynamodbType === "L") {
					// The code below is an optimization for large array types to speed up the process of not having to check the type for every element but only the ones that are different
					value.forEach((subValue, index: number, array: any[]) => {
						if (index === 0 || typeof subValue !== typeof array[0]) {
							checkTypeFunction([`${key}.${index}`, subValue]);
						} else if (keysToDelete.includes(`${key}.0`) && typeof subValue === typeof array[0]) {
							keysToDelete.push(`${key}.${index}`);
						}
					});
					validParents.push({key});
				}
			} else {
				// Check saveUnknown
				if (!settings.saveUnknown || !utils.dynamoose.wildcard_allowed_check(schema.getSettingValue("saveUnknown"), key)) {
					keysToDelete.push(key);
				}
			}
		};
		utils.object.entries(returnObject).filter((item) => item[1] !== undefined && item[1] !== dynamooseUndefined).map(checkTypeFunction);
		keysToDelete.reverse().forEach((key) => utils.object.delete(returnObject, key));
	}

	if (settings.defaults || settings.forceDefault) {
		await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			if (value === dynamooseUndefined) {
				utils.object.set(returnObject, key, undefined);
			} else {
				const defaultValue = await schema.defaultCheck(key, value as ValueType, settings);
				const isDefaultValueUndefined = Array.isArray(defaultValue) ? defaultValue.some((defaultValue) => typeof defaultValue === "undefined" || defaultValue === null) : typeof defaultValue === "undefined" || defaultValue === null;
				const parentKey = utils.parentKey(key);
				const parentValue = parentKey.length === 0 ? returnObject : utils.object.get(returnObject, parentKey);
				if (!isDefaultValueUndefined) {
					const {isValidType, typeDetailsArray} = utils.dynamoose.getValueTypeCheckResult(schema, defaultValue, key, settings, {typeIndexOptionMap});
					if (!isValidType) {
						throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetailsArray.map((detail) => detail.dynamicName ? detail.dynamicName() : detail.name.toLowerCase()).join(", ")}, instead found type ${typeof defaultValue}.`);
					} else if (typeof parentValue !== "undefined" && parentValue !== null) {
						utils.object.set(returnObject, key, defaultValue);
					}
				}
			}
		}));
	}
	// Custom Types
	if (settings.customTypesDynamo) {
		(await Item.attributesWithSchema(returnObject, model)).map((key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const typeDetails = utils.dynamoose.getValueTypeCheckResult(schema, value, key, settings, {typeIndexOptionMap}).matchedTypeDetails as DynamoDBTypeResult;
				const {customType} = typeDetails;
				const {"type": typeInfo} = typeDetails.isOfType(value as ValueType);
				const isCorrectTypeAlready = typeInfo === (settings.type === "toDynamo" ? "underlying" : "main");
				if (customType && customType.functions[settings.type] && !isCorrectTypeAlready) {
					const customValue = customType.functions[settings.type](value);
					utils.object.set(returnObject, key, customValue);
				}
			}
		});
	}
	// DynamoDB Type Handler (ex. converting sets to correct value for toDynamo & fromDynamo)
	utils.object.entries(returnObject).filter((item) => typeof item[1] === "object").forEach((item) => {
		const [key, value] = item;
		let typeDetails;
		try {
			typeDetails = utils.dynamoose.getValueTypeCheckResult(schema, value, key, settings, {typeIndexOptionMap}).matchedTypeDetails;
		} catch (e) {
			const {Schema} = require("./Schema");
			typeDetails = Schema.attributeTypes.findTypeForValue(value, settings.type, settings);
		}

		if (typeDetails && typeDetails[settings.type]) {
			utils.object.set(returnObject, key, typeDetails[settings.type](value));
		}
	});
	if (settings.combine) {
		schemaAttributes.map((key) => {
			try {
				const typeDetails = schema.getAttributeTypeDetails(key);

				return {
					key,
					"type": typeDetails
				};
			} catch (e) {} // eslint-disable-line no-empty
		}).filter((item: any) => {
			return Array.isArray(item.type) ? item.type.some((type) => type.name === "Combine") : item.type.name === "Combine";
		}).map((obj: {"key": string; "type": DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[]} | undefined): {"key": string; "type": DynamoDBTypeResult | DynamoDBSetTypeResult} => {
			if (obj && Array.isArray(obj.type)) {
				throw new Error.InvalidParameter("Combine type is not allowed to be used with multiple types.");
			}

			return obj as any;
		}).forEach((item) => {
			const {key, type} = item;

			const value = type.typeSettings.attributes.map((attribute) => utils.object.get(returnObject, attribute)).filter((value) => typeof value !== "undefined" && value !== null).join(type.typeSettings.separator);
			utils.object.set(returnObject, key, value);
		});
	}
	if (settings.modifiers) {
		await Promise.all(settings.modifiers.map(async (modifier) => {
			await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				const modifierFunction = await schema.getAttributeSettingValue(modifier, key, {"returnFunction": true, typeIndexOptionMap});
				const modifierFunctionExists: boolean = Array.isArray(modifierFunction) ? modifierFunction.some((val) => Boolean(val)) : Boolean(modifierFunction);
				const isValueUndefined = typeof value === "undefined" || value === null;
				if (modifierFunctionExists && !isValueUndefined) {
					const oldValue = object.original ? utils.object.get(object.original(), key) : undefined;
					utils.object.set(returnObject, key, await modifierFunction(value, oldValue));
				}
			}));
			const schemaModifier = schema.getInternalProperties(internalProperties).settings[modifier];
			if (schemaModifier) {
				returnObject = await schemaModifier(returnObject);
			}
		}));
	}
	if (settings.validate) {
		await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const validator = await schema.getAttributeSettingValue("validate", key, {"returnFunction": true, typeIndexOptionMap});
				if (validator) {
					let result;
					if (validator instanceof RegExp) {
						if (typeof value === "string") {
							result = validator.test(value);
						} else {
							throw new Error.ValidationError(`Trying to pass in ${typeof value} to a RegExp validator for key: ${key}.`);
						}
					} else {
						result = typeof validator === "function" ? await validator(value) : validator === value;
					}

					if (!result) {
						throw new Error.ValidationError(`${key} with a value of ${value} had a validation error when trying to save the item`);
					}
				}
			}
		}));
		const schemaValidator = schema.getInternalProperties(internalProperties).settings.validate;
		if (schemaValidator) {
			const result = await schemaValidator(returnObject);
			if (!result) {
				throw new Error.ValidationError(`${JSON.stringify(returnObject)} had a schema validation error when trying to save the item.`);
			}
		}
	}
	if (settings.required) {
		let attributesToCheck = await Item.attributesWithSchema(returnObject, model);
		if (settings.required === "nested") {
			attributesToCheck = attributesToCheck.filter((attribute) => utils.object.keys(returnObject).find((key) => attribute === key || attribute.startsWith(key + ".")));
		}
		await Promise.all(attributesToCheck.map(async (key) => {
			const check = async (): Promise<void> => {
				const value = utils.object.get(returnObject, key);
				await schema.requiredCheck(key, value as ValueType);
			};

			const keyParts = key.split(".");
			const parentKey = keyParts.slice(0, -1).join(".");
			if (parentKey) {
				const parentValue = utils.object.get(returnObject, parentKey);
				const isParentValueUndefined = typeof parentValue === "undefined" || parentValue === null;
				if (!isParentValueUndefined) {
					await check();
				}
			} else {
				await check();
			}
		}));
	}
	if (settings.enum) {
		await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const enumArray = await schema.getAttributeSettingValue("enum", key, {"returnFunction": false, typeIndexOptionMap});
				if (enumArray && !enumArray.includes(value)) {
					throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
				}
			}
		}));
	}

	// Map Attributes fromDynamo
	mapAttributes("fromDynamo");

	return {...returnObject};
};
Item.prototype.toDynamo = async function (this: Item, settings: Partial<ItemObjectFromSchemaSettings> = {}): Promise<any> {
	const newSettings: ItemObjectFromSchemaSettings = {
		...settings,
		"type": "toDynamo"
	};
	await Item.prepareForObjectFromSchema(this, this.getInternalProperties(internalProperties).model, newSettings);
	const object = await Item.objectFromSchema(this, this.getInternalProperties(internalProperties).model, newSettings);
	return Item.objectToDynamo(object);
};
// This function will modify the item to conform to the Schema
Item.prototype.conformToSchema = async function (this: Item, settings: ItemObjectFromSchemaSettings = {"type": "fromDynamo"}): Promise<Item> {
	let item = this;
	if (settings.type === "fromDynamo") {
		item = await this.prepareForResponse();
	}
	const model = item.getInternalProperties(internalProperties).model;
	await Item.prepareForObjectFromSchema(item, model, settings);
	const expectedObject = await Item.objectFromSchema(item, model, settings);
	if (!expectedObject) {
		return expectedObject;
	}
	const expectedKeys = Object.keys(expectedObject);

	if (settings.mapAttributes) {
		const schema = model.getInternalProperties(internalProperties).schemaForObject(expectedObject);
		const schemaInternalProperties = schema.getInternalProperties(internalProperties);
		const mapSettingObject = schemaInternalProperties.getMapSettingObject();

		for (const key in mapSettingObject) {
			const expectedObjectValue = utils.object.get(expectedObject, key);
			if (expectedObjectValue) {
				utils.object.set(this as any, key, expectedObjectValue);
			}
		}
	}

	for (const key in item) {
		if (!expectedKeys.includes(key)) {
			delete this[key];
		} else if (this[key] !== expectedObject[key]) {
			this[key] = expectedObject[key];
		}
	}

	return this;
};
