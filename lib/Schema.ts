import CustomError from "./Error";
import utils from "./utils";
import Internal from "./Internal";
import {Document, DocumentObjectFromSchemaSettings} from "./Document";
import {Model} from "./Model";
import { DynamoDB } from "aws-sdk";
const internalCache = Internal.Schema.internalCache;

// TODO: the interfaces below are so similar, we should consider combining them into one. We also do a lot of `DynamoDBTypeResult | DynamoDBSetTypeResult` in the code base.
export interface DynamoDBSetTypeResult {
	name: string;
	dynamodbType: string; // TODO: This should probably be an enum
	isOfType: (value: ValueType, type?: "toDynamo" | "fromDynamo", settings?: Partial<DocumentObjectFromSchemaSettings>) => boolean;
	isSet: true;
	customType?: any;

	toDynamo: (val: GeneralValueType[]) => SetValueType;
	fromDynamo: (val: SetValueType) => Set<ValueType>;
}
export interface DynamoDBTypeResult {
	name: string;
	dynamodbType: string; // TODO: This should probably be an enum
	isOfType: (value: ValueType) => {value: ValueType; type: string};
	isSet: false;
	customType?: any;

	nestedType: boolean;
	set?: DynamoDBSetTypeResult;
}

interface DynamoDBTypeCreationObject {
	name: string;
	dynamodbType: string | DynamoDBType;
	set?: boolean;
	jsType: any;
	nestedType?: boolean;
	customType?: {functions: (typeSettings: AttributeDefinitionTypeSettings) => {toDynamo: (val: ValueType) => ValueType; fromDynamo: (val: ValueType) => ValueType; isOfType: (val: ValueType, type: "toDynamo" | "fromDynamo") => boolean}};
	customDynamoName?: string;
}

class DynamoDBType implements DynamoDBTypeCreationObject {
	// TODO: since the code below will always be the exact same as DynamoDBTypeCreationObject we should see if there is a way to make it more DRY and not repeat it
	name: string;
	dynamodbType: string | DynamoDBType;
	set?: boolean;
	jsType: any;
	nestedType?: boolean;
	customType?: {functions: (typeSettings: AttributeDefinitionTypeSettings) => {toDynamo: (val: ValueType) => ValueType; fromDynamo: (val: ValueType) => ValueType; isOfType: (val: ValueType, type: "toDynamo" | "fromDynamo") => boolean}};
	customDynamoName?: string;

	constructor(obj: DynamoDBTypeCreationObject) {
		Object.keys(obj).forEach((key) => {
			this[key] = obj[key];
		});
	}

	result(typeSettings?: AttributeDefinitionTypeSettings): DynamoDBTypeResult {
		// Can't use variable below to check type, see TypeScript issue link below for more information
		// https://github.com/microsoft/TypeScript/issues/37855
		// const isSubType = this.dynamodbType instanceof DynamoDBType; // Represents underlying DynamoDB type for custom types
		const type = this.dynamodbType instanceof DynamoDBType ? this.dynamodbType : this;
		const result: DynamoDBTypeResult = {
			"name": this.name,
			"dynamodbType": this.dynamodbType instanceof DynamoDBType ? (this.dynamodbType.dynamodbType as string) : this.dynamodbType,
			"nestedType": this.nestedType,
			"isOfType": this.jsType.func ? this.jsType.func : ((val): {value: ValueType; type: string} => {
				return [{"value": this.jsType, "type": "main"}, {"value": (this.dynamodbType instanceof DynamoDBType ? type.jsType : null), "type": "underlying"}].filter((a) => Boolean(a.value)).find((jsType) => typeof jsType.value === "string" ? typeof val === jsType.value : val instanceof jsType.value);
			}),
			"isSet": false
		};
		if (type.set) {
			const typeName = type.customDynamoName || type.name;
			result.set = {
				"name": `${this.name} Set`,
				"isSet": true,
				"dynamodbType": `${type.dynamodbType}S`,
				"isOfType": (val: ValueType, type: "toDynamo" | "fromDynamo", settings: Partial<DocumentObjectFromSchemaSettings> = {}): boolean => {
					if (type === "toDynamo") {
						return (!settings.saveUnknown && Array.isArray(val) && val.every((subValue) => result.isOfType(subValue))) || (val instanceof Set && [...val].every((subValue) => result.isOfType(subValue)));
					} else {
						const setVal = val as SetValueType; // TODO: Probably bad practice here, should figure out how to do this better.
						return setVal.wrapperName === "Set" && setVal.type === typeName && Array.isArray(setVal.values);
					}
				},
				"toDynamo": (val: GeneralValueType[]): SetValueType => ({"wrapperName": "Set", "type": typeName, "values": [...val]}),
				"fromDynamo": (val: SetValueType): Set<ValueType> => new Set(val.values)
			};
			if (this.customType) {
				const functions = this.customType.functions(typeSettings);
				result.customType = {
					...this.customType,
					functions
				};
				result.set.customType = {
					"functions": {
						"toDynamo": (val: GeneralValueType[]): ValueType[] => val.map(functions.toDynamo),
						"fromDynamo": (val: SetValueType): {values: ValueType} => ({"values": val.values.map(functions.fromDynamo)}),
						"isOfType": (val: ValueType, type: "toDynamo" | "fromDynamo"): boolean => {
							if (type === "toDynamo") {
								return Array.isArray(val) && val.every((item) => functions.isOfType(item, type));
							} else {
								const setVal = val as SetValueType; // TODO: Probably bad practice here, should figure out how to do this better.
								return setVal.wrapperName === "Set" && setVal.type === typeName && Array.isArray(setVal.values);
							}
						}
					}
				};
			}
		}

		return result;
	}
}

const attributeTypesMain: DynamoDBType[] = ((): DynamoDBType[] => {
	const numberType = new DynamoDBType({"name": "Number", "dynamodbType": "N", "set": true, "jsType": "number"});
	return [
		new DynamoDBType({"name": "Buffer", "dynamodbType": "B", "set": true, "jsType": Buffer, "customDynamoName": "Binary"}),
		new DynamoDBType({"name": "Boolean", "dynamodbType": "BOOL", "jsType": "boolean"}),
		new DynamoDBType({"name": "Array", "dynamodbType": "L", "jsType": {"func": Array.isArray}, "nestedType": true}),
		new DynamoDBType({"name": "Object", "dynamodbType": "M", "jsType": {"func": (val): boolean => Boolean(val) && val.constructor === Object && (val.wrapperName !== "Set" || Object.keys(val).length !== 3 || !val.type || !val.values)}, "nestedType": true}),
		numberType,
		new DynamoDBType({"name": "String", "dynamodbType": "S", "set": true, "jsType": "string"}),
		new DynamoDBType({"name": "Date", "dynamodbType": numberType, "customType": {
			"functions": (typeSettings: AttributeDefinitionTypeSettings): {toDynamo: (val: Date) => number; fromDynamo: (val: number) => Date; isOfType: (val: Date, type: "toDynamo" | "fromDynamo") => boolean} => ({
				"toDynamo": (val: Date): number => {
					if (typeSettings.storage === "seconds") {
						return Math.round(val.getTime() / 1000);
					} else {
						return val.getTime();
					}
				},
				"fromDynamo": (val: number): Date => {
					if (typeSettings.storage === "seconds") {
						return new Date(val * 1000);
					} else {
						return new Date(val);
					}
				},
				"isOfType": (val: Date, type: "toDynamo" | "fromDynamo"): boolean => {
					return type === "toDynamo" ? val instanceof Date : typeof val === "number";
				}
			})
		}, "jsType": Date})
	];
})();
const attributeTypes: (DynamoDBTypeResult | DynamoDBSetTypeResult)[] = utils.array_flatten(attributeTypesMain.filter((checkType) => !checkType.customType).map((checkType) => checkType.result()).map((a) => [a, a.set])).filter((a) => Boolean(a));

type SetValueType = {wrapperName: "Set"; values: ValueType[]; type: string /* TODO: should probably make this an enum */};
type GeneralValueType = string | boolean | number | Buffer | Date;
export type ValueType = GeneralValueType | {[key: string]: ValueType} | ValueType[] | SetValueType;
type AttributeType = string | StringConstructor | BooleanConstructor | NumberConstructor | typeof Buffer | DateConstructor | ObjectConstructor | ArrayConstructor;

interface SchemaSettings {
	timestamps?: boolean | {createdAt?: string; updatedAt?: string};
	saveUnknown?: boolean | string[];
}
interface IndexDefinition {
	name?: string;
	global?: boolean;
	rangeKey?: string;
	project?: boolean | string[];
	throughput: number | {read: number; write: number};
}
interface AttributeDefinitionTypeSettings {
	storage?: "miliseconds" | "seconds";
}
interface AttributeDefinition {
	type: AttributeType | {value: DateConstructor; settings?: AttributeDefinitionTypeSettings} | {value: AttributeType}; // TODO add support for this being an object
	schema?: SchemaDefinition | SchemaDefinition[];
	default?: ValueType | (() => ValueType);
	forceDefault?: boolean;
	validate?: ValueType | RegExp | ((value: ValueType) => boolean);
	required?: boolean;
	enum?: ValueType[];
	get?: ((value: ValueType) => ValueType);
	set?: ((value: ValueType) => ValueType);
	index?: boolean | IndexDefinition | IndexDefinition[];
	hashKey?: boolean;
	rangeKey?: boolean;
}
export interface SchemaDefinition {
	[attribute: string]: AttributeType | AttributeDefinition;
}
interface SchemaGetAttributeTypeSettings {
	unknownAttributeAllowed: boolean;
}
interface SchemaGetAttributeSettingValue {
	returnFunction: boolean;
}

export class Schema {
	settings: SchemaSettings;
	schemaObject: SchemaDefinition;
	attributes: () => string[];
	async getCreateTableAttributeParams(model: Model<Document>): Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">> {
		const hashKey = this.getHashKey();
		const AttributeDefinitions = [
			{
				"AttributeName": hashKey,
				"AttributeType": this.getAttributeType(hashKey)
			}
		];
		const AttributeDefinitionsNames = [hashKey];
		const KeySchema = [
			{
				"AttributeName": hashKey,
				"KeyType": "HASH"
			}
		];

		const rangeKey = this.getRangeKey();
		if (rangeKey) {
			AttributeDefinitions.push({
				"AttributeName": rangeKey,
				"AttributeType": this.getAttributeType(rangeKey)
			});
			AttributeDefinitionsNames.push(rangeKey);
			KeySchema.push({
				"AttributeName": rangeKey,
				"KeyType": "RANGE"
			});
		}

		utils.array_flatten(await Promise.all([this.getIndexAttributes(), this.getIndexRangeKeyAttributes()])).map((obj) => obj.attribute).forEach((index) => {
			if (AttributeDefinitionsNames.includes(index)) {
				return;
			}

			AttributeDefinitionsNames.push(index);
			AttributeDefinitions.push({
				"AttributeName": index,
				"AttributeType": this.getAttributeType(index)
			});
		});

		return {
			AttributeDefinitions,
			KeySchema,
			...await this.getIndexes(model)
		};
	}
	getAttributeType(key: string, value?: ValueType, settings?: SchemaGetAttributeTypeSettings): string {
		try {
			return this.getAttributeTypeDetails(key).dynamodbType;
		} catch (e) {
			if (settings?.unknownAttributeAllowed && e.message === `Invalid Attribute: ${key}` && value) {
				return Object.keys((Document as any).objectToDynamo(value, {"type": "value"}))[0];
			} else {
				throw e;
			}
		}
	}
	static attributeTypes = {
		"findDynamoDBType": (type): DynamoDBTypeResult | DynamoDBSetTypeResult => attributeTypes.find((checkType) => checkType.dynamodbType === type),
		"findTypeForValue": (...args): DynamoDBTypeResult | DynamoDBSetTypeResult => attributeTypes.find((checkType) => (checkType.isOfType as any)(...args))
	};

	getHashKey: () => string;
	getRangeKey: () => string | void;
	// This function will take in an attribute and value, and returns the default value if it should be applied.
	async defaultCheck(key: string, value: ValueType, settings: any): Promise<ValueType | void> {
		const isValueUndefined = typeof value === "undefined" || value === null;
		if ((settings.defaults && isValueUndefined) || (settings.forceDefault && await this.getAttributeSettingValue("forceDefault", key))) {
			const defaultValue = await this.getAttributeSettingValue("default", key);
			const isDefaultValueUndefined = typeof defaultValue === "undefined" || defaultValue === null;
			if (!isDefaultValueUndefined) {
				return defaultValue;
			}
		}
	}
	requiredCheck: (key: string, value: ValueType) => Promise<void>;
	getAttributeSettingValue(setting: string, key: string, settings: SchemaGetAttributeSettingValue = {"returnFunction": false}): any {
		const defaultPropertyValue = (this.getAttributeValue(key) || {})[setting];
		return typeof defaultPropertyValue === "function" && !settings.returnFunction ? defaultPropertyValue() : defaultPropertyValue;
	}
	getIndexAttributes: () => Promise<{ index: IndexDefinition; attribute: string }[]>;
	getSettingValue: (setting: string) => any;
	getAttributeTypeDetails: (key: string, settings?: { standardKey?: boolean }) => DynamoDBTypeResult | DynamoDBSetTypeResult;
	getAttributeValue: (key: string, settings?: { standardKey?: boolean }) => AttributeDefinition;
	getIndexes: (model: Model<Document>) => Promise<{ GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[] }>;
	getIndexRangeKeyAttributes: () => Promise<{ attribute: string }[]>;

	constructor(object: SchemaDefinition, settings: SchemaSettings = {}) {
		if (!object || typeof object !== "object" || Array.isArray(object)) {
			throw new CustomError.InvalidParameterType("Schema initalization parameter must be an object.");
		}
		if (Object.keys(object).length === 0) {
			throw new CustomError.InvalidParameter("Schema initalization parameter must not be an empty object.");
		}

		if (settings.timestamps === true) {
			settings.timestamps = {
				"createdAt": "createdAt",
				"updatedAt": "updatedAt"
			};
		}
		if (settings.timestamps) {
			if (object[settings.timestamps.createdAt] || object[settings.timestamps.updatedAt]) {
				throw new CustomError.InvalidParameter("Timestamp attributes must not be defined in schema.");
			}

			object[settings.timestamps.createdAt] = Date;
			object[settings.timestamps.updatedAt] = Date;
		}

		// Anytime `this.schemaObject` is modified, `this[internalCache].attributes` must be set to undefined or null
		this.schemaObject = object;
		this.settings = settings;
		Object.defineProperty(this, internalCache, {
			"configurable": false,
			"value": {
				"getAttributeTypeDetails": {}
			}
		});

		const checkAttributeNameDots = (object: SchemaDefinition/*, existingKey = ""*/): void => {
			Object.keys(object).forEach((key) => {
				if (key.includes(".")) {
					throw new CustomError.InvalidParameter("Attributes must not contain dots.");
				}

				// TODO: lots of `as` statements in the two lines below. We should clean that up.
				if (typeof object[key] === "object" && (object[key] as AttributeDefinition).schema) {
					checkAttributeNameDots(((object[key] as AttributeDefinition).schema as SchemaDefinition)/*, key*/);
				}
			});
		};
		checkAttributeNameDots(this.schemaObject);

		const checkMultipleArraySchemaElements = (key: string): void => {
			let attributeType: string;
			try {
				attributeType = this.getAttributeType(key);
			} catch (e) {} // eslint-disable-line no-empty

			if (attributeType === "L" && (this.getAttributeValue(key).schema || []).length > 1) {
				throw new CustomError.InvalidParameter("You must only pass one element into schema array.");
			}
		};
		this.attributes().forEach((key) => checkMultipleArraySchemaElements(key));
	}
}

// TODO: in the two functions below I don't think we should be using as. We should try to clean that up.
Schema.prototype.getHashKey = function(this: Schema): string {
	return Object.keys(this.schemaObject).find((key) => (this.schemaObject[key] as AttributeDefinition).hashKey) || Object.keys(this.schemaObject)[0];
};
Schema.prototype.getRangeKey = function(this: Schema): string | void {
	return Object.keys(this.schemaObject).find((key) => (this.schemaObject[key] as AttributeDefinition).rangeKey);
};

// This function will take in an attribute and value, and throw an error if the property is required and the value is undefined or null.
Schema.prototype.requiredCheck = async function(this: Schema, key: string, value: ValueType): Promise<void> {
	const isRequired = await this.getAttributeSettingValue("required", key);
	if ((typeof value === "undefined" || value === null) && isRequired) {
		throw new CustomError.ValidationError(`${key} is a required property but has no value when trying to save document`);
	}
};

Schema.prototype.getIndexAttributes = async function(this: Schema): Promise<{index: IndexDefinition; attribute: string}[]> {
	return (await Promise.all(this.attributes().map(async (attribute: string) => ({"index": (await this.getAttributeSettingValue("index", attribute) as IndexDefinition), attribute})))).filter((obj) => obj.index);
};
Schema.prototype.getIndexRangeKeyAttributes = async function(this: Schema): Promise<{attribute: string}[]> {
	const indexes: ({index: IndexDefinition; attribute: string})[] = await this.getIndexAttributes();
	return indexes.map((index) => index.index.rangeKey).filter((a) => Boolean(a)).map((a) => ({"attribute": a}));
};
export interface IndexItem {
	IndexName: string;
	KeySchema: ({AttributeName: string; KeyType: "HASH" | "RANGE"})[];
	Projection: {ProjectionType: "KEYS_ONLY" | "INCLUDE" | "ALL"; NonKeyAttributes?: string[]};
	ProvisionedThroughput?: {"ReadCapacityUnits": number; "WriteCapacityUnits": number}; // TODO: this was copied from get_provisioned_throughput. We should change this to be an actual interface
}
Schema.prototype.getIndexes = async function(this: Schema, model: Model<Document>): Promise<{GlobalSecondaryIndexes?: IndexItem[]; LocalSecondaryIndexes?: IndexItem[]}> {
	return (await this.getIndexAttributes()).reduce((accumulator, currentValue) => {
		const indexValue = currentValue.index;
		const attributeValue = currentValue.attribute;

		const dynamoIndexObject: IndexItem = {
			"IndexName": indexValue.name || `${attributeValue}${indexValue.global ? "GlobalIndex" : "LocalIndex"}`,
			"KeySchema": [{"AttributeName": attributeValue, "KeyType": "HASH"}],
			"Projection": {"ProjectionType": "KEYS_ONLY"}
		};
		if (indexValue.project || typeof indexValue.project === "undefined" || indexValue.project === null) {
			dynamoIndexObject.Projection = Array.isArray(indexValue.project) ? ({"ProjectionType": "INCLUDE", "NonKeyAttributes": indexValue.project}) : ({"ProjectionType": "ALL"});
		}
		if (indexValue.rangeKey) {
			dynamoIndexObject.KeySchema.push({"AttributeName": indexValue.rangeKey, "KeyType": "RANGE"});
		}
		if (indexValue.global) {
			const throughputObject = utils.dynamoose.get_provisioned_throughput(indexValue.throughput ? indexValue : model.options);
			// TODO: fix up the two lines below. Using too many `as` statements.
			if ((throughputObject as {"ProvisionedThroughput": {"ReadCapacityUnits": number; "WriteCapacityUnits": number}}).ProvisionedThroughput) {
				dynamoIndexObject.ProvisionedThroughput = (throughputObject as {"ProvisionedThroughput": {"ReadCapacityUnits": number; "WriteCapacityUnits": number}}).ProvisionedThroughput;
			}
		}
		if (!accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")]) {
			accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")] = [];
		}
		accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")].push(dynamoIndexObject);

		return accumulator;
	}, {});
};

Schema.prototype.getSettingValue = function(this: Schema, setting: string): any {
	return this.settings[setting];
};

function attributesAction(this: Schema): string[] {
	const main = (object: SchemaDefinition, existingKey = ""): string[] => {
		return Object.keys(object).reduce((accumulator: string[], key) => {
			const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
			accumulator.push(keyWithExisting);

			let attributeType;
			try {
				attributeType = this.getAttributeType(keyWithExisting);
			} catch (e) {} // eslint-disable-line no-empty

			// TODO: using too many `as` statements in the two lines below. Clean that up.
			if ((attributeType === "M" || attributeType === "L") && (object[key] as AttributeDefinition).schema) {
				accumulator.push(...main(((object[key] as AttributeDefinition).schema as SchemaDefinition), keyWithExisting));
			}

			return accumulator;
		}, []);
	};

	return main(this.schemaObject);
}
Schema.prototype.attributes = function(this: Schema): string[] {
	if (!this[internalCache].attributes) {
		this[internalCache].attributes = attributesAction.call(this);
	}

	return this[internalCache].attributes;
};

Schema.prototype.getAttributeValue = function(this: Schema, key: string, settings?: {standardKey?: boolean}): AttributeDefinition {
	return (settings?.standardKey ? key : key.replace(/\.\d+/gu, ".0")).split(".").reduce((result, part) => {
		return (utils.object.get(result.schema, part));
	}, ({"schema": this.schemaObject} as any));
};

function retrieveTypeInfo(type: string, isSet: boolean, key: string, typeSettings: AttributeDefinitionTypeSettings): DynamoDBTypeResult | DynamoDBSetTypeResult {
	const foundType = attributeTypesMain.find((checkType) => checkType.name.toLowerCase() === type.toLowerCase());
	if (!foundType) {
		throw new CustomError.InvalidType(`${key} contains an invalid type: ${type}`);
	}
	const parentType = foundType.result(typeSettings);
	if (!parentType.set && isSet) {
		throw new CustomError.InvalidType(`${key} with type: ${type} is not allowed to be a set`);
	}
	return isSet ? parentType.set : parentType;
}
// TODO: using too many `as` statements in the function below. We should clean this up.
Schema.prototype.getAttributeTypeDetails = function(this: Schema, key: string, settings: {standardKey?: boolean} = {}): DynamoDBTypeResult | DynamoDBSetTypeResult {
	const standardKey = (settings.standardKey ? key : key.replace(/\.\d+/gu, ".0"));
	if (this[internalCache].getAttributeTypeDetails[standardKey]) {
		return this[internalCache].getAttributeTypeDetails[standardKey];
	}
	const val = this.getAttributeValue(standardKey, {"standardKey": true});
	if (!val) {
		throw new CustomError.UnknownAttribute(`Invalid Attribute: ${key}`);
	}
	let typeVal = typeof val === "object" && !Array.isArray(val) ? val.type : val;
	let typeSettings = {};
	if (typeof typeVal === "object" && !Array.isArray(typeVal)) {
		typeSettings = (typeVal as {value: DateConstructor; settings?: AttributeDefinitionTypeSettings}).settings || {};
		typeVal = typeVal.value;
	}

	const getType = (typeVal): string => {
		let type: string;
		if (typeof typeVal === "function") {
			const regexFuncName = /^Function ([^(]+)\(/iu;
			[, type] = typeVal.toString().match(regexFuncName);
		} else {
			type = (typeVal as string);
		}
		return type;
	};
	let type = getType(typeVal);
	const isSet = type.toLowerCase() === "set";
	if (isSet) {
		type = getType(this.getAttributeSettingValue("schema", key)[0]);
	}

	const returnObject = retrieveTypeInfo(type, isSet, key, typeSettings);
	this[internalCache].getAttributeTypeDetails[standardKey] = returnObject;
	return returnObject;
};
