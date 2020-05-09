import aws = require("./aws");
import ddb = require("./aws/ddb/internal");
import utils = require("./utils");
import Error = require("./Error");
import Internal  = require("./Internal");
import {Model, ModelExpiresSettings} from "./Model";
import {DynamoDBTypeResult, DynamoDBSetTypeResult} from "./Schema";
const {internalProperties} = Internal.General;
const dynamooseUndefined = Internal.Public.undefined;

import { DynamoDB, AWSError } from "aws-sdk";
import { ValueType } from "./Schema";
import { CallbackType, ObjectType } from "./General";

export interface DocumentSaveSettings {
	overwrite?: boolean;
	return?: "request" | "document";
}
export interface DocumentSettings {
	type?: "fromDynamo" | "toDynamo";
}

// Document represents an item in a Model that is either pending (not saved) or saved
export class Document {
	constructor(model: Model<Document>, object?: DynamoDB.AttributeMap | ObjectType, settings?: DocumentSettings) {
		const documentObject = Document.isDynamoObject(object) ? aws.converter().unmarshall(object) : object;
		Object.keys(documentObject).forEach((key) => this[key] = documentObject[key]);
		Object.defineProperty(this, internalProperties, {
			"configurable": false,
			"value": {}
		});
		this[internalProperties].originalObject = {...documentObject};
		this[internalProperties].originalSettings = {...settings};

		Object.defineProperty(this, "model", {
			"configurable": false,
			"value": model
		});

		if (settings.type === "fromDynamo") {
			this[internalProperties].storedInDynamo = true;
		}
	}

	// Internal
	model?: Model<Document>;
	static objectToDynamo(object: ObjectType): DynamoDB.AttributeMap;
	static objectToDynamo(object: any, settings: {type: "value"}): DynamoDB.AttributeValue;
	static objectToDynamo(object: ObjectType, settings: {type: "object"}): DynamoDB.AttributeMap;
	static objectToDynamo(object: any, settings: {type: "object" | "value"} = {"type": "object"}): DynamoDB.AttributeValue | DynamoDB.AttributeMap {
		return (settings.type === "value" ? aws.converter().input : aws.converter().marshall)(object);
	}
	static fromDynamo(object: DynamoDB.AttributeMap): ObjectType {
		return aws.converter().unmarshall(object);
	}
	// This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
	static isDynamoObject(object: ObjectType, recurrsive?: boolean): boolean | null {
		function isValid(value): boolean {
			if (typeof value === "undefined" || value === null) {
				return false;
			}
			const keys = Object.keys(value);
			const key = keys[0];
			const nestedResult = (typeof value[key] === "object" && !(value[key] instanceof Buffer) ? (Array.isArray(value[key]) ? value[key].every((value) => Document.isDynamoObject(value, true)) : Document.isDynamoObject(value[key])) : true);
			const {Schema} = require("./Schema");
			const attributeType = Schema.attributeTypes.findDynamoDBType(key);
			return typeof value === "object" && keys.length === 1 && attributeType && (nestedResult || Object.keys(value[key]).length === 0 || attributeType.isSet);
		}

		const keys = Object.keys(object);
		const values = Object.values(object);
		if (keys.length === 0) {
			return null;
		} else {
			return recurrsive ? isValid(object) : values.every((value) => isValid(value));
		}
	}

	static attributesWithSchema: (document: Document, model: Model<Document>) => string[];
	static objectFromSchema: (object: any, model: Model<Document>, settings?: DocumentObjectFromSchemaSettings) => Promise<any>;
	static prepareForObjectFromSchema: (object: any, model: Model<Document>, settings: DocumentObjectFromSchemaSettings) => any;
	conformToSchema: (this: Document, settings?: DocumentObjectFromSchemaSettings) => Promise<Document>;
	toDynamo: (this: Document, settings?: Partial<DocumentObjectFromSchemaSettings>) => Promise<any>;

	// Original
	original (): ObjectType | null {
		return this[internalProperties].originalSettings.type === "fromDynamo" ? this[internalProperties].originalObject : null;
	}

	// Delete
	delete(this: Document): Promise<void>;
	delete(this: Document, callback: CallbackType<void, AWSError>): void;
	delete(this: Document, callback?: CallbackType<void, AWSError>): Promise<void> | void {
		return this.model.delete({
			[this.model.schema.getHashKey()]: this[this.model.schema.getHashKey()]
		}, callback);
	}

	// Save
	save(this: Document): Promise<Document>;
	save(this: Document, callback: CallbackType<Document, AWSError>): void;
	save(this: Document, settings: DocumentSaveSettings & {return: "request"}): Promise<DynamoDB.PutItemInput>;
	save(this: Document, settings: DocumentSaveSettings & {return: "request"}, callback: CallbackType<DynamoDB.PutItemInput, AWSError>): void;
	save(this: Document, settings: DocumentSaveSettings & {return: "document"}): Promise<Document>;
	save(this: Document, settings: DocumentSaveSettings & {return: "document"}, callback: CallbackType<Document, AWSError>): void;
	save(this: Document, settings?: DocumentSaveSettings | CallbackType<Document, AWSError> | CallbackType<DynamoDB.PutItemInput, AWSError>, callback?: CallbackType<Document, AWSError> | CallbackType<DynamoDB.PutItemInput, AWSError>): void | Promise<Document | DynamoDB.PutItemInput> {
		if (typeof settings !== "object" && typeof settings !== "undefined") {
			callback = settings;
			settings = {};
		}
		if (typeof settings === "undefined") {
			settings = {};
		}

		const localSettings: DocumentSaveSettings = settings;
		const paramsPromise = this.toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"]}).then((item) => {
			const putItemObj: DynamoDB.PutItemInput = {
				"Item": item,
				"TableName": this.model.name
			};

			if (localSettings.overwrite === false) {
				putItemObj.ConditionExpression = "attribute_not_exists(#__hash_key)";
				putItemObj.ExpressionAttributeNames = {"#__hash_key": this.model.schema.getHashKey()};
			}

			return putItemObj;
		});
		if (settings.return === "request") {
			if (callback) {
				const localCallback: CallbackType<DynamoDB.PutItemInput, AWSError> = callback as CallbackType<DynamoDB.PutItemInput, AWSError>;
				paramsPromise.then((result) => localCallback(null, result));
				return;
			} else {
				return paramsPromise;
			}
		}
		const promise: Promise<DynamoDB.PutItemOutput> = Promise.all([paramsPromise, this.model.pendingTaskPromise()]).then((promises) => {
			const [putItemObj] = promises;
			return ddb("putItem", putItemObj);
		});

		if (callback) {
			const localCallback: CallbackType<Document, AWSError> = callback as CallbackType<Document, AWSError>;
			promise.then(() => {this[internalProperties].storedInDynamo = true; localCallback(null, this);}).catch((error) => callback(error));
		} else {
			return (async (): Promise<Document> => {
				await promise;
				this[internalProperties].storedInDynamo = true;
				return this;
			})();
		}
	}
}

// This function will mutate the object passed in to run any actions to conform to the schema that cannot be achieved through non mutating methods in Document.objectFromSchema (setting timestamps, etc.)
Document.prepareForObjectFromSchema = function<T>(object: T, model: Model<Document>, settings: DocumentObjectFromSchemaSettings): T {
	if (settings.updateTimestamps) {
		if (model.schema.settings.timestamps && settings.type === "toDynamo") {
			const date = new Date();
			// TODO: The last condition of the following is commented out until we can add automated tests for it
			if ((model.schema.settings.timestamps as {createdAt?: string; updatedAt?: string}).createdAt && (object[internalProperties] && !object[internalProperties].storedInDynamo)/* && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.createdAt)*/) {
				object[(model.schema.settings.timestamps as {createdAt?: string; updatedAt?: string}).createdAt] = date;
			}
			if ((model.schema.settings.timestamps as {createdAt?: string; updatedAt?: string}).updatedAt && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.updatedAt)) {
				object[(model.schema.settings.timestamps as {createdAt?: string; updatedAt?: string}).updatedAt] = date;
			}
		}
	}
	return object;
};
// This function will return a list of attributes combining both the schema attributes with the document attributes. This also takes into account all attributes that could exist (ex. properties in sets that don't exist in document), adding the indexes for each item in the document set.
// https://stackoverflow.com/a/59928314/894067
const attributesWithSchemaCache: ObjectType = {};
Document.attributesWithSchema = function(document: Document, model: Model<Document>): string[] {
	const attributes = model.schema.attributes();
	const documentID = utils.object.keys(document as any).join("");
	if (attributesWithSchemaCache[documentID] && attributesWithSchemaCache[documentID][attributes.join()]) {
		return attributesWithSchemaCache[documentID][attributes.join()];
	}
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
				if (!node || node.length == 0) {
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
	traverse(document, root, [], (val) => out.push(val.join(".")));
	const result = out.slice(1);
	attributesWithSchemaCache[documentID] = {[attributes.join()]: result};
	return result;
};
export interface DocumentObjectFromSchemaSettings {
	type: "toDynamo" | "fromDynamo";
	checkExpiredItem?: boolean;
	saveUnknown?: boolean;
	defaults?: boolean;
	forceDefault?: boolean;
	customTypesDynamo?: boolean;
	validate?: boolean;
	required?: boolean | "nested";
	enum?: boolean;
	modifiers?: ("set" | "get")[];
	updateTimestamps?: boolean | {updatedAt?: boolean; createdAt?: boolean};
}
// This function will return an object that conforms to the schema (removing any properties that don't exist, using default values, etc.) & throws an error if there is a typemismatch.
Document.objectFromSchema = async function(object: any, model: Model<Document>, settings: DocumentObjectFromSchemaSettings = {"type": "toDynamo"}): Promise<ObjectType> {
	if (settings.checkExpiredItem && model.options.expires && ((model.options.expires as ModelExpiresSettings).items || {}).returnExpired === false && object[(model.options.expires as ModelExpiresSettings).attribute] && (object[(model.options.expires as ModelExpiresSettings).attribute] * 1000) < Date.now()) {
		return undefined;
	}

	const returnObject = {...object};
	const schemaAttributes = model.schema.attributes();

	// Type check
	const validParents = []; // This array is used to allow for set contents to not be type checked
	const keysToDelete = [];
	const getValueTypeCheckResult = (value: any, key: string, options = {}): {typeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult; isValidType: boolean} => {
		const typeDetails = model.schema.getAttributeTypeDetails(key, options);
		const isValidType = [((typeDetails.customType || {}).functions || {}).isOfType, typeDetails.isOfType].filter((a) => Boolean(a)).some((func) => func(value, settings.type));
		return {typeDetails, isValidType};
	};
	const checkTypeFunction = (item): void => {
		const [key, value] = item;
		if (validParents.find((parent) => key.startsWith(parent.key) && (parent.infinite || key.split(".").length === parent.key.split(".").length + 1))) {
			return;
		}
		const genericKey = key.replace(/\.\d+/gu, ".0"); // This is a key replacing all list numbers with 0 to standardize things like checking if it exists in the schema
		const existsInSchema = schemaAttributes.includes(genericKey);
		if (existsInSchema) {
			const {isValidType, typeDetails} = getValueTypeCheckResult(value, genericKey, {"standardKey": true});
			if (!isValidType) {
				throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetails.name.toLowerCase()}, instead found type ${typeof value}.`);
			} else if (typeDetails.isSet) {
				validParents.push({key, "infinite": true});
			} else if (/*typeDetails.dynamodbType === "M" || */typeDetails.dynamodbType === "L") {
				// The code below is an optimization for large array types to speed up the process of not having to check the type for every element but only the ones that are different
				value.forEach((subValue, index: number, array: any[]) => {
					if (index === 0 || typeof subValue !== typeof array[0]) {
						checkTypeFunction([`${key}.${index}`, subValue]);
					}
				});
				validParents.push({key});
			}
		} else {
			// Check saveUnknown
			if (!settings.saveUnknown || !utils.dynamoose.wildcard_allowed_check(model.schema.getSettingValue("saveUnknown"), key)) {
				keysToDelete.push(key);
			}
		}
	};
	utils.object.entries(returnObject).filter((item) => item[1] !== undefined && item[1] !== dynamooseUndefined).map(checkTypeFunction);
	keysToDelete.reverse().forEach((key) => utils.object.delete(returnObject, key));

	if (settings.defaults || settings.forceDefault) {
		await Promise.all(Document.attributesWithSchema(returnObject, model).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			if (value === dynamooseUndefined) {
				utils.object.set(returnObject, key, undefined);
			} else {
				const defaultValue = await model.schema.defaultCheck(key, value as ValueType, settings);
				const isDefaultValueUndefined = typeof defaultValue === "undefined" || defaultValue === null;
				if (!isDefaultValueUndefined) {
					const {isValidType, typeDetails} = getValueTypeCheckResult(defaultValue, key);
					if (!isValidType) {
						throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetails.name.toLowerCase()}, instead found type ${typeof defaultValue}.`);
					} else {
						utils.object.set(returnObject, key, defaultValue);
					}
				}
			}
		}));
	}
	// Custom Types
	if (settings.customTypesDynamo) {
		Document.attributesWithSchema(returnObject, model).map((key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const typeDetails = model.schema.getAttributeTypeDetails(key) as DynamoDBTypeResult;
				const {customType} = typeDetails;
				const {type: typeInfo} = typeDetails.isOfType(value as ValueType);
				const isCorrectTypeAlready = typeInfo === (settings.type === "toDynamo" ? "underlying" : "main");
				if (customType && !isCorrectTypeAlready) {
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
			typeDetails = model.schema.getAttributeTypeDetails(key);
		} catch (e) {
			const {Schema} = require("./Schema");
			typeDetails = Schema.attributeTypes.findTypeForValue(value, settings.type, settings);
		}

		if (typeDetails && typeDetails[settings.type]) {
			utils.object.set(returnObject, key, typeDetails[settings.type](value));
		}
	});
	if (settings.modifiers) {
		await Promise.all(settings.modifiers.map((modifier) => {
			return Promise.all(Document.attributesWithSchema(returnObject, model).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				const modifierFunction = await model.schema.getAttributeSettingValue(modifier, key, {"returnFunction": true});
				const isValueUndefined = typeof value === "undefined" || value === null;
				if (modifierFunction && !isValueUndefined) {
					utils.object.set(returnObject, key, await modifierFunction(value));
				}
			}));
		}));
	}
	if (settings.validate) {
		await Promise.all(Document.attributesWithSchema(returnObject, model).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const validator = await model.schema.getAttributeSettingValue("validate", key, {"returnFunction": true});
				if (validator) {
					let result;
					if (validator instanceof RegExp) {
						// TODO: fix the line below to not use `as`. This will cause a weird issue even in vanilla JS, where if your validator is a Regular Expression but the type isn't a string, it will throw a super random error.
						result = validator.test(value as string);
					} else {
						result = typeof validator === "function" ? await validator(value) : validator === value;
					}

					if (!result) {
						throw new Error.ValidationError(`${key} with a value of ${value} had a validation error when trying to save the document`);
					}
				}
			}
		}));
	}
	if (settings.required) {
		let attributesToCheck = Document.attributesWithSchema(returnObject, model);
		if (settings.required === "nested") {
			attributesToCheck = attributesToCheck.filter((attribute) => utils.object.keys(returnObject).find((key) => attribute.startsWith(key)));
		}
		await Promise.all(attributesToCheck.map(async (key) => {
			const check = async (): Promise<void> => {
				const value = utils.object.get(returnObject, key);
				await model.schema.requiredCheck(key, (value as ValueType));
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
		await Promise.all(Document.attributesWithSchema(returnObject, model).map(async (key) => {
			const value = utils.object.get(returnObject, key);
			const isValueUndefined = typeof value === "undefined" || value === null;
			if (!isValueUndefined) {
				const enumArray = await model.schema.getAttributeSettingValue("enum", key);
				if (enumArray && !enumArray.includes(value)) {
					throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
				}
			}
		}));
	}

	return returnObject;
};
Document.prototype.toDynamo = async function(this: Document, settings: Partial<DocumentObjectFromSchemaSettings> = {}): Promise<any> {
	const newSettings: DocumentObjectFromSchemaSettings = {
		...settings,
		"type": "toDynamo"
	};
	Document.prepareForObjectFromSchema(this, this.model, newSettings);
	const object = await Document.objectFromSchema(this, this.model, newSettings);
	return Document.objectToDynamo(object);
};
// This function will modify the document to conform to the Schema
Document.prototype.conformToSchema = async function(this: Document, settings: DocumentObjectFromSchemaSettings = {"type": "fromDynamo"}): Promise<Document> {
	Document.prepareForObjectFromSchema(this, this.model, settings);
	const expectedObject = await Document.objectFromSchema(this, this.model, settings);
	if (!expectedObject) {
		return expectedObject;
	}
	const expectedKeys = Object.keys(expectedObject);
	Object.keys(this).forEach((key) => {
		if (!expectedKeys.includes(key)) {
			delete this[key];
		} else if (this[key] !== expectedObject[key]) {
			this[key] = expectedObject[key];
		}
	});

	return this;
};
