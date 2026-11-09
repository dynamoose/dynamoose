import {Item} from "./Item";
import CustomError from "./Error";
import utils from "./utils";
const OR = Symbol("OR");
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import {ObjectType} from "./General";
import {ExpressionAttributeNameMap, ExpressionAttributeValueMap} from "./Types";
import Internal from "./Internal";
import {Model} from "./Model";
import {InternalPropertiesClass} from "./InternalPropertiesClass";
const {internalProperties} = Internal.General;

const isRawConditionObject = (object): boolean => Object.keys(object).length === 3 && ["ExpressionAttributeValues", "ExpressionAttributeNames"].every((item) => Boolean(object[item]) && typeof object[item] === "object");

export type ConditionFunction = (condition: Condition) => Condition;
// One stored comparison: an object with the attribute as its only key. Every comparison is stored by `conditionEntry`, so each has exactly one key, which the code that reads them (`Object.entries(entry)[0]`) relies on.
type ConditionStorageType = {[key: string]: ConditionsConditionStorageObject} | typeof OR;
const conditionEntry = (attribute: string, type: ConditionComparisonComparatorDynamoName, value: any): ConditionStorageType => ({[attribute]: {type, value}});
export type ConditionStorageTypeNested = ConditionStorageType | Array<ConditionStorageTypeNested>;
type ConditionStorageSettingsConditions = ConditionStorageTypeNested[];
// TODO: the return value of the function below is incorrect. We need to add a property to the object that is a required string, where the property/key name is always equal to `settings.conditionString`
type ConditionRequestObjectResult = {ExpressionAttributeNames?: ExpressionAttributeNameMap; ExpressionAttributeValues?: ExpressionAttributeValueMap};

interface ConditionComparisonType {
	name: ConditionComparisonComparatorName;
	typeName: ConditionComparisonComparatorDynamoName;
	not?: ConditionComparisonComparatorDynamoName;
	multipleArguments?: boolean;
}
enum ConditionComparisonComparatorName {
	equals = "eq",
	notEquals = "ne",
	lessThan = "lt",
	lessThanEquals = "le",
	greaterThan = "gt",
	greaterThanEquals = "ge",
	beginsWith = "beginsWith",
	contains = "contains",
	exists = "exists",
	in = "in",
	between = "between"
}
enum ConditionComparisonComparatorDynamoName {
	equals = "EQ",
	notEquals = "NE",
	lessThan = "LT",
	lessThanEquals = "LE",
	greaterThan = "GT",
	greaterThanEquals = "GE",
	beginsWith = "BEGINS_WITH",
	contains = "CONTAINS",
	notContains = "NOT_CONTAINS",
	exists = "EXISTS",
	notExists = "NOT_EXISTS",
	in = "IN",
	between = "BETWEEN"
}
const types: ConditionComparisonType[] = [
	{"name": ConditionComparisonComparatorName.equals, "typeName": ConditionComparisonComparatorDynamoName.equals, "not": ConditionComparisonComparatorDynamoName.notEquals},
	{"name": ConditionComparisonComparatorName.notEquals, "typeName": ConditionComparisonComparatorDynamoName.notEquals, "not": ConditionComparisonComparatorDynamoName.equals},
	{"name": ConditionComparisonComparatorName.lessThan, "typeName": ConditionComparisonComparatorDynamoName.lessThan, "not": ConditionComparisonComparatorDynamoName.greaterThanEquals},
	{"name": ConditionComparisonComparatorName.lessThanEquals, "typeName": ConditionComparisonComparatorDynamoName.lessThanEquals, "not": ConditionComparisonComparatorDynamoName.greaterThan},
	{"name": ConditionComparisonComparatorName.greaterThan, "typeName": ConditionComparisonComparatorDynamoName.greaterThan, "not": ConditionComparisonComparatorDynamoName.lessThanEquals},
	{"name": ConditionComparisonComparatorName.greaterThanEquals, "typeName": ConditionComparisonComparatorDynamoName.greaterThanEquals, "not": ConditionComparisonComparatorDynamoName.lessThan},
	{"name": ConditionComparisonComparatorName.beginsWith, "typeName": ConditionComparisonComparatorDynamoName.beginsWith},
	{"name": ConditionComparisonComparatorName.contains, "typeName": ConditionComparisonComparatorDynamoName.contains, "not": ConditionComparisonComparatorDynamoName.notContains},
	{"name": ConditionComparisonComparatorName.exists, "typeName": ConditionComparisonComparatorDynamoName.exists, "not": ConditionComparisonComparatorDynamoName.notExists},
	{"name": ConditionComparisonComparatorName.in, "typeName": ConditionComparisonComparatorDynamoName.in},
	{"name": ConditionComparisonComparatorName.between, "typeName": ConditionComparisonComparatorDynamoName.between, "multipleArguments": true}
];
export type ConditionInitializer = Condition | ObjectType | string;

export interface BasicOperators<T = Condition> {
	and: () => T;
	or: () => T;
	not: () => T;
	parenthesis: (value: Condition | ConditionFunction) => T;
	group: (value: Condition | ConditionFunction) => T;
	where: (key: string) => T;
	filter: (key: string) => T;
	attribute: (key: string) => T;
	eq: (value: any) => T;
	lt: (value: any) => T;
	le: (value: any) => T;
	gt: (value: any) => T;
	ge: (value: any) => T;
	beginsWith: (value: any) => T;
	contains: (value: any) => T;
	exists: () => T;
	in: (value: any) => T;
	between: (...values: any[]) => T;
}

export interface Condition extends BasicOperators { // eslint-disable-line @typescript-eslint/no-unsafe-declaration-merging
	where: (key: string) => Condition;
	filter: (key: string) => Condition;
	attribute: (key: string) => Condition;
	eq: (value: any) => Condition;
	lt: (value: any) => Condition;
	le: (value: any) => Condition;
	gt: (value: any) => Condition;
	ge: (value: any) => Condition;
	beginsWith: (value: any) => Condition;
	contains: (value: any) => Condition;
	exists: () => Condition;
	in: (value: any) => Condition;
	between: (...values: any[]) => Condition;
}

type ConditionObject = {
	[key: string]: {
		type: ConditionComparisonComparatorDynamoName;
		value: any;
	}
} | typeof OR;

interface ConditionInternalProperties {
	requestObject: (model: Model<Item>, settings?: ConditionRequestObjectSettings) => Promise<ConditionRequestObjectResult>;
	settings?: {
		conditions?: ConditionObject[];
		pending?: {
			key?: string;
			not?: boolean;
			type?: ConditionComparisonType;
			value?: any;
		}; // represents the pending chain of filter data waiting to be attached to the `conditions` parameter. For example, storing the key before we know what the comparison operator is.
		raw?: ConditionInitializer;
	},
	comparisonChart: (model: Model<Item>) => Promise<any>;
}

export class Condition extends InternalPropertiesClass<ConditionInternalProperties> { // eslint-disable-line @typescript-eslint/no-unsafe-declaration-merging
	/**
	 * This function creates a condition. A string starts a comparison on that attribute (`new dynamoose.Condition("name").eq("Bob")`), and without an argument you start one with `where(key)`. An object compares each of its attributes: a value compares with `eq` (`{"name": "Bob"}`), and an object names its comparison (`{"age": {"gt": 5}}`). A condition is copied. A raw DynamoDB condition object (the `ConditionExpression` or `FilterExpression` the request uses, with `ExpressionAttributeNames` and `ExpressionAttributeValues`) is used as it is, and condition methods called on it are ignored.
	 * @param object The attribute to start a comparison on, an object of comparisons, a condition to copy, or a raw DynamoDB condition object.
	 * @returns Condition
	 */
	constructor (object?: ConditionInitializer) {
		super();

		this.setInternalProperties(internalProperties, {
			"requestObject": async (model: Model<Item>, settings: ConditionRequestObjectSettings = {"conditionString": "ConditionExpression", "conditionStringType": "string"}): Promise<ConditionRequestObjectResult> => {
				const toDynamo = async (key: string, value: ObjectType): Promise<DynamoDB.AttributeValue> => {
					const newObj = await Item.objectFromSchema({[key]: value}, model, {"type": "toDynamo", "modifiers": ["set"], "typeCheck": false, "mapAttributes": true});
					// The schema's `set` setting can add attributes to the object, so the value is the one under `key`. `key` is a raw condition's placeholder or an attribute name already resolved from its alias, so `mapAttributes` doesn't rename it.
					const newValue = newObj[key];
					// DynamoDB rejects an expression that uses a value placeholder without a value.
					if (newValue === undefined) {
						throw new CustomError.InvalidParameter(`The condition on "${key}" has no value (it is undefined).`);
					}
					return Item.objectToDynamo(newValue, {"type": "value"});
				};

				if (this.getInternalProperties(internalProperties).settings.raw && utils.object.equals(Object.keys(this.getInternalProperties(internalProperties).settings.raw).sort(), [settings.conditionString, "ExpressionAttributeValues", "ExpressionAttributeNames"].sort())) {
					const raw = this.getInternalProperties(internalProperties).settings.raw as ObjectType;
					// Every `:value` placeholder in the expression needs a value, which DynamoDB would otherwise reject.
					const missingValue = (raw[settings.conditionString].match(/:\w+/gu) || []).find((placeholder: string) => raw.ExpressionAttributeValues[placeholder] === undefined);
					if (missingValue) {
						throw new CustomError.InvalidParameter(`The raw condition has no value for "${missingValue}" (it is undefined).`);
					}
					return utils.async_reduce(Object.entries((this.getInternalProperties(internalProperties).settings.raw as ObjectType).ExpressionAttributeValues), async (obj, entry) => {
						const [key, value] = entry;
						if (!Item.isDynamoValue(value)) {
							obj.ExpressionAttributeValues[key] = await toDynamo(key, value);
						}
						return obj;
					}, this.getInternalProperties(internalProperties).settings.raw as ObjectType);
				} else if (this.getInternalProperties(internalProperties).settings.conditions.length === 0) {
					return {};
				}

				let index = (settings.index || {}).start || 0;
				const setIndex = (i: number): void => {
					index = i; (settings.index || {"set": utils.empty_function}).set(i);
				};
				async function main (input: ConditionStorageSettingsConditions): Promise<ConditionRequestObjectResult> {
					return utils.async_reduce(input, async (object: ConditionRequestObjectResult, entry: ConditionStorageTypeNested, i: number, arr: any[]) => {
						let expression = "";
						if (Array.isArray(entry)) {
							const result = await main(entry);
							const newData = utils.merge_objects.main({"combineMethod": "object_combine"})({...result}, {...object});
							const returnObject = utils.object.pick(newData, ["ExpressionAttributeNames", "ExpressionAttributeValues"]);

							expression = settings.conditionStringType === "array" ? result[settings.conditionString] : `(${result[settings.conditionString]})`;
							object = {...object, ...returnObject};
						} else if (entry !== OR) {
							const keyConditionObj = Object.entries(entry)[0];
							const key = await model.getInternalProperties(internalProperties).dynamoPropertyForAttribute(keyConditionObj[0]);
							const condition = keyConditionObj[1];
							const {value} = condition;
							const keys = {"name": `#a${index}`, "value": `:v${index}`};
							setIndex(++index);

							const keyParts = key.split(".");
							if (keyParts.length === 1) {
								object.ExpressionAttributeNames[keys.name] = key;
							} else {
								keys.name = keyParts.reduce((finalName, part, index) => {
									const name = `${keys.name}_${index}`;
									object.ExpressionAttributeNames[name] = part;
									finalName.push(name);
									return finalName;
								}, []).join(".");
							}
							// `IN` and `BETWEEN` convert each of their values, and `EXISTS` has none.
							if (["IN", "BETWEEN"].includes(condition.type)) {
								// Without a list there are no values to convert, which DynamoDB would otherwise reject.
								if (value === undefined) {
									throw new CustomError.InvalidParameter(`The condition on "${key}" has no value (it is undefined).`);
								}
							} else if (!["EXISTS", "NOT_EXISTS"].includes(condition.type)) {
								object.ExpressionAttributeValues[keys.value] = await toDynamo(key, value);
							}

							switch (condition.type) {
							case "EQ":
							case "NE":
								expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
								break;
							case "IN":
								expression = `${keys.name} IN (${value.map((_v: any, i: number) => `${keys.value}_${i + 1}`).join(", ")})`;
								await Promise.all(value.map(async (valueItem: any, i: number) => {
									object.ExpressionAttributeValues[`${keys.value}_${i + 1}`] = await toDynamo(key, valueItem);
								}));
								break;
							case "GT":
							case "GE":
							case "LT":
							case "LE":
								expression = `${keys.name} ${condition.type.startsWith("G") ? ">" : "<"}${condition.type.endsWith("E") ? "=" : ""} ${keys.value}`;
								break;
							case "BETWEEN":
								expression = `${keys.name} BETWEEN ${keys.value}_1 AND ${keys.value}_2`;
								object.ExpressionAttributeValues[`${keys.value}_1`] = await toDynamo(key, value[0]);
								object.ExpressionAttributeValues[`${keys.value}_2`] = await toDynamo(key, value[1]);
								break;
							case "CONTAINS":
							case "NOT_CONTAINS":
								expression = `${condition.type === "NOT_CONTAINS" ? "NOT " : ""}contains (${keys.name}, ${keys.value})`;
								break;
							case "EXISTS":
							case "NOT_EXISTS":
								expression = `attribute_${condition.type === "NOT_EXISTS" ? "not_" : ""}exists (${keys.name})`;
								break;
							case "BEGINS_WITH": {
								// DynamoDB rejects `begins_with` with any other operand (`Incorrect operand type for operator or function`).
								const [valueType] = Object.keys(object.ExpressionAttributeValues[keys.value]);
								if (valueType !== "S" && valueType !== "B") {
									throw new CustomError.InvalidParameter(`The beginsWith condition on "${key}" needs a string or binary value, but the value has the DynamoDB type ${valueType}.`);
								}
								expression = `begins_with (${keys.name}, ${keys.value})`;
								break;
							}
							}
						} else {
							return object;
						}

						const conditionStringNewItems: string[] = [expression];
						if (object[settings.conditionString].length > 0) {
							conditionStringNewItems.unshift(` ${arr[i - 1] === OR ? "OR" : "AND"} `);
						}
						conditionStringNewItems.forEach((item) => {
							if (typeof object[settings.conditionString] === "string") {
								object[settings.conditionString] = `${object[settings.conditionString]}${item}`;
							} else {
								object[settings.conditionString].push(Array.isArray(item) ? item : item.trim());
							}
						});

						return object;
					}, {[settings.conditionString]: settings.conditionStringType === "array" ? [] : "", "ExpressionAttributeNames": {}, "ExpressionAttributeValues": {}});
				}

				// DynamoDB rejects an empty `ExpressionAttributeNames` or `ExpressionAttributeValues`, so an empty one is left out. A value in them is kept as it is, even an empty list, map or binary value, which is a value DynamoDB compares with.
				const requestObject = await main(this.getInternalProperties(internalProperties).settings.conditions);
				return Object.entries(requestObject).reduce((result, [key, value]) => {
					if (typeof value !== "object" || Object.keys(value).length > 0) {
						result[key] = value;
					}
					return result;
				}, {});
			},
			"comparisonChart": (model: Model<Item>): Promise<any> => {
				const comparisonChart = this.getInternalProperties(internalProperties).settings.conditions.reduce((res, item) => {
					const myItem = Object.entries(item)[0];
					const key = myItem[0];
					res[key] = {"type": (myItem[1] as any).type};
					return res;
				}, {});

				return Item.objectFromSchema(comparisonChart, model, {"type": "toDynamo", "typeCheck": false, "mapAttributes": true});
			}
		});

		if (object instanceof Condition) {
			this.setInternalProperties(internalProperties, {
				...this.getInternalProperties(internalProperties),
				"settings": {...object.getInternalProperties(internalProperties).settings}
			});
		} else {
			this.setInternalProperties(internalProperties, {
				...this.getInternalProperties(internalProperties),
				"settings": {
					"conditions": [],
					"pending": {} // represents the pending chain of filter data waiting to be attached to the `conditions` parameter. For example, storing the key before we know what the comparison operator is.
				}
			});

			if (typeof object === "object") {
				if (!isRawConditionObject(object)) {
					Object.keys(object).forEach((key) => {
						const value = object[key];
						// `{"id": {"le": 5}}` names its comparison; any other value (`{"id": 5}`, a Date, `undefined`, `null`) is compared with `eq`.
						const isComparisonObject = value !== null && typeof value === "object" && Object.keys(value).length > 0;
						const valueType = isComparisonObject ? Object.keys(value)[0] : "eq";
						const comparisonType = types.find((item) => item.name === valueType);

						if (!comparisonType) {
							throw new CustomError.InvalidFilterComparison(`The type: ${valueType} is invalid.`);
						}

						this.getInternalProperties(internalProperties).settings.conditions.push(conditionEntry(key, comparisonType.typeName, isComparisonObject ? value[valueType] : value));
					});
				}
			} else if (object) {
				const internalPropertiesObject = this.getInternalProperties(internalProperties);
				internalPropertiesObject.settings.pending.key = object;
				this.setInternalProperties(internalProperties, internalPropertiesObject);
			}

			const internalPropertiesObject = this.getInternalProperties(internalProperties);
			internalPropertiesObject.settings.raw = object;
			this.setInternalProperties(internalProperties, internalPropertiesObject);
		}

		return this;
	}

	/**
	 * This function specifies an `OR` join between two conditions, as opposed to the default `AND`. The condition will return `true` if either condition is met.
	 *
	 * ```js
	 * new dynamoose.Condition().where("id").eq(1).or().where("name").eq("Bob"); // id = 1 OR name = Bob
	 * ```
	 * @returns Condition
	 */
	or (): Condition {
		this.getInternalProperties(internalProperties).settings.conditions.push(OR);
		return this;
	}
	/**
	 * This function has no behavior and is only used to increase readability of your conditional. This function can be omitted with no behavior change to your code.
	 *
	 * ```js
	 * // The two condition objects below are identical
	 * new dynamoose.Condition().where("id").eq(1).and().where("name").eq("Bob");
	 * new dynamoose.Condition().where("id").eq(1).where("name").eq("Bob");
	 * ```
	 * @returns Condition
	 */
	and (): Condition {
		return this;
	}
	/**
	 * This function sets the condition to use the opposite comparison type for the given condition. You can find the list opposite comparison types below.
	 *
	 * | Original | Opposite |
	 * |---|---|
	 * | equals (EQ) | not equals (NE) |
	 * | less than or equals (LE) | greater than (GT) |
	 * | less than (LT) | greater than or equals (GE) |
	 * | null (NULL) | not null (NOT_NULL) |
	 * | contains (CONTAINS) | not contains (NOT_CONTAINS) |
	 * | exists (EXISTS) | not exists (NOT_EXISTS) |
	 *
	 * The following comparisons do not have an opposite comparison type, and will throw an error if you try to use condition.not() with them.
	 *
	 * | Original |
	 * |---|
	 * | in (IN) |
	 * | between (BETWEEN) |
	 * | begins with (BEGINS_WITH) |
	 *
	 * ```js
	 * new dynamoose.Condition().where("id").not().eq(1); // Retrieve all objects where id does NOT equal 1
	 * new dynamoose.Condition().where("id").not().between(1, 2); // Will throw error since between does not have an opposite comparison type
	 * ```
	 * @returns Condition
	 */
	not (): Condition {
		this.getInternalProperties(internalProperties).settings.pending.not = !this.getInternalProperties(internalProperties).settings.pending.not;
		return this;
	}

	/**
	 * This function takes in a `Condition` instance as a parameter and uses that as a group. This lets you specify the priority of the conditional. You can also pass a function into the `condition` parameter and Dynamoose will call your function with one argument which is a condition instance that you can return to specify the group.
	 *
	 * ```js
	 * // The two condition objects below are identical
	 * new dynamoose.Condition().where("id").eq(1).and().parenthesis(new dynamoose.Condition().where("name").eq("Bob")); // id = 1 AND (name = Bob)
	 * new dynamoose.Condition().where("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob")); // id = 1 AND (name = Bob)
	 * ```
	 *
	 * `condition.group` is an alias to this method.
	 * @param condition A new Condition instance or a function. If a function is passed, it will be called with one argument which is a condition instance that you can return to specify the group.
	 * @returns Condition
	 */
	parenthesis (condition: Condition | ConditionFunction): Condition {
		condition = typeof condition === "function" ? condition(new Condition()) : condition;
		const conditions = condition.getInternalProperties(internalProperties).settings.conditions;
		this.getInternalProperties(internalProperties).settings.conditions.push(conditions as any);
		return this;
	}
	/**
	 * This function takes in a `Condition` instance as a parameter and uses that as a group. This lets you specify the priority of the conditional. You can also pass a function into the `condition` parameter and Dynamoose will call your function with one argument which is a condition instance that you can return to specify the group.
	 *
	 * ```js
	 * // The two condition objects below are identical
	 * new dynamoose.Condition().where("id").eq(1).and().group(new dynamoose.Condition().where("name").eq("Bob")); // id = 1 AND (name = Bob)
	 * new dynamoose.Condition().where("id").eq(1).and().group((condition) => condition.where("name").eq("Bob")); // id = 1 AND (name = Bob)
	 * ```
	 *
	 * `condition.parenthesis` is an alias to this method.
	 * @param condition A new Condition instance or a function. If a function is passed, it will be called with one argument which is a condition instance that you can return to specify the group.
	 * @returns Condition
	 */
	group (condition: Condition | ConditionFunction): Condition {
		return this.parenthesis(condition);
	}
}

interface ConditionsConditionStorageObject {
	type: ConditionComparisonComparatorDynamoName;
	value: any;
}

function finalizePending (instance: Condition): void {
	const pending = instance.getInternalProperties(internalProperties).settings.pending;

	let dynamoNameType: ConditionComparisonComparatorDynamoName;
	if (pending.not === true) {
		if (!pending.type.not) {
			throw new CustomError.InvalidFilterComparison(`${pending.type.typeName} can not follow not()`);
		}
		dynamoNameType = pending.type.not;
	} else {
		dynamoNameType = pending.type.typeName;
	}

	instance.getInternalProperties(internalProperties).settings.conditions.push(conditionEntry(pending.key, dynamoNameType, pending.value));

	instance.getInternalProperties(internalProperties).settings.pending = {};
}

Condition.prototype.where = Condition.prototype.filter = Condition.prototype.attribute = function (this: Condition, key: string): Condition {
	this.getInternalProperties(internalProperties).settings.pending = {key};
	return this;
};
// TODO: I don't think this prototypes are being exposed which is gonna cause a lot of problems with our type definition file. Need to figure out a better way to do this since they aren't defined and are dynamic.
types.forEach((type) => {
	Condition.prototype[type.name] = function (this: Condition, ...args: any[]): Condition {
		this.getInternalProperties(internalProperties).settings.pending.value = type.multipleArguments ? args : args[0];
		this.getInternalProperties(internalProperties).settings.pending.type = type;
		finalizePending(this);
		return this;
	};
});

interface ConditionRequestObjectSettings {
	conditionString: string;
	index?: {
		start: number;
		set: (newIndex: number) => void;
	};
	conditionStringType: "array" | "string";
}
