import {Document} from "./Document";
import CustomError from "./Error";
import utils from "./utils";
const OR = Symbol("OR");
import {DynamoDB} from "aws-sdk";
import { ObjectType } from "./General";

const isRawConditionObject = (object): boolean => Object.keys(object).length === 3 && ["ExpressionAttributeValues", "ExpressionAttributeNames"].every((item) => Boolean(object[item]) && typeof object[item] === "object");

export type ConditionFunction = (condition: Condition) => Condition;
// TODO: There is a problem where you can have multiple keys in one `ConditionStorageType`, which will cause problems. We need to fix that. Likely be refactoring it so that the key is part of `ConditionsConditionStorageObject`.
type ConditionStorageType = {[key: string]: ConditionsConditionStorageObject} | typeof OR;
type ConditionStorageTypeNested = ConditionStorageType | Array<ConditionStorageTypeNested>;
type ConditionStorageSettingsConditions = ConditionStorageTypeNested[];
// TODO: the return value of the function below is incorrect. We need to add a property to the object that is a required string, where the property/key name is always equal to `settings.conditionString`
type ConditionRequestObjectResult = {ExpressionAttributeNames?: DynamoDB.Types.ExpressionAttributeNameMap; ExpressionAttributeValues?: DynamoDB.Types.ExpressionAttributeValueMap};

interface ConditionComparisonType {
	name: ConditionComparisonComparatorName;
	typeName: ConditionComparisonComparatorDynamoName;
	not?: ConditionComparisonComparatorDynamoName;
	multipleArguments?: boolean;
}
enum ConditionComparisonComparatorName {
	equals = "eq",
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
export type ConditionInitalizer = Condition | ObjectType | string;

export class Condition {
	settings: {
		// TODO: fix this below, it should be a reference to `OR` not Symbol, you are only allowed to pass in OR here, not any other Symbol.
		conditions: ConditionStorageSettingsConditions;
		pending: {
			key?: string;
			type?: ConditionComparisonType;
			value?: any;
			not?: boolean;
		};
		raw?: ConditionInitalizer;
	};
	and: () => Condition;
	or: () => Condition;
	not: () => Condition;
	parenthesis: (value: Condition | ConditionFunction) => Condition;
	group: (value: Condition | ConditionFunction) => Condition;
	where: (key: string) => Condition;
	filter: (key: string) => Condition;
	attribute: (key: string) => Condition;
	eq: (value: any) => Condition;
	lt: (value: number) => Condition;
	le: (value: number) => Condition;
	gt: (value: number) => Condition;
	ge: (value: number) => Condition;
	beginsWith: (value: any) => Condition;
	contains: (value: any) => Condition;
	exists: (value: any) => Condition;
	in: (value: any) => Condition;
	between: (...values: any[]) => Condition;

	requestObject: (settings?: ConditionRequestObjectSettings) => ConditionRequestObjectResult;

	constructor(object?: ConditionInitalizer) {
		if (object instanceof Condition) {
			Object.entries(object).forEach((entry) => {
				const [key, value] = entry;
				this[key] = value;
			});
		} else {
			this.settings = {
				"conditions": [],
				"pending": {} // represents the pending chain of filter data waiting to be attached to the `conditions` parameter. For example, storing the key before we know what the comparison operator is.
			};

			if (typeof object === "object") {
				if (!isRawConditionObject(object)) {
					Object.keys(object).forEach((key) => {
						const value = object[key];
						const valueType = typeof value === "object" && Object.keys(value).length > 0 ? Object.keys(value)[0] : "eq";
						const comparisonType = types.find((item) => item.name === valueType);

						if (!comparisonType) {
							throw new CustomError.InvalidFilterComparison(`The type: ${valueType} is invalid.`);
						}

						this.settings.conditions.push({
							[key]: {
								"type": comparisonType.typeName,
								"value": typeof value[valueType] !== "undefined" && value[valueType] !== null ? value[valueType] : value
							}
						});
					});
				}
			} else if (object) {
				this.settings.pending.key = object;
			}
		}
		this.settings.raw = object;

		return this;
	}
}

interface ConditionsConditionStorageObject {
	type: ConditionComparisonComparatorDynamoName;
	value: any;
}

function finalizePending(instance: Condition): void {
	const pending = instance.settings.pending;

	let dynamoNameType: ConditionComparisonComparatorDynamoName;
	if (pending.not === true) {
		if (!pending.type.not) {
			throw new CustomError.InvalidFilterComparison(`${pending.type.typeName} can not follow not()`);
		}
		dynamoNameType = pending.type.not;
	} else {
		dynamoNameType = pending.type.typeName;
	}

	instance.settings.conditions.push({
		[pending.key]: {
			"type": dynamoNameType,
			"value": pending.value
		}
	});

	instance.settings.pending = {};
}

Condition.prototype.parenthesis = Condition.prototype.group = function (this: Condition, value: Condition | ConditionFunction): Condition {
	value = typeof value === "function" ? value(new Condition()) : value;
	this.settings.conditions.push(value.settings.conditions);
	return this;
};
Condition.prototype.or = function(this: Condition): Condition {
	this.settings.conditions.push(OR);
	return this;
};
Condition.prototype.and = function(this: Condition): Condition { return this; };
Condition.prototype.not = function(this: Condition): Condition {
	this.settings.pending.not = !this.settings.pending.not;
	return this;
};
Condition.prototype.where = Condition.prototype.filter = Condition.prototype.attribute = function(this: Condition, key: string): Condition {
	this.settings.pending = {key};
	return this;
};
// TODO: I don't think this prototypes are being exposed which is gonna cause a lot of problems with our type definition file. Need to figure out a better way to do this since they aren't defined and are dynamic.
types.forEach((type) => {
	Condition.prototype[type.name] = function(this: Condition, ...args: any[]): Condition {
		this.settings.pending.value = type.multipleArguments ? args : args[0];
		this.settings.pending.type = type;
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
Condition.prototype.requestObject = function(this: Condition, settings: ConditionRequestObjectSettings = {"conditionString": "ConditionExpression", "conditionStringType": "string"}): ConditionRequestObjectResult {
	if (this.settings.raw && utils.object.equals(Object.keys(this.settings.raw).sort(), [settings.conditionString, "ExpressionAttributeValues", "ExpressionAttributeNames"].sort())) {
		return Object.entries((this.settings.raw as ObjectType).ExpressionAttributeValues).reduce((obj, entry) => {
			const [key, value] = entry;
			// TODO: we should fix this so that we can do `isDynamoItem(value)`
			if (!Document.isDynamoObject({"key": value})) {
				obj.ExpressionAttributeValues[key] = Document.objectToDynamo(value, {"type": "value"});
			}
			return obj;
		}, this.settings.raw as ObjectType);
	} else if (this.settings.conditions.length === 0) {
		return {};
	}

	let index = (settings.index || {}).start || 0;
	const setIndex = (i: number): void => {index = i; (settings.index || {"set": utils.empty_function}).set(i);};
	function main(input: ConditionStorageSettingsConditions): ConditionRequestObjectResult {
		return input.reduce((object: ConditionRequestObjectResult, entry: ConditionStorageTypeNested, i: number, arr: any[]) => {
			let expression = "";
			if (Array.isArray(entry)) {
				const result = main(entry);
				const newData = utils.merge_objects.main({"combineMethod": "object_combine"})({...result}, {...object});
				const returnObject = utils.object.pick(newData, ["ExpressionAttributeNames", "ExpressionAttributeValues"]);

				expression = settings.conditionStringType === "array" ? result[settings.conditionString] : `(${result[settings.conditionString]})`;
				object = {...object, ...returnObject};
			} else if (entry !== OR) {
				const [key, condition] = Object.entries(entry)[0];
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
				const toDynamo = (value: ObjectType): DynamoDB.AttributeValue => {
					return Document.objectToDynamo(value, {"type": "value"});
				};
				object.ExpressionAttributeValues[keys.value] = toDynamo(value);

				switch (condition.type) {
				case "EQ":
				case "NE":
					expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
					break;
				case "IN":
					delete object.ExpressionAttributeValues[keys.value];
					expression = `${keys.name} IN (${value.map((_v: any, i: number) => `${keys.value}_${i + 1}`).join(", ")})`;
					value.forEach((valueItem: any, i: number) => {
						object.ExpressionAttributeValues[`${keys.value}_${i + 1}`] = toDynamo(valueItem);
					});
					break;
				case "GT":
				case "GE":
				case "LT":
				case "LE":
					expression = `${keys.name} ${condition.type.startsWith("G") ? ">" : "<"}${condition.type.endsWith("E") ? "=" : ""} ${keys.value}`;
					break;
				case "BETWEEN":
					expression = `${keys.name} BETWEEN ${keys.value}_1 AND ${keys.value}_2`;
					object.ExpressionAttributeValues[`${keys.value}_1`] = toDynamo(value[0]);
					object.ExpressionAttributeValues[`${keys.value}_2`] = toDynamo(value[1]);
					delete object.ExpressionAttributeValues[keys.value];
					break;
				case "CONTAINS":
				case "NOT_CONTAINS":
					expression = `${condition.type === "NOT_CONTAINS" ? "NOT " : ""}contains (${keys.name}, ${keys.value})`;
					break;
				case "EXISTS":
				case "NOT_EXISTS":
					expression = `attribute_${condition.type === "NOT_EXISTS" ? "not_" : ""}exists (${keys.name})`;
					delete object.ExpressionAttributeValues[keys.value];
					break;
				case "BEGINS_WITH":
					expression = `begins_with (${keys.name}, ${keys.value})`;
					break;
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
	return main(this.settings.conditions);
};
