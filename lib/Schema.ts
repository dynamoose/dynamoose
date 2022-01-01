import CustomError from "./Error";
import utils from "./utils";
import Internal from "./Internal";
import {Item, ItemObjectFromSchemaSettings} from "./Item";
import {Model, ModelIndexes} from "./Model";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import {ModelType, ObjectType} from "./General";
import {InternalPropertiesClass} from "./InternalPropertiesClass";
const {internalProperties} = Internal.General;

type DynamoDBAttributeType = keyof DynamoDB.AttributeValue;

// TODO: the interfaces below are so similar, we should consider combining them into one. We also do a lot of `DynamoDBTypeResult | DynamoDBSetTypeResult` in the code base.
export interface DynamoDBSetTypeResult {
	name: string;
	dynamicName?: (() => string);
	dynamodbType: DynamoDBAttributeType;
	isOfType: (value: ValueType, type?: "toDynamo" | "fromDynamo", settings?: Partial<ItemObjectFromSchemaSettings>) => boolean;
	isSet: true;
	customType?: any;
	typeSettings?: AttributeDefinitionTypeSettings;

	toDynamo: (val: GeneralValueType[] | Set<GeneralValueType>) => Set<GeneralValueType>;
}
export interface DynamoDBTypeResult {
	name: string;
	dynamicName?: (() => string);
	dynamodbType: DynamoDBAttributeType | DynamoDBAttributeType[];
	isOfType: (value: ValueType) => {value: ValueType; type: string};
	isSet: false;
	customType?: any;
	typeSettings?: AttributeDefinitionTypeSettings;

	nestedType: boolean;
	set?: DynamoDBSetTypeResult;
}

interface DynamoDBTypeCreationObject {
	name: string;
	dynamicName?: ((typeSettings?: AttributeDefinitionTypeSettings) => string);
	dynamodbType?: DynamoDBAttributeType | DynamoDBAttributeType[] | DynamoDBType | ((typeSettings: AttributeDefinitionTypeSettings) => string | string[]);
	set?: boolean | ((typeSettings?: AttributeDefinitionTypeSettings) => boolean);
	jsType?: any;
	nestedType?: boolean;
	customType?: {functions: (typeSettings: AttributeDefinitionTypeSettings) => {toDynamo?: (val: ValueType) => ValueType; fromDynamo?: (val: ValueType) => ValueType; isOfType: (val: ValueType, type: "toDynamo" | "fromDynamo") => boolean}};
}

class DynamoDBType implements DynamoDBTypeCreationObject {
	// TODO: since the code below will always be the exact same as DynamoDBTypeCreationObject we should see if there is a way to make it more DRY and not repeat it
	name: string;
	dynamicName?: ((typeSettings?: AttributeDefinitionTypeSettings) => string);
	dynamodbType?: DynamoDBAttributeType | DynamoDBAttributeType[] | DynamoDBType | ((typeSettings: AttributeDefinitionTypeSettings) => DynamoDBAttributeType | DynamoDBAttributeType[]);
	set?: boolean | ((typeSettings?: AttributeDefinitionTypeSettings) => boolean);
	jsType?: any;
	nestedType?: boolean;
	customType?: {functions: (typeSettings: AttributeDefinitionTypeSettings) => {toDynamo?: (val: ValueType) => ValueType; fromDynamo?: (val: ValueType) => ValueType; isOfType: (val: ValueType, type: "toDynamo" | "fromDynamo") => boolean}};

	constructor (obj: DynamoDBTypeCreationObject) {
		Object.keys(obj).forEach((key) => {
			this[key] = obj[key];
		});
	}

	result (typeSettings?: AttributeDefinitionTypeSettings): DynamoDBTypeResult {
		// Can't use variable below to check type, see TypeScript issue link below for more information
		// https://github.com/microsoft/TypeScript/issues/37855
		// const isSubType = this.dynamodbType instanceof DynamoDBType; // Represents underlying DynamoDB type for custom types
		const type = this.dynamodbType instanceof DynamoDBType ? this.dynamodbType : this;
		const dynamodbType: DynamoDBAttributeType | DynamoDBAttributeType[] = ((): DynamoDBAttributeType | DynamoDBAttributeType[] => {
			if (this.dynamodbType instanceof DynamoDBType) {
				return this.dynamodbType.dynamodbType as DynamoDBAttributeType;
			} else if (typeof this.dynamodbType === "function") {
				return this.dynamodbType(typeSettings);
			} else {
				return this.dynamodbType;
			}
		})();
		const result: DynamoDBTypeResult = {
			"name": this.name,
			dynamodbType,
			"nestedType": this.nestedType,
			"isOfType": this.jsType.func ? (val) => this.jsType.func(val, typeSettings) : (val): {value: ValueType; type: string} => {
				return [{"value": this.jsType, "type": "main"}, {"value": this.dynamodbType instanceof DynamoDBType ? type.jsType : null, "type": "underlying"}].filter((a) => Boolean(a.value)).find((jsType) => typeof jsType.value === "string" ? typeof val === jsType.value : val instanceof jsType.value);
			},
			"isSet": false,
			typeSettings
		};
		if (this.dynamicName) {
			result.dynamicName = (): string => this.dynamicName(typeSettings);
		}

		if (this.customType) {
			const functions = this.customType.functions(typeSettings);
			result.customType = {
				...this.customType,
				functions
			};
		}

		const isSetAllowed = typeof type.set === "function" ? type.set(typeSettings) : type.set;
		if (isSetAllowed) {
			result.set = {
				"name": `${this.name} Set`,
				"isSet": true,
				"dynamodbType": `${dynamodbType}S` as DynamoDBAttributeType | DynamoDBAttributeType,
				"isOfType": (val: ValueType, type: "toDynamo" | "fromDynamo", settings: Partial<ItemObjectFromSchemaSettings> = {}): boolean => {
					if (type === "toDynamo") {
						return !settings.saveUnknown && Array.isArray(val) && val.every((subValue) => result.isOfType(subValue)) || val instanceof Set && [...val].every((subValue) => result.isOfType(subValue));
					} else {
						return val instanceof Set;
					}
				},
				"toDynamo": (val: GeneralValueType[] | Set<GeneralValueType>): Set<GeneralValueType> => Array.isArray(val) ? new Set(val) : val,
				typeSettings
			};
			if (this.dynamicName) {
				result.set.dynamicName = (): string => `${this.dynamicName(typeSettings)} Set`;
			}
			if (this.customType) {
				result.set.customType = {
					"functions": {
						"toDynamo": (val: GeneralValueType[]): ValueType[] => val.map(result.customType.functions.toDynamo),
						"fromDynamo": (val: Iterator<GeneralValueType>): Set<GeneralValueType> => new Set([...val as any].map(result.customType.functions.fromDynamo)),
						"isOfType": (val: ValueType, type: "toDynamo" | "fromDynamo"): boolean => {
							if (type === "toDynamo") {
								return (val instanceof Set || Array.isArray(val) && new Set(val as any).size === val.length) && [...val].every((item) => result.customType.functions.isOfType(item, type));
							} else {
								return val instanceof Set;
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
	const stringType = new DynamoDBType({"name": "String", "dynamodbType": "S", "set": true, "jsType": "string"});
	const booleanType = new DynamoDBType({"name": "Boolean", "dynamodbType": "BOOL", "jsType": "boolean"});
	return [
		new DynamoDBType({"name": "Any", "jsType": {"func": (): boolean => true}}),
		new DynamoDBType({"name": "Null", "dynamodbType": "NULL", "set": false, "jsType": {"func": (val): boolean => val === null}}),
		new DynamoDBType({"name": "Buffer", "dynamodbType": "B", "set": true, "jsType": Buffer}),
		booleanType,
		new DynamoDBType({"name": "Array", "dynamodbType": "L", "jsType": {"func": Array.isArray}, "nestedType": true}),
		new DynamoDBType({"name": "Object", "dynamodbType": "M", "jsType": {"func": (val): boolean => Boolean(val) && val.constructor === Object}, "nestedType": true}),
		numberType,
		stringType,
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
		}, "jsType": Date}),
		new DynamoDBType({"name": "Combine", "dynamodbType": stringType, "set": false, "jsType": String}),
		new DynamoDBType({"name": "Constant", "dynamicName": (typeSettings?: AttributeDefinitionTypeSettings): string => {
			return `constant ${typeof typeSettings.value} (${typeSettings.value})`;
		}, "customType": {
			"functions": (typeSettings: AttributeDefinitionTypeSettings): {isOfType: (val: string | boolean | number, type: "toDynamo" | "fromDynamo") => boolean} => ({
				"isOfType": (val: string | boolean | number): boolean => typeSettings.value === val
			})
		}, "jsType": {"func": (val, typeSettings): boolean => val === typeSettings.value}, "dynamodbType": (typeSettings?: AttributeDefinitionTypeSettings): string | string[] => {
			switch (typeof typeSettings.value) {
			case "string":
				return stringType.dynamodbType as any;
			case "boolean":
				return booleanType.dynamodbType as any;
			case "number":
				return numberType.dynamodbType as any;
			}
		}}),
		new DynamoDBType({"name": "Model", "dynamicName": (typeSettings?: AttributeDefinitionTypeSettings): string => typeSettings.model.Model.name, "dynamodbType": (typeSettings?: AttributeDefinitionTypeSettings): string | string[] => {
			const model = typeSettings.model.Model;
			const hashKey = model.getInternalProperties(internalProperties).getHashKey();
			const rangeKey = model.getInternalProperties(internalProperties).getRangeKey();
			return rangeKey ? "M" : model.getInternalProperties(internalProperties).schemas[0].getAttributeType(hashKey);
		}, "set": (typeSettings?: AttributeDefinitionTypeSettings): boolean => {
			return !typeSettings.model.Model.getInternalProperties(internalProperties).getRangeKey();
		}, "jsType": {"func": (val): boolean => val.prototype instanceof Item}, "customType": {
			"functions": (typeSettings?: AttributeDefinitionTypeSettings): {toDynamo: (val: any) => any; fromDynamo: (val: any) => any; isOfType: (val: any, type: "toDynamo" | "fromDynamo") => boolean} => ({
				"toDynamo": (val: any): any => {
					const model = typeSettings.model.Model;
					const hashKey = model.getInternalProperties(internalProperties).getHashKey();
					const rangeKey = model.getInternalProperties(internalProperties).getRangeKey();
					if (rangeKey) {
						return {
							[hashKey]: val[hashKey],
							[rangeKey]: val[rangeKey]
						};
					} else {
						return val[hashKey] ?? val;
					}
				},
				"fromDynamo": (val: any): any => val,
				"isOfType": (val: any, type: "toDynamo" | "fromDynamo"): boolean => {
					const model = typeSettings.model.Model;
					const hashKey = model.getInternalProperties(internalProperties).getHashKey();
					const rangeKey = model.getInternalProperties(internalProperties).getRangeKey();
					if (rangeKey) {
						return typeof val === "object" && val[hashKey] && val[rangeKey];
					} else {
						return utils.dynamoose.getValueTypeCheckResult(model.getInternalProperties(internalProperties).schemas[0], val[hashKey] ?? val, hashKey, {type}, {}).isValidType;
					}
				}
			})
		}})
	];
})();
const attributeTypes: (DynamoDBTypeResult | DynamoDBSetTypeResult)[] = utils.array_flatten(attributeTypesMain.filter((checkType) => !checkType.customType).map((checkType) => checkType.result()).map((a) => [a, a.set])).filter((a) => Boolean(a));

type GeneralValueType = string | boolean | number | Buffer | Date;
export type ValueType = GeneralValueType | {[key: string]: ValueType} | ValueType[];
type AttributeType = string | StringConstructor | BooleanConstructor | NumberConstructor | typeof Buffer | DateConstructor | ObjectConstructor | ArrayConstructor | SetConstructor | symbol | Schema | ModelType<Item>;

export interface TimestampObject {
	createdAt?: string | string[];
	updatedAt?: string | string[];
}
interface SchemaSettings {
	timestamps?: boolean | TimestampObject;
	saveUnknown?: boolean | string[];
	set?: (value: ObjectType) => ObjectType;
	get?: (value: ObjectType) => ObjectType;
	validate?: (value: ObjectType) => boolean;
}
export enum IndexType {
	/**
	 * A global secondary index (GSI) is a secondary index in a DynamoDB table that is not local to a single partition key value.
	 */
	global = "global",
	/**
	 * A local secondary index (LSI) is a secondary index in a DynamoDB table that is local to a single partition key value.
	 */
	local = "local"
}
interface IndexDefinition {
	/**
	 * The name of the index.
	 * @default `${attribute}${type == "global" ? "GlobalIndex" : "LocalIndex"}`
	 */
	name?: string;
	/**
	 * If the index should be a global index or local index. Attribute will be the hashKey for the index.
	 * @default "global"
	 */
	type?: IndexType;
	/**
	 * The range key attribute name for a global secondary index.
	 */
	rangeKey?: string;
	/**
	 * Sets the attributes to be projected for the index. `true` projects all attributes, `false` projects only the key attributes, and an array of strings projects the attributes listed.
	 * @default true
	 */
	project?: boolean | string[];
	/**
	 * Sets the throughput for the global secondary index.
	 * @default undefined
	 */
	throughput?: "ON_DEMAND" | number | {read: number; write: number};
}
interface AttributeDefinitionTypeSettings {
	storage?: "milliseconds" | "seconds";
	model?: ModelType<Item>;
	attributes?: string[];
	separator?: string;
	value?: string | boolean | number;
}
interface AttributeDefinition {
	/**
	 * The type attribute can either be a type (ex. `Object`, `Number`, etc.) or an object that has additional information for the type. In the event you set it as an object you must pass in a `value` for the type, and can optionally pass in a `settings` object.
	 *
	 * ```js
	 * {
	 * 	"address": {
	 * 		"type": Object
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"deletedAt": {
	 * 		"type": {
	 * 			"value": Date,
	 * 			"settings": {
	 * 				"storage": "seconds" // Default: milliseconds (as shown above)
	 * 			}
	 * 		}
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"data": {
	 * 		"type": {
	 * 			"value": "Constant",
	 * 			"settings": {
	 * 				"value": "Hello World" // Any `data` attribute must equal `Hello World` now.
	 * 			}
	 * 		}
	 * 	}
	 * }
	 * ```
	 */
	type: AttributeType | AttributeType[] | {value: DateConstructor; settings?: AttributeDefinitionTypeSettings} | {value: AttributeType | AttributeType[]};
	schema?: AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[] | SchemaDefinition | SchemaDefinition[];
	default?: ValueType | (() => ValueType);
	/**
	 * You can set this property to always use the `default` value, even if a value is already set. This can be used for data that will be used as sort or secondary indexes. The default for this property is false.
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": 5,
	 * 		"forceDefault": true
	 * 	}
	 * }
	 * ```
	 */
	forceDefault?: boolean;
	validate?: ValueType | RegExp | ((value: ValueType) => boolean);
	required?: boolean;
	enum?: ValueType[];
	get?: (value: ValueType) => ValueType;
	set?: (value: ValueType) => ValueType;
	index?: boolean | IndexDefinition | IndexDefinition[];
	hashKey?: boolean;
	rangeKey?: boolean;
}
export interface SchemaDefinition {
	[attribute: string]: AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[];
}
interface SchemaGetAttributeTypeSettings {
	unknownAttributeAllowed: boolean;
}
interface SchemaGetAttributeSettingValue {
	returnFunction: boolean;
	typeIndexOptionMap?: any;
}

interface SchemaInternalProperties {
	schemaObject: SchemaDefinition;
	settings: SchemaSettings;
}

export class Schema extends InternalPropertiesClass<SchemaInternalProperties> {
	/**
	 * TODO
	 * @param object
	 * @param settings
	 */
	constructor (object: SchemaDefinition, settings: SchemaSettings = {}) {
		super();

		if (!object || typeof object !== "object" || Array.isArray(object)) {
			throw new CustomError.InvalidParameterType("Schema initialization parameter must be an object.");
		}
		if (Object.keys(object).length === 0) {
			throw new CustomError.InvalidParameter("Schema initialization parameter must not be an empty object.");
		}

		if (settings.timestamps === true) {
			settings.timestamps = {
				"createdAt": "createdAt",
				"updatedAt": "updatedAt"
			};
		}
		if (settings.timestamps) {
			const createdAtArray = Array.isArray(settings.timestamps.createdAt) ? settings.timestamps.createdAt : [settings.timestamps.createdAt];
			const updatedAtArray = Array.isArray(settings.timestamps.updatedAt) ? settings.timestamps.updatedAt : [settings.timestamps.updatedAt];

			[...createdAtArray, ...updatedAtArray].forEach((prop) => {
				if (object[prop]) {
					throw new CustomError.InvalidParameter("Timestamp attributes must not be defined in schema.");
				}

				object[prop] = Date;
			});
		}

		let parsedSettings = {...settings};
		const parsedObject = {...object};
		utils.object.entries(parsedObject).filter((entry) => entry[1] instanceof Schema).forEach((entry) => {
			const [key, value] = entry;
			let newValue = {
				"type": Object,
				"schema": (value as any).getInternalProperties(internalProperties).schemaObject
			};
			if (key.endsWith(".schema")) {
				newValue = (value as any).getInternalProperties(internalProperties).schemaObject;
			}

			const subSettings = {...(value as any).getInternalProperties(internalProperties).settings};
			Object.entries(subSettings).forEach((entry) => {
				const [settingsKey, settingsValue] = entry;
				switch (settingsKey) {
				case "saveUnknown":
					subSettings[settingsKey] = typeof subSettings[settingsKey] === "boolean" ? [`${key}.**`] : (settingsValue as any).map((val) => `${key}.${val}`);
					break;
				case "timestamps":
					subSettings[settingsKey] = Object.entries(subSettings[settingsKey]).reduce((obj, entity) => {
						const [subKey, subValue] = entity;

						obj[subKey] = Array.isArray(subValue) ? subValue.map((subValue) => `${key}.${subValue}`) : `${key}.${subValue}`;

						return obj;
					}, {});
					break;
				}
			});
			parsedSettings = utils.merge_objects.main({"combineMethod": "array_merge_new_array"})(parsedSettings, subSettings);

			utils.object.set(parsedObject, key, newValue);
		});
		utils.object.entries(parsedObject).forEach((entry) => {
			const key = entry[0];
			const value = entry[1] as any;

			if (!key.endsWith(".type") && !key.endsWith(".0")) {
				if (value && value.Model && value.Model instanceof Model) {
					utils.object.set(parsedObject, key, {"type": value});
				} else if (value && Array.isArray(value)) {
					value.forEach((item, index) => {
						if (item && item.Model && item.Model instanceof Model) {
							utils.object.set(parsedObject, `${key}.${index}`, {"type": item});
						}
					});
				}
			}
		});

		this.setInternalProperties(internalProperties, {
			"schemaObject": parsedObject,
			"settings": parsedSettings
		});

		const checkAttributeNameDots = (object: SchemaDefinition/*, existingKey = ""*/): void => {
			Object.keys(object).forEach((key) => {
				if (key.includes(".")) {
					throw new CustomError.InvalidParameter("Attributes must not contain dots.");
				}

				// TODO: lots of `as` statements in the two lines below. We should clean that up.
				if (typeof object[key] === "object" && object[key] !== null && (object[key] as AttributeDefinition).schema) {
					checkAttributeNameDots((object[key] as AttributeDefinition).schema as SchemaDefinition/*, key*/);
				}
			});
		};
		checkAttributeNameDots(this.getInternalProperties(internalProperties).schemaObject);

		const checkMultipleArraySchemaElements = (key: string): void => {
			let attributeType: string[] = [];
			try {
				const tmpAttributeType = this.getAttributeType(key);
				attributeType = Array.isArray(tmpAttributeType) ? tmpAttributeType : [tmpAttributeType];
			} catch (e) {} // eslint-disable-line no-empty

			if (attributeType.some((type) => type === "L") && ((this.getAttributeValue(key).schema || []) as any).length > 1) {
				throw new CustomError.InvalidParameter("You must only pass one element into schema array.");
			}
		};
		this.attributes().forEach((key) => checkMultipleArraySchemaElements(key));

		const hashRangeKeys = this.attributes().reduce((val, key) => {
			const hashKey = this.getAttributeSettingValue("hashKey", key);
			const rangeKey = this.getAttributeSettingValue("rangeKey", key);

			const isHashKey = Array.isArray(hashKey) ? hashKey.every((item) => Boolean(item)) : hashKey;
			const isRangeKey = Array.isArray(rangeKey) ? rangeKey.every((item) => Boolean(item)) : rangeKey;

			if (isHashKey) {
				val.hashKeys.push(key);
			}
			if (isRangeKey) {
				val.rangeKeys.push(key);
			}
			if (isHashKey && isRangeKey) {
				val.hashAndRangeKeyAttributes.push(key);
			}

			return val;
		}, {"hashKeys": [], "rangeKeys": [], "hashAndRangeKeyAttributes": []});
		const keyTypes = ["hashKey", "rangeKey"];
		keyTypes.forEach((keyType) => {
			if (hashRangeKeys[`${keyType}s`].length > 1) {
				throw new CustomError.InvalidParameter(`Only one ${keyType} allowed per schema.`);
			}
			if (hashRangeKeys[`${keyType}s`].find((key) => key.includes("."))) {
				throw new CustomError.InvalidParameter(`${keyType} must be at root object and not nested in object or array.`);
			}
		});
		if (hashRangeKeys.hashAndRangeKeyAttributes.length > 0) {
			throw new CustomError.InvalidParameter(`Attribute ${hashRangeKeys.hashAndRangeKeyAttributes[0]} must not be both hashKey and rangeKey`);
		}

		this.attributes().forEach((key) => {
			const attributeSettingValue = this.getAttributeSettingValue("index", key);
			if (key.includes(".") && (Array.isArray(attributeSettingValue) ? attributeSettingValue.some((singleValue) => Boolean(singleValue)) : attributeSettingValue)) {
				throw new CustomError.InvalidParameter("Index must be at root object and not nested in object or array.");
			}
		});

		this.attributes().forEach((key) => {
			try {
				this.getAttributeType(key);
			} catch (e) {
				if (!e.message.includes("is not allowed to be a set")) {
					throw new CustomError.InvalidParameter(`Attribute ${key} does not have a valid type.`);
				}
			}
		});
	}

	attributes: (object?: ObjectType) => string[];
	async getCreateTableAttributeParams (model: Model<Item>): Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">> {
		const hashKey = this.hashKey;
		const AttributeDefinitions = [
			{
				"AttributeName": hashKey,
				"AttributeType": this.getSingleAttributeType(hashKey)
			}
		];
		const AttributeDefinitionsNames = [hashKey];
		const KeySchema = [
			{
				"AttributeName": hashKey,
				"KeyType": "HASH"
			}
		];

		const rangeKey = this.rangeKey;
		if (rangeKey) {
			AttributeDefinitions.push({
				"AttributeName": rangeKey,
				"AttributeType": this.getSingleAttributeType(rangeKey)
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
				"AttributeType": this.getSingleAttributeType(index)
			});
		});

		const response: any = {
			AttributeDefinitions,
			KeySchema
		};

		const {GlobalSecondaryIndexes, LocalSecondaryIndexes} = await this.getIndexes(model);

		if (GlobalSecondaryIndexes) {
			response.GlobalSecondaryIndexes = GlobalSecondaryIndexes;
		}
		if (LocalSecondaryIndexes) {
			response.LocalSecondaryIndexes = LocalSecondaryIndexes;
		}

		return response;
	}
	// This function has the same behavior as `getAttributeType` except if the schema has multiple types, it will throw an error. This is useful for attribute definitions and keys for when you are only allowed to have one type for an attribute
	private getSingleAttributeType (key: string, value?: ValueType, settings?: SchemaGetAttributeTypeSettings): string {
		const attributeType = this.getAttributeType(key, value, settings);
		if (Array.isArray(attributeType)) {
			throw new CustomError.InvalidParameter(`You can not have multiple types for attribute definition: ${key}.`);
		}
		return attributeType;
	}
	getAttributeType (key: string, value?: ValueType, settings?: SchemaGetAttributeTypeSettings): string | string[] {
		try {
			const typeDetails = this.getAttributeTypeDetails(key);
			return Array.isArray(typeDetails) ? (typeDetails as any).map((detail) => detail.dynamodbType) : typeDetails.dynamodbType;
		} catch (e) {
			if (settings?.unknownAttributeAllowed && e.message === `Invalid Attribute: ${key}` && value) {
				return Object.keys(Item.objectToDynamo(value, {"type": "value"}))[0];
			} else {
				throw e;
			}
		}
	}
	static attributeTypes = {
		"findDynamoDBType": (type): DynamoDBTypeResult | DynamoDBSetTypeResult => attributeTypes.find((checkType) => checkType.dynamodbType === type),
		"findTypeForValue": (...args): DynamoDBTypeResult | DynamoDBSetTypeResult => attributeTypes.find((checkType) => (checkType.isOfType as any)(...args))
	};

	/**
	 * This property returns the property name of your schema's hash key.
	 *
	 * ```js
	 * const schema = new dynamoose.Schema({"id": String});
	 * console.log(schema.hashKey); // "id"
	 * ```
	 */
	get hashKey (): string {
		return Object.keys(this.getInternalProperties(internalProperties).schemaObject).find((key) => (this.getInternalProperties(internalProperties).schemaObject[key] as AttributeDefinition).hashKey) || Object.keys(this.getInternalProperties(internalProperties).schemaObject)[0];
	}
	/**
	 * This property returns the property name of your schema's range key. It will return undefined if a range key does not exist for your schema.
	 * ```js
	 * const schema = new dynamoose.Schema({"id": String, "type": {"type": String, "rangeKey": true}});
	 * console.log(schema.rangeKey); // "type"
	 * ```
	 *
	 * ```js
	 * const schema = new dynamoose.Schema({"id": String});
	 * console.log(schema.rangeKey); // undefined
	 * ```
	 */
	get rangeKey (): string | undefined {
		return Object.keys(this.getInternalProperties(internalProperties).schemaObject).find((key) => (this.getInternalProperties(internalProperties).schemaObject[key] as AttributeDefinition).rangeKey);
	}

	// This function will take in an attribute and value, and returns the default value if it should be applied.
	async defaultCheck (key: string, value: ValueType, settings: any): Promise<ValueType | void> {
		const isValueUndefined = typeof value === "undefined" || value === null;
		if (settings.defaults && isValueUndefined || settings.forceDefault && await this.getAttributeSettingValue("forceDefault", key)) {
			const defaultValueRaw = await this.getAttributeSettingValue("default", key);

			let hasMultipleTypes;
			try {
				hasMultipleTypes = Array.isArray(this.getAttributeType(key));
			} catch (e) {
				hasMultipleTypes = false;
			}

			const defaultValue = Array.isArray(defaultValueRaw) && hasMultipleTypes ? defaultValueRaw[0] : defaultValueRaw;
			const isDefaultValueUndefined = typeof defaultValue === "undefined" || defaultValue === null;
			if (!isDefaultValueUndefined) {
				return defaultValue;
			}
		}
	}
	requiredCheck: (key: string, value: ValueType) => Promise<void>;
	getAttributeSettingValue (setting: string, key: string, settings: SchemaGetAttributeSettingValue = {"returnFunction": false}): any {
		function func (attributeValue): any {
			const defaultPropertyValue = (attributeValue || {})[setting];
			return typeof defaultPropertyValue === "function" && !settings.returnFunction ? defaultPropertyValue() : defaultPropertyValue;
		}
		const attributeValue = this.getAttributeValue(key, {"typeIndexOptionMap": settings.typeIndexOptionMap});
		if (Array.isArray(attributeValue)) {
			return attributeValue.map(func);
		} else {
			return func(attributeValue);
		}
	}
	getTypePaths (object: ObjectType, settings: { type: "toDynamo" | "fromDynamo"; previousKey?: string; includeAllProperties?: boolean } = {"type": "toDynamo"}): ObjectType {
		return Object.entries(object).reduce((result, entry) => {
			const [key, value] = entry;
			const fullKey = [settings.previousKey, key].filter((a) => Boolean(a)).join(".");
			let typeCheckResult;
			try {
				typeCheckResult = utils.dynamoose.getValueTypeCheckResult(this, value, fullKey, settings, {});
			} catch (e) {
				if (result && settings.includeAllProperties) {
					result[fullKey] = {
						"index": 0,
						"matchCorrectness": 0.5,
						"entryCorrectness": [0.5]
					};
				}
				return result;
			}
			const {typeDetails, matchedTypeDetailsIndex, matchedTypeDetailsIndexes} = typeCheckResult;
			const hasMultipleTypes = Array.isArray(typeDetails);
			const isObject = typeof value === "object" && !(value instanceof Buffer) && value !== null;

			if (hasMultipleTypes) {
				if (matchedTypeDetailsIndexes.length > 1 && isObject) {
					result[fullKey] = matchedTypeDetailsIndexes.map((index: number) => {
						const entryCorrectness = utils.object.entries(value).map((entry) => {
							const [subKey, subValue] = entry;

							try {
								const {isValidType} = utils.dynamoose.getValueTypeCheckResult(this, subValue, `${fullKey}.${subKey}`, settings, {"typeIndexOptionMap": {[fullKey]: index}});
								return isValidType ? 1 : 0;
							} catch (e) {
								return 0.5;
							}
						});
						return {
							index,
							// 1 = full match
							// 0.5 = attributes don't exist
							// 0 = types don't match
							"matchCorrectness": Math.min(...entryCorrectness),
							entryCorrectness
						};
					}).sort((a, b) => {
						if (a.matchCorrectness === b.matchCorrectness) {
							return b.entryCorrectness.reduce((a: number, b: number) => a + b, 0) - a.entryCorrectness.reduce((a: number, b: number) => a + b, 0);
						} else {
							return b.matchCorrectness - a.matchCorrectness;
						}
					}).map((a) => a.index)[0];
				}

				if (result[fullKey] === undefined) {
					result[fullKey] = matchedTypeDetailsIndex;
				}
			} else if (settings.includeAllProperties) {
				const matchCorrectness: number = typeCheckResult.isValidType ? 1 : 0;
				result[fullKey] = {
					"index": 0,
					matchCorrectness,
					"entryCorrectness": [matchCorrectness]
				};
			}

			if (isObject) {
				result = {...result, ...this.getTypePaths(value, {...settings, "previousKey": fullKey})};
			}

			return result;
		}, {});
	}
	getIndexAttributes: () => Promise<{ index: IndexDefinition; attribute: string }[]>;
	getSettingValue: (setting: string) => any;
	getAttributeTypeDetails: (key: string, settings?: { standardKey?: boolean; typeIndexOptionMap?: {} }) => DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[];
	getAttributeValue: (key: string, settings?: { standardKey?: boolean; typeIndexOptionMap?: {} }) => AttributeDefinition;
	getIndexes: (model: Model<Item>) => Promise<ModelIndexes>;
	getIndexRangeKeyAttributes: () => Promise<{ attribute: string }[]>;
}

// This function will take in an attribute and value, and throw an error if the property is required and the value is undefined or null.
Schema.prototype.requiredCheck = async function (this: Schema, key: string, value: ValueType): Promise<void> {
	const isRequired = await this.getAttributeSettingValue("required", key);
	if ((typeof value === "undefined" || value === null) && (Array.isArray(isRequired) ? isRequired.some((val) => Boolean(val)) : isRequired)) {
		throw new CustomError.ValidationError(`${key} is a required property but has no value when trying to save item`);
	}
};

Schema.prototype.getIndexAttributes = async function (this: Schema): Promise<{index: IndexDefinition; attribute: string}[]> {
	return (await Promise.all(this.attributes()
		.map(async (attribute: string) => ({
			"index": await this.getAttributeSettingValue("index", attribute) as IndexDefinition,
			attribute
		}))
	))
		.filter((obj) => Array.isArray(obj.index) ? obj.index.some((index) => Boolean(index)) : obj.index)
		.reduce((accumulator, currentValue) => {
			if (Array.isArray(currentValue.index)) {
				currentValue.index.forEach((currentIndex) => {
					accumulator.push({
						...currentValue,
						"index": currentIndex
					});
				});
			} else {
				accumulator.push(currentValue);
			}
			return accumulator;
		}, []);
};
Schema.prototype.getIndexRangeKeyAttributes = async function (this: Schema): Promise<{attribute: string}[]> {
	const indexes: ({index: IndexDefinition; attribute: string})[] = await this.getIndexAttributes();
	return indexes.map((index) => index.index.rangeKey).filter((a) => Boolean(a)).map((a) => ({"attribute": a}));
};
export interface TableIndex {
	KeySchema: ({AttributeName: string; KeyType: "HASH" | "RANGE"})[];
}
export interface IndexItem {
	IndexName: string;
	KeySchema: ({AttributeName: string; KeyType: "HASH" | "RANGE"})[];
	Projection: {ProjectionType: "KEYS_ONLY" | "INCLUDE" | "ALL"; NonKeyAttributes?: string[]};
	ProvisionedThroughput?: {"ReadCapacityUnits": number; "WriteCapacityUnits": number}; // TODO: this was copied from get_provisioned_throughput. We should change this to be an actual interface
}
Schema.prototype.getIndexes = async function (this: Schema, model: Model<Item>): Promise<ModelIndexes> {
	const indexes: ModelIndexes = (await this.getIndexAttributes()).reduce((accumulator, currentValue) => {
		const indexValue = currentValue.index;
		const attributeValue = currentValue.attribute;
		const isGlobalIndex = indexValue.type === "global" || !indexValue.type;

		const dynamoIndexObject: IndexItem = {
			"IndexName": indexValue.name || `${attributeValue}${isGlobalIndex ? "GlobalIndex" : "LocalIndex"}`,
			"KeySchema": [],
			"Projection": {"ProjectionType": "KEYS_ONLY"}
		};
		if (indexValue.project || typeof indexValue.project === "undefined" || indexValue.project === null) {
			dynamoIndexObject.Projection = Array.isArray(indexValue.project) ? {"ProjectionType": "INCLUDE", "NonKeyAttributes": indexValue.project} : {"ProjectionType": "ALL"};
		}
		if (isGlobalIndex) {
			dynamoIndexObject.KeySchema.push({"AttributeName": attributeValue, "KeyType": "HASH"});
			if (indexValue.rangeKey) {
				dynamoIndexObject.KeySchema.push({"AttributeName": indexValue.rangeKey, "KeyType": "RANGE"});
			}
			const throughputObject = utils.dynamoose.get_provisioned_throughput(indexValue.throughput ? indexValue : model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options.throughput === "ON_DEMAND" ? {} : model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).options);
			if ("ProvisionedThroughput" in throughputObject) {
				dynamoIndexObject.ProvisionedThroughput = throughputObject.ProvisionedThroughput;
			}
		} else {
			dynamoIndexObject.KeySchema.push({"AttributeName": this.hashKey, "KeyType": "HASH"});
			dynamoIndexObject.KeySchema.push({"AttributeName": attributeValue, "KeyType": "RANGE"});
		}
		const accumulatorKey = isGlobalIndex ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes";
		if (!accumulator[accumulatorKey]) {
			accumulator[accumulatorKey] = [];
		}
		accumulator[accumulatorKey].push(dynamoIndexObject);

		return accumulator;
	}, {});

	indexes.TableIndex = {"KeySchema": [{"AttributeName": this.hashKey, "KeyType": "HASH"}]};

	const rangeKey = this.rangeKey;
	if (rangeKey) {
		indexes.TableIndex.KeySchema.push({"AttributeName": rangeKey, "KeyType": "RANGE"});
	}

	return indexes;
};

Schema.prototype.getSettingValue = function (this: Schema, setting: string): any {
	return this.getInternalProperties(internalProperties).settings[setting];
};

Schema.prototype.attributes = function (this: Schema, object?: ObjectType): string[] {
	const typePaths = object && this.getTypePaths(object);
	const main = (object: SchemaDefinition, existingKey = ""): string[] => {
		return Object.keys(object).reduce((accumulator: string[], key) => {
			const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
			accumulator.push(keyWithExisting);

			let attributeType: string[];
			try {
				const tmpAttributeType = this.getAttributeType(keyWithExisting);
				attributeType = Array.isArray(tmpAttributeType) ? tmpAttributeType : [tmpAttributeType];
			} catch (e) {} // eslint-disable-line no-empty

			// TODO: using too many `as` statements in the few lines below. Clean that up.
			function recursive (type, arrayTypeIndex): void {
				if ((type === "M" || type === "L") && ((object[key][arrayTypeIndex] || object[key]) as AttributeDefinition).schema) {
					accumulator.push(...main(((object[key][arrayTypeIndex] || object[key]) as AttributeDefinition).schema as SchemaDefinition, keyWithExisting));
				}
			}
			if (attributeType) {
				if (typePaths && typePaths[keyWithExisting] !== undefined) {
					const index = typePaths[keyWithExisting];
					const type = attributeType[index];
					recursive(type, index);
				} else {
					attributeType.forEach(recursive);
				}
			}
			// ------------------------------

			return accumulator;
		}, []);
	};

	return main(this.getInternalProperties(internalProperties).schemaObject);
};

Schema.prototype.getAttributeValue = function (this: Schema, key: string, settings?: {standardKey?: boolean; typeIndexOptionMap?: {}}): AttributeDefinition {
	const previousKeyParts = [];
	let result = (settings?.standardKey ? key : key.replace(/\.\d+/gu, ".0")).split(".").reduce((result, part) => {
		if (Array.isArray(result)) {
			const predefinedIndex = settings && settings.typeIndexOptionMap && settings.typeIndexOptionMap[previousKeyParts.join(".")];
			if (predefinedIndex !== undefined) {
				result = result[predefinedIndex];
			} else {
				result = result.find((item) => item.schema && item.schema[part]);
			}
		}
		previousKeyParts.push(part);
		return utils.object.get(result.schema, part);
	}, {"schema": this.getInternalProperties(internalProperties).schemaObject} as any);

	if (Array.isArray(result)) {
		const predefinedIndex = settings && settings.typeIndexOptionMap && settings.typeIndexOptionMap[previousKeyParts.join(".")];
		if (predefinedIndex !== undefined) {
			result = result[predefinedIndex];
		}
	}

	return result;
};

function retrieveTypeInfo (type: string, isSet: boolean, key: string, typeSettings: AttributeDefinitionTypeSettings): DynamoDBTypeResult | DynamoDBSetTypeResult {
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
Schema.prototype.getAttributeTypeDetails = function (this: Schema, key: string, settings: {standardKey?: boolean; typeIndexOptionMap?: {}} = {}): DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[] {
	const standardKey = settings.standardKey ? key : key.replace(/\.\d+/gu, ".0");
	const val = this.getAttributeValue(standardKey, {...settings, "standardKey": true});
	if (typeof val === "undefined") {
		throw new CustomError.UnknownAttribute(`Invalid Attribute: ${key}`);
	}
	let typeVal = typeof val === "object" && !Array.isArray(val) && val.type ? val.type : val;
	let typeSettings: AttributeDefinitionTypeSettings = {};
	if (typeof typeVal === "object" && !Array.isArray(typeVal)) {
		typeSettings = (typeVal as {value: DateConstructor; settings?: AttributeDefinitionTypeSettings}).settings || {};
		typeVal = (typeVal as any).value;
	}

	const getType = (typeVal: AttributeType | AttributeDefinition): string => {
		let type: string;
		const isThisType = typeVal as any === Internal.Public.this;
		const isNullType = typeVal as any === Internal.Public.null;
		const isAnyType = typeVal as any === Internal.Public.any;
		if (typeof typeVal === "function" || isThisType) {
			if ((typeVal as any).prototype instanceof Item || isThisType) {
				type = "model";

				if (isThisType) {
					const obj = {
						"getInternalProperties": () => ({
							"schemas": [this],
							"getHashKey": () => this.hashKey,
							"getRangeKey": () => this.rangeKey
						})
					};

					typeSettings.model = {"Model": obj} as any;
				} else {
					typeSettings.model = typeVal as any;
				}
			} else {
				const regexFuncName = /^Function ([^(]+)\(/iu;
				[, type] = typeVal.toString().match(regexFuncName);
			}
		} else if (isNullType) {
			type = "null";
		} else if (isAnyType) {
			type = "any";
		} else if ((typeVal as string).toLowerCase() === "null") {
			throw new Error("Please use dynamoose.type.NULL instead of \"null\" for your type attribute.");
		} else if ((typeVal as string).toLowerCase() === "any") {
			throw new Error("Please use dynamoose.type.ANY instead of \"any\" for your type attribute.");
		} else {
			type = typeVal as string;
		}
		return type;
	};

	const result: DynamoDBTypeResult[] | DynamoDBSetTypeResult[] = ((Array.isArray(typeVal) ? typeVal : [typeVal]) as any).map((item, index: number) => {
		item = typeof item === "object" && !Array.isArray(item) && item.type ? item.type : item;
		if (typeof item === "object" && !Array.isArray(item)) {
			typeSettings = (item as {value: DateConstructor; settings?: AttributeDefinitionTypeSettings}).settings || {};
			item = item.value;
		}

		let type = getType(item);
		const isSet = type.toLowerCase() === "set";
		if (isSet) {
			let schemaValue = this.getAttributeSettingValue("schema", key);
			if (Array.isArray(schemaValue[index])) {
				schemaValue = schemaValue[index];
			}
			const subValue = schemaValue[0];
			type = getType(typeof subValue === "object" && subValue.type ? subValue.type : subValue);
		}

		const returnObject = retrieveTypeInfo(type, isSet, key, typeSettings);
		return returnObject;
	});

	const returnObject = result.length < 2 ? result[0] : result;
	return returnObject;
};
