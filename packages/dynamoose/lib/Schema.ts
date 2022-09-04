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
	dynamodbType?: DynamoDBAttributeType | DynamoDBAttributeType[] | DynamoDBType | ((typeSettings: AttributeDefinitionTypeSettings) => string | string[]) | ((typeSettings: AttributeDefinitionTypeSettings) => DynamoDBType);
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
		const type: DynamoDBType = (() => {
			if (this.dynamodbType instanceof DynamoDBType) {
				return this.dynamodbType;
			} else if (typeof this.dynamodbType === "function") {
				const result = this.dynamodbType(typeSettings);
				if (result instanceof DynamoDBType) {
					return result;
				}
			}

			return this;
		})();
		const underlyingDynamoDBType: DynamoDBType | undefined = (() => {
			if (this.dynamodbType instanceof DynamoDBType) {
				return this.dynamodbType;
			} else if (typeof this.dynamodbType === "function") {
				const returnedType = this.dynamodbType(typeSettings);
				if (returnedType instanceof DynamoDBType) {
					return returnedType;
				}
			}
		})();
		const dynamodbType: DynamoDBAttributeType | DynamoDBAttributeType[] = ((): DynamoDBAttributeType | DynamoDBAttributeType[] => {
			if (this.dynamodbType instanceof DynamoDBType) {
				return this.dynamodbType.dynamodbType as DynamoDBAttributeType;
			} else if (typeof this.dynamodbType === "function") {
				const returnedType = this.dynamodbType(typeSettings);
				if (returnedType instanceof DynamoDBType) {
					return returnedType.dynamodbType as DynamoDBAttributeType;
				} else {
					return returnedType;
				}
			} else {
				return this.dynamodbType;
			}
		})();
		const result: DynamoDBTypeResult = {
			"name": this.name,
			dynamodbType,
			"nestedType": this.nestedType,
			"isOfType": this.jsType.func ? (val) => this.jsType.func(val, typeSettings) : (val): {value: ValueType; type: string} => {
				return [{"value": this.jsType, "type": "main"}, {"value": underlyingDynamoDBType ? type.jsType : null, "type": "underlying"}].filter((a) => Boolean(a.value)).find((jsType) => typeof jsType.value === "string" ? typeof val === jsType.value : val instanceof jsType.value);
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
		new DynamoDBType({"name": "Object", "dynamodbType": "M", "jsType": {"func": (val): boolean => Boolean(val) && (val.constructor === undefined || val.constructor === Object)}, "nestedType": true}),
		numberType,
		stringType,
		new DynamoDBType({"name": "Date", "dynamodbType": (typeSettings?: AttributeDefinitionTypeSettings): DynamoDBType => {
			if (typeSettings && typeSettings.storage === "iso") {
				return stringType;
			} else {
				return numberType;
			}
		}, "customType": {
			"functions": (typeSettings: AttributeDefinitionTypeSettings): {toDynamo: (val: Date) => number | string; fromDynamo: (val: number | string) => Date; isOfType: (val: Date, type: "toDynamo" | "fromDynamo") => boolean} => ({
				"toDynamo": (val: Date): number | string => {
					if (typeSettings.storage === "seconds") {
						return Math.round(val.getTime() / 1000);
					} else if (typeSettings.storage === "iso") {
						return val.toISOString();
					} else {
						return val.getTime();
					}
				},
				"fromDynamo": (val: number | string): Date => {
					if (typeSettings.storage === "seconds") {
						return new Date((val as number) * 1000);
					} else if (typeSettings.storage === "iso") {
						return new Date(val);
					} else {
						return new Date(val);
					}
				},
				"isOfType": (val: Date, type: "toDynamo" | "fromDynamo"): boolean => {
					if (type === "toDynamo") {
						return val instanceof Date;
					} else {
						if (typeSettings.storage === "iso") {
							return typeof val === "string";
						} else {
							return typeof val === "number";
						}
					}
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
	createdAt?: string | string[] | SchemaDefinition;
	updatedAt?: string | string[] | SchemaDefinition;
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
	type?: IndexType | keyof typeof IndexType;
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
	storage?: "milliseconds" | "seconds" | "iso";
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
	/**
	 * This property is only used for the `Object` or `Array` attribute types. It is used to define the schema for the underlying nested type. For `Array` attribute types, this value must be an `Array` with one element defining the schema. This element for `Array` attribute types can either be another raw Dynamoose type (ex. `String`), or an object defining a more detailed schema for the `Array` elements. For `Object` attribute types this value must be an object defining the schema. Some examples of this property in action can be found below.
	 *
	 * ```js
	 * {
	 * 	"address": {
	 * 		"type": Object,
	 * 		"schema": {
	 * 			"zip": Number,
	 * 			"country": {
	 * 				"type": String,
	 * 				"required": true
	 * 			}
	 * 		}
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"friends": {
	 * 		"type": Array,
	 * 		"schema": [String]
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"friends": {
	 * 		"type": Array,
	 * 		"schema": [{
	 * 			"type": Object,
	 * 			"schema": {
	 * 				"zip": Number,
	 * 				"country": {
	 * 					"type": String,
	 * 					"required": true
	 * 				}
	 * 			}
	 * 		}]
	 * 	}
	 * }
	 * ```
	 *
	 * You can also define an array attribute that accepts more than one data type. The following example will allow the `friends` attribute to be an array of strings, or an array of numbers, but the elements in the array must all be strings or must all be numbers.
	 *
	 * ```js
	 * {
	 * 	"friends": {
	 * 		"type": Array,
	 * 		"schema": [
	 * 			{
	 * 				"type": Array,
	 * 				"schema": [String]
	 * 			},
	 * 			{
	 * 				"type": Array,
	 * 				"schema": [Number]
	 * 			}
	 * 		]
	 * 	}
	 * }
	 * ```
	 */
	schema?: AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[] | SchemaDefinition | SchemaDefinition[];
	/**
	 * You can set a default value for an attribute that will be applied upon save if the given attribute value is `null` or `undefined`. The value for the default property can either be a value or a function that will be executed when needed that should return the default value. By default there is no default value for attributes.
	 *
	 * Default values will only be applied if the parent object exists. This means for values where you apply a `default` value to a nested attribute, it will only be applied if the parent object exists. If you do not want this behavior, consider setting a `default` value for the parent object to an empty object (`{}`) or an empty array (`[]`).
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": 5
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": () => 5
	 * 	}
	 * }
	 * ```
	 *
	 * You can also pass in async functions or a function that returns a promise to the default property and Dynamoose will take care of waiting for the promise to resolve before saving the object.
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": async () => {
	 * 			const networkResponse = await axios("https://myurl.com/config.json").data;
	 * 			return networkResponse.defaults.age;
	 * 		}
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": () => {
	 * 			return new Promise((resolve) => {
	 * 				setTimeout(() => resolve(5), 1000);
	 * 			});
	 * 		}
	 * 	}
	 * }
	 * ```
	 */
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
	/**
	 * You can set a validation on an attribute to ensure the value passes a given validation before saving the item. In the event you set this to be a function or async function, Dynamoose will pass in the value for you to validate as the parameter to your function. Validation will only be run if the item exists in the item. If you'd like to force validation to be run every time (even if the attribute doesn't exist in the item) you can enable `required`.
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": Number,
	 * 		"validate": 5 // Any object that is saved must have the `age` property === to 5
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"id": {
	 * 		"type": String,
	 * 		"validate": /ID_.+/gu // Any object that is saved must have the `id` property start with `ID_` and have at least 1 character after it
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"age": {
	 * 		"type": String,
	 * 		"validate": (val) => val > 0 && val < 100 // Any object that is saved must have the `age` property be greater than 0 and less than 100
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"email": {
	 * 		"type": String,
	 * 		"validate": async (val) => {
	 * 			const networkRequest = await axios(`https://emailvalidator.com/${val}`);
	 * 			return networkRequest.data.isValid;
	 * 		} // Any object that is saved will call this function and run the network request with `val` equal to the value set for the `email` property, and only allow the item to be saved if the `isValid` property in the response is true
	 * 	}
	 * }
	 * ```
	 */
	validate?: ValueType | RegExp | ((value: ValueType) => boolean | Promise<boolean>);
	/**
	 * You can set an attribute to be required when saving items to DynamoDB. By default this setting is `false`.
	 *
	 * In the event the parent object is undefined and `required` is set to `false` on that parent attribute, the required check will not be run on child attributes.
	 *
	 * ```js
	 * {
	 * 	"email": {
	 * 		"type": String,
	 * 		"required": true
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"data": {
	 * 		"type": Object,
	 * 		"schema": {
	 * 			"name": {
	 * 				"type": String,
	 * 				"required": true // Required will only be checked if `data` exists and is not undefined
	 * 			}
	 * 		}
	 * 		"required": false
	 * 	}
	 * }
	 * ```
	 */
	required?: boolean;
	/**
	 * You can set an attribute to have an enum array, which means it must match one of the values specified in the enum array. By default this setting is undefined and not set to anything.
	 *
	 * This property is not a replacement for `required`. If the value is undefined or null, the enum will not be checked. If you want to require the property and also have an `enum` you must use both `enum` & `required`.
	 *
	 * ```js
	 * {
	 * 	"name": {
	 * 		"type": String,
	 * 		"enum": ["Tom", "Tim"] // `name` must always equal "Tom" or "Tim"
	 * 	}
	 * }
	 * ```
	 */
	enum?: ValueType[];
	/**
	 * You can use a get function on an attribute to be run whenever retrieving a item from DynamoDB. This function will only be run if the item exists in the item. Dynamoose will pass the DynamoDB value into this function and you must return the new value that you want Dynamoose to return to the application.
	 *
	 * ```js
	 * {
	 * 	"id": {
	 * 		"type": String,
	 * 		"get": (value) => `applicationid-${value}` // This will prepend `applicationid-` to all values for this attribute when returning from the database
	 * 	}
	 * }
	 * ```
	 */
	get?: (value: ValueType) => ValueType;
	/**
	 * You can use a set function on an attribute to be run whenever saving a item to DynamoDB. It will also be used when retrieving an item based on this attribute (ie. `get`, `query`, `update`, etc). This function will only be run if the attribute exists in the item. Dynamoose will pass the value you provide into this function and you must return the new value that you want Dynamoose to save to DynamoDB.
	 *
	 * ```js
	 * {
	 * 	"name": {
	 * 		"type": String,
	 * 		"set": (value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}` // Capitalize first letter of name when saving to database
	 * 	}
	 * }
	 * ```
	 *
	 * Unlike `get`, this method will additionally pass in the original value as the second parameter (if available). Internally Dynamoose uses the [`item.original()`](/guide/Item#itemoriginal) method to access the original value. This means that using [`Model.batchPut`](/guide/Model#modelbatchputitems-settings-callback), [`Model.update`](/guide/Model#modelupdatekey-updateobj-settings-callback) or any other item save method that does not have access to [`item.original()`](/guide/Item#itemoriginal) this second parameter will be `undefined`.
	 *
	 * ```js
	 * {
	 * 	"name": {
	 * 		"type": String,
	 * 		"set": (newValue, oldValue) => `${newValue.charAt(0).toUpperCase()}${newValue.slice(1)}-${oldValue.charAt(0).toUpperCase()}${oldValue.slice(1)}` // Prepend the newValue to the oldValue (split by a `-`) and capitalize first letter of each when saving to database
	 * 	}
	 * }
	 * ```
	 */
	set?: ((value: ValueType, oldValue?: ValueType) => ValueType | Promise<ValueType>);
	/**
	 * Indexes on your DynamoDB tables must be defined in your Dynamoose schema. If you have the update option set to true on your model settings, and a Dynamoose schema index does not already exist on the DynamoDB table, it will be created on model initialization. Similarly, indexes on your DynamoDB table that do not exist in your Dynamoose schema will be deleted.
	 *
	 * If you pass in an array for the value of this setting it must be an array of index objects. By default no indexes are specified on the attribute.
	 *
	 * Your index object can contain the following properties:
	 *
	 * | Name | Type | Default | Notes |
	 * |---|---|---|---|
	 * | name | string | `${attribute}${type == "global" ? "GlobalIndex" : "LocalIndex"}` | The name of the index. |
	 * | type | "global" \| "local" | "global" | If the index should be a global index or local index. Attribute will be the hashKey for the index. |
	 * | rangeKey | string | undefined | The range key attribute name for a global secondary index. |
	 * | project | boolean \| [string] | true | Sets the attributes to be projected for the index. `true` projects all attributes, `false` projects only the key attributes, and an array of strings projects the attributes listed. |
	 * | throughput | number \| {read: number, write: number} | undefined | Sets the throughput for the global secondary index. |
	 *
	 *
	 * If you set `index` to `true`, it will create an index with all of the default settings.
	 *
	 * ```js
	 * {
	 * 	"id": {
	 * 		"hashKey": true,
	 * 		"type": String,
	 * 	},
	 * 	"email": {
	 * 		"type": String,
	 * 		"index": {
	 * 			"name": "emailIndex",
	 * 			"global": true
	 * 		} // creates a global secondary index with the name `emailIndex` and hashKey `email`
	 * 	}
	 * }
	 * ```
	 *
	 * ```js
	 * {
	 * 	"id": {
	 * 		"hashKey": true,
	 * 		"type": String,
	 * 		"index": {
	 * 			"name": "emailIndex",
	 * 			"rangeKey": "email",
	 * 			"throughput": {"read": 5, "write": 10}
	 * 		} // creates a local secondary index with the name `emailIndex`, hashKey `id`, rangeKey `email`
	 * 	},
	 * 	"email": {
	 * 		"type": String
	 * 	}
	 * }
	 * ```
	 */
	index?: boolean | IndexDefinition | IndexDefinition[];
	/**
	 * You can set this to true to overwrite what the `hashKey` for the Model will be. By default the `hashKey` will be the first key in the Schema object.
	 *
	 * `hashKey` is commonly called a `partition key` in the AWS documentation.
	 *
	 * ```js
	 * {
	 * 	"id": String,
	 * 	"key": {
	 * 		"type": String,
	 * 		"hashKey": true
	 * 	}
	 * }
	 * ```
	 */
	hashKey?: boolean;
	/**
	 * You can set this to true to overwrite what the `rangeKey` for the Model will be. By default the `rangeKey` won't exist.
	 *
	 * `rangeKey` is commonly called a `sort key` in the AWS documentation.
	 *
	 * ```js
	 * {
	 * 	"id": String,
	 * 	"email": {
	 * 		"type": String,
	 * 		"rangeKey": true
	 * 	}
	 * }
	 * ```
	 */
	rangeKey?: boolean;
	/**
	 * This property can be used to use a different attribute name in your internal application as opposed to DynamoDB. This is especially useful if you have a single table design with properties like (`pk` & `sk`) which don't have much human readable meaning. You can use this to map those attribute names to better human readable names that better represent the underlying data. You can also use it for aliases such as mapping `id` to `userID`.
	 *
	 * When retrieving data from DynamoDB, the attribute will be renamed to this property name, or the first element of the array if it is an array. If you want to change this behavior look at the [`defaultMap`](#defaultmap-string) property.
	 *
	 * When saving to DynamoDB, the attribute name will always be used.
	 *
	 * ```js
	 * "pk": {
	 * 	"type": String,
	 * 	"map": "userId"
	 * }
	 * "sk": {
	 * 	"type": String,
	 * 	"map": "orderId"
	 * }
	 * ```
	 *
	 * ```js
	 * "id": {
	 * 	"type": String,
	 * 	"map": ["userID", "_id"]
	 * }
	 * ```
	 */
	map?: string | string[];
	/**
	 * This property can be used to use a different attribute name in your internal application as opposed to DynamoDB. This is especially useful if you have a single table design with properties like (`pk` & `sk`) which don't have much human readable meaning. You can use this to map those attribute names to better human readable names that better represent the underlying data. You can also use it for aliases such as mapping `id` to `userID`.
	 *
	 * When retrieving data from DynamoDB, the attribute will be renamed to this property name, or the first element of the array if it is an array. If you want to change this behavior look at the `defaultMap` property.
	 *
	 * When saving to DynamoDB, the attribute name will always be used.
	 *
	 * ```js
	 * "pk": {
	 * 	"type": String,
	 * 	"alias": "userId"
	 * }
	 * "sk": {
	 * 	"type": String,
	 * 	"alias": "orderId"
	 * }
	 * ```
	 *
	 * ```js
	 * "id": {
	 * 	"type": String,
	 * 	"alias": ["userID", "_id"]
	 * }
	 * ```
	 */
	alias?: string | string[];
	/**
	 * This property can be used to use a different attribute name in your internal application as opposed to DynamoDB. This is especially useful if you have a single table design with properties like (`pk` & `sk`) which don't have much human readable meaning. You can use this to map those attribute names to better human readable names that better represent the underlying data. You can also use it for aliases such as mapping `id` to `userID`.
	 *
	 * When retrieving data from DynamoDB, the attribute will be renamed to this property name, or the first element of the array if it is an array. If you want to change this behavior look at the `defaultMap` property.
	 *
	 * When saving to DynamoDB, the attribute name will always be used.
	 *
	 * ```js
	 * "pk": {
	 * 	"type": String,
	 * 	"aliases": "userId"
	 * }
	 * "sk": {
	 * 	"type": String,
	 * 	"aliases": "orderId"
	 * }
	 * ```
	 *
	 * ```js
	 * "id": {
	 * 	"type": String,
	 * 	"aliases": ["userID", "_id"]
	 * }
	 * ```
	 */
	aliases?: string | string[];
	/**
	 * This property can be set to change the default attribute to be renamed to when retrieving data from DynamoDB. This can either be an element from the [`map`](#map-string--string) array or the attribute name.
	 *
	 * By default the attribute name will be used if no `map` property is set. If a `map` property is set, it will use that (or the first element of the array if it is an array).
	 *
	 * ```js
	 * "id": {
	 * 	"type": String,
	 * 	"map": "userID",
	 * 	"defaultMap": "id"
	 * }
	 * ```
	 */
	defaultMap?: string;
	/**
	 * This property can be set to change the default attribute to be renamed to when retrieving data from DynamoDB. This can either be an element from the `map` array or the attribute name.
	 *
	 * By default the attribute name will be used if no `map` property is set. If a `map` property is set, it will use that (or the first element of the array if it is an array).
	 *
	 * ```js
	 * "id": {
	 * 	"type": String,
	 * 	"map": "userID",
	 * 	"defaultAlias": "id"
	 * }
	 * ```
	 */
	defaultAlias?: string;
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
	getMapSettingValuesForKey: (key: string, settingNames?: string[]) => string[];
	getMapSettingObject: () => {[key: string]: string};
	getDefaultMapAttribute: (attribute: string) => string;
	getIndexAttributes: () => {index: IndexDefinition; attribute: string}[];
	getTimestampAttributes: () => GetTimestampAttributesType;
}

type GetTimestampAttributesType = ({
	"name": string;
	"value": AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[];
	"type": "createdAt" | "updatedAt";
})[];
function getTimestampAttributes (timestamps?: TimestampObject): GetTimestampAttributesType {
	if (!timestamps) {
		return [];
	}

	const createdAtArray = Array.isArray(timestamps.createdAt) ? timestamps.createdAt : [timestamps.createdAt];
	const updatedAtArray = Array.isArray(timestamps.updatedAt) ? timestamps.updatedAt : [timestamps.updatedAt];

	const combinedArray: GetTimestampAttributesType = [];
	function forEachFunc (type: "createdAt" | "updatedAt", inputArray: GetTimestampAttributesType) {
		return (val: string | SchemaDefinition) => {
			if (typeof val === "string") {
				inputArray.push({
					"name": val,
					"value": Date,
					type
				});
			} else if (val) {
				Object.entries(val).forEach(([key, value]) => {
					inputArray.push({
						"name": key,
						"value": value,
						type
					});
				});
			}
		};
	}
	createdAtArray.forEach(forEachFunc("createdAt", combinedArray));
	updatedAtArray.forEach(forEachFunc("updatedAt", combinedArray));

	return combinedArray;
}

export class Schema extends InternalPropertiesClass<SchemaInternalProperties> {
	/**
	 * You can use this method to create a schema. The `schema` parameter is an object defining your schema, each value should be a type or object defining the type with additional settings (listed below).
	 *
	 * The `options` parameter is an optional object with the following options:
	 *
	 * | Name | Type | Default | Information
	 * |---|---|---|---|
	 * | `saveUnknown` | array \| boolean | false | This setting lets you specify if the schema should allow properties not defined in the schema. If you pass `true` in for this option all unknown properties will be allowed. If you pass in an array of strings, only properties that are included in that array will be allowed. If you pass in an array of strings, you can use `*` to indicate a wildcard nested property one level deep, or `**` to indicate a wildcard nested property infinite levels deep (ex. `["person.*", "friend.**"]` will allow you store a property `person` with 1 level of unknown properties and `friend` with infinitely nested level unknown properties). If you retrieve items from DynamoDB with `saveUnknown` enabled, all custom Dynamoose types will be returned as the underlying DynamoDB type (ex. Dates will be returned as a Number representing number of milliseconds since Jan 1 1970).
	 * | `timestamps` | boolean \| object | false | This setting lets you indicate to Dynamoose that you would like it to handle storing timestamps in your items for both creation and most recent update times. If you pass in an object for this setting you must specify two keys `createdAt` & `updatedAt`, each with a value of a string or array of strings being the name of the attribute(s) for each timestamp. You can also set each of the `createdAt` & `updatedAt` properties equal to a Schema object. The keys of this Schema object represent the name of the attributes, with the value allowing for customization such as changing the storage type of the date. If you pass in `null` for either of those keys that specific timestamp won't be added to the schema. If you set this option to `true` it will use the default attribute names of `createdAt` & `updatedAt`.
	 * | `get` | function \| async function | undefined | You can use a get function on the schema to be run whenever retrieving a item from DynamoDB. Dynamoose will pass the entire item into this function and you must return the new value of the entire object you want Dynamoose to return to the application. This function will be run after all property `get` functions are run.
	 * | `set` | function \| async function | undefined | You can use a set function on the schema to be run whenever saving a item to DynamoDB. It will also be used when retrieving an item (ie. `get`, `query`, `update`, etc). Dynamoose will pass the entire item into this function and you must return the new value of the entire object you want Dynamoose to save to DynamoDB. This function will be run after all property `set` functions are run.
	 * | `validate` | function \| async function | undefined | You can use a validate function on the schema to ensure the value passes a given validation before saving the item. Dynamoose will pass the entire item into this function and you must return a boolean (`true` if validation passes or `false` if validation fails) or throw an error. This function will be run after all property `validate` functions are run.
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"age": Number
	 * }, {
	 * 	"saveUnknown": true,
	 * 	"timestamps": true
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"person": Object,
	 * 	"friend": Object
	 * }, {
	 * 	"saveUnknown": [
	 * 		"person.*", // store 1 level deep of nested properties in `person` property
	 * 		"friend.**" // store infinite levels deep of nested properties in `friend` property
	 * 	],
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"age": {
	 * 		"type": Number,
	 * 		"default": 5
	 * 	}
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"name": String
	 * }, {
	 * 	"timestamps": {
	 * 		"createdAt": "createDate",
	 * 		"updatedAt": null // updatedAt will not be stored as part of the timestamp
	 * 	}
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"name": String
	 * }, {
	 * 	"timestamps": {
	 * 		"createdAt": ["createDate", "creation"],
	 * 		"updatedAt": ["updateDate", "updated"]
	 * 	}
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"name": String
	 * }, {
	 * 	"timestamps": {
	 * 		"createdAt": {
	 * 			"created_at": {
	 * 				"type": {
	 * 					"value": Date,
	 * 					"settings": {
	 * 						"storage": "iso"
	 * 					}
	 * 				}
	 * 			}
	 * 		},
	 * 		"updatedAt": {
	 * 			"updated": {
	 * 				"type": {
	 * 					"value": Date,
	 * 					"settings": {
	 * 						"storage": "seconds"
	 * 					}
	 * 				}
	 * 			}
	 * 		}
	 * 	}
	 * });
	 * ```
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const schema = new dynamoose.Schema({
	 * 	"id": String,
	 * 	"name": String
	 * }, {
	 * 	"validate": (obj) => {
	 * 		if (!obj.id.beginsWith(name[0])) {
	 * 			throw new Error("id first letter of name.");
	 * 		}
	 * 		return true;
	 * 	}
	 * });
	 * ```
	 * @param object The schema object.
	 * @param settings The settings to apply to the schema.
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
			const combinedArray = getTimestampAttributes(settings.timestamps);
			combinedArray.forEach((prop) => {
				if (object[prop.name]) {
					throw new CustomError.InvalidParameter("Timestamp attributes must not be defined in schema.");
				}

				object[prop.name] = prop.value;
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

		const mapSettingNames = [
			"map",
			"alias",
			"aliases"
		];
		const defaultMapSettingNames = [
			"defaultMap",
			"defaultAlias"
		];
		this.setInternalProperties(internalProperties, {
			"schemaObject": parsedObject,
			"settings": parsedSettings,
			"getMapSettingValuesForKey": (key: string, settingNames?: string[]): string[] => utils.array_flatten(mapSettingNames.filter((name) => !settingNames || settingNames.includes(name)).map((mapSettingName) => {
				const result = this.getAttributeSettingValue(mapSettingName, key);
				if (Array.isArray(result)) {
					const filteredArray = result.filter((item) => Boolean(item));
					return filteredArray.length === 0 ? undefined : [...new Set(filteredArray)];
				}
				return result;
			}).filter((v) => Boolean(v))),
			"getMapSettingObject": (): {[key: string]: string} => {
				const attributes = this.attributes();
				return attributes.reduce((obj, attribute) => {
					const mapSettingValues: string[] = this.getInternalProperties(internalProperties).getMapSettingValuesForKey(attribute);
					mapSettingValues.forEach((val) => {
						obj[val] = attribute;
					});

					return obj;
				}, {});
			},
			"getDefaultMapAttribute": (attribute: string): string => {
				for (const name of defaultMapSettingNames) {
					const result = this.getAttributeSettingValue(name, attribute);
					if (result) {
						return result;
					}
				}
			},
			"getIndexAttributes": (): {index: IndexDefinition; attribute: string}[] => {
				return this.attributes()
					.map((attribute: string) => ({
						"index": this.getAttributeSettingValue("index", attribute) as IndexDefinition,
						attribute
					}))
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
			},
			"getTimestampAttributes": () => getTimestampAttributes(settings.timestamps as TimestampObject)
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

		this.attributes().forEach((key) => {
			const mapSettingValues = mapSettingNames.map((name) => this.getInternalProperties(internalProperties).getMapSettingValuesForKey(key, [name])).filter((v) => Boolean(v) && (!Array.isArray(v) || v.length > 0));
			if (mapSettingValues.length > 1) {
				throw new CustomError.InvalidParameter("Only one of map, alias, or aliases can be specified per attribute.");
			}
		});

		this.attributes().forEach((key) => {
			const defaultMapSettingValues = utils.array_flatten(defaultMapSettingNames.map((mapSettingName) => {
				const result = this.getAttributeSettingValue(mapSettingName, key);
				if (Array.isArray(result)) {
					const filteredArray = result.filter((item) => Boolean(item));
					return filteredArray.length === 0 ? undefined : filteredArray;
				}
				return result;
			}).filter((v) => Boolean(v)));
			if (defaultMapSettingValues.length > 1) {
				throw new CustomError.InvalidParameter("Only defaultMap or defaultAlias can be specified per attribute.");
			}
			const defaultMapSettingValue = defaultMapSettingValues[0];
			const defaultMapAttribute = defaultMapSettingNames.find((mapSettingName) => this.getAttributeSettingValue(mapSettingName, key));
			if (defaultMapSettingValue) {
				if (!this.getInternalProperties(internalProperties).getMapSettingValuesForKey(key).includes(defaultMapSettingValue) && defaultMapSettingValue !== key) {
					throw new CustomError.InvalidParameter(`${defaultMapAttribute} must exist in map, alias, or aliases property or be equal to attribute name.`);
				}
			}
		});

		const mapAttributes = this.attributes().map((key) => this.getInternalProperties(internalProperties).getMapSettingValuesForKey(key));
		const mapAttributesFlattened = utils.array_flatten(mapAttributes);
		const mapAttributesSet = new Set(mapAttributesFlattened);
		if (mapAttributesSet.size !== mapAttributesFlattened.length) {
			throw new CustomError.InvalidParameter("Each properties map, alias, or aliases properties must be unique across the entire schema.");
		}

		if ([...mapAttributesSet].some((key) => this.attributes().includes(key))) {
			throw new CustomError.InvalidParameter("Each properties map, alias, or aliases properties must be not be used as a property name in the schema.");
		}
	}

	/**
	 * This property returns an array of strings with each string being the name of an attribute. Only attributes that are indexes are returned.
	 *
	 * ```js
	 * const schema = new Schema({
	 * 	"id": String,
	 * 	"name": {
	 * 		"type": String,
	 * 		"index": true
	 * 	}
	 * });
	 * console.log(schema.indexAttributes); // ["name"]
	 * ```
	 */
	get indexAttributes (): string[] {
		return this.getInternalProperties(internalProperties).getIndexAttributes().map((key) => key.attribute);
	}

	attributes: (object?: ObjectType, settings?: SchemaAttributesMethodSettings) => string[];
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

		utils.array_flatten(await Promise.all([this.getInternalProperties(internalProperties).getIndexAttributes(), this.getIndexRangeKeyAttributes()])).map((obj) => obj.attribute).forEach((index) => {
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
		if (settings.defaults && isValueUndefined || settings.forceDefault && this.getAttributeSettingValue("forceDefault", key)) {
			const defaultValueRaw = this.getAttributeSettingValue("default", key);

			let hasMultipleTypes: boolean;
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
	getAttributeSettingValue (setting: string, key: string, settings: SchemaGetAttributeSettingValue = {"returnFunction": false}) {
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
	getSettingValue: (setting: string) => any;
	getAttributeTypeDetails: (key: string, settings?: { standardKey?: boolean; typeIndexOptionMap?: {} }) => DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[];
	getAttributeValue: (key: string, settings?: { standardKey?: boolean; typeIndexOptionMap?: {} }) => AttributeDefinition;
	getIndexes: (model: Model<Item>) => Promise<ModelIndexes>;
	getIndexRangeKeyAttributes: () => Promise<{ attribute: string }[]>;
}

// This function will take in an attribute and value, and throw an error if the property is required and the value is undefined or null.
Schema.prototype.requiredCheck = async function (this: Schema, key: string, value: ValueType): Promise<void> {
	const isRequired = this.getAttributeSettingValue("required", key);
	if ((typeof value === "undefined" || value === null) && (Array.isArray(isRequired) ? isRequired.some((val) => Boolean(val)) : isRequired)) {
		throw new CustomError.ValidationError(`${key} is a required property but has no value when trying to save item`);
	}
};

Schema.prototype.getIndexRangeKeyAttributes = async function (this: Schema): Promise<{attribute: string}[]> {
	const indexes: ({index: IndexDefinition; attribute: string})[] = await this.getInternalProperties(internalProperties).getIndexAttributes();
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
	const indexes: ModelIndexes = (await this.getInternalProperties(internalProperties).getIndexAttributes()).reduce((accumulator, currentValue) => {
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

interface SchemaAttributesMethodSettings {
	includeMaps: boolean;
}
Schema.prototype.attributes = function (this: Schema, object?: ObjectType, settings?: SchemaAttributesMethodSettings): string[] {
	const typePaths = object && this.getTypePaths(object);
	const main = (object: SchemaDefinition, existingKey = ""): string[] => {
		return Object.keys(object).reduce((accumulator: string[], key) => {
			const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
			accumulator.push(keyWithExisting);

			if (settings?.includeMaps) {
				accumulator.push(...this.getInternalProperties(internalProperties).getMapSettingValuesForKey(keyWithExisting));
			}

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
