import Document from "./Document";
import CustomError from "./Error";
import utils from "./utils";
const OR = Symbol("OR");
import {DynamoDB} from "aws-sdk";

type ConditionFunction = (condition: Condition) => Condition;
type ConditionStorageType = [string, ConditionsConditionStorageObject] | typeof OR;
type ConditionStorageTypeNested = ConditionStorageType | Array<ConditionStorageTypeNested>;

class Condition {
	settings: {
		// TODO: fix this below, it should be a reference to `OR` not Symbol, you are only allowed to pass in OR here, not any other Symbol.
		conditions: ConditionStorageTypeNested[];
		pending: {
			key?: string;
			type?: ConditionComparisonType;
			value?: any;
			not?: boolean;
		};
	};
	and: () => Condition;
	or: () => Condition;
	not: () => Condition;
	parenthesis: (value: Condition | ConditionFunction) => Condition;
	group: (value: Condition | ConditionFunction) => Condition;
	where: (key: string) => Condition;
	filter: (key: string) => Condition;
	attribute: (key: string) => Condition;
	requestObject: (settings?: ConditionRequestObjectSettings) => any;

	constructor(object?: Condition | {[key: string]: any} | string) {
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
				Object.keys(object).forEach((key) => {
					const value = object[key];
					const valueType = typeof value === "object" && Object.keys(value).length > 0 ? Object.keys(value)[0] : "eq";
					const comparisonType = types.find((item) => item.name === valueType);

					if (!comparisonType) {
						throw CustomError.InvalidFilterComparison(`The type: ${valueType} is invalid.`);
					}

					this.settings.conditions.push([key, {"type": comparisonType.typeName, "value": typeof value[valueType] !== "undefined" && value[valueType] !== null ? value[valueType] : value}]);
				});
			} else if (object) {
				this.settings.pending.key = object;
			}
		}

		return this;
	}
}

interface ConditionsConditionStorageObject {
	type: ConditionComparisonComparatorDynamoName;
	value: any;
}

function finalizePending(instance: Condition) {
	const pending = instance.settings.pending;

	let dynamoNameType: ConditionComparisonComparatorDynamoName;
	if (pending.not === true) {
		if (!pending.type.not) {
			throw CustomError.InvalidFilterComparison(`${pending.type.typeName} can not follow not()`);
		}
		dynamoNameType = pending.type.not;
	} else {
		dynamoNameType = pending.type.typeName;
	}

	instance.settings.conditions.push([pending.key, {
		"type": dynamoNameType,
		"value": pending.value
	}]);

	instance.settings.pending = {};
}

Condition.prototype.parenthesis = Condition.prototype.group = function (value: Condition | ConditionFunction): Condition {
	value = typeof value === "function" ? value(new Condition()) : value;
	this.settings.conditions.push(value.settings.conditions);
	return this;
};
Condition.prototype.or = function() {
	this.settings.conditions.push(OR);
	return this;
};
Condition.prototype.and = function() { return this; };
Condition.prototype.not = function() {
	this.settings.pending.not = !this.settings.pending.not;
	return this;
};
Condition.prototype.where = Condition.prototype.filter = Condition.prototype.attribute = function(key: string) {
	this.settings.pending = {key};
	return this;
};
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
types.forEach((type) => {
	Condition.prototype[type.name] = function(value: any) {
		this.settings.pending.value = type.multipleArguments ? [...arguments] : value;
		this.settings.pending.type = type;
		finalizePending(this);
		return this;
	};
});

interface ConditionRequestObjectSettings {
	conditionString: string;
	index?: {
		starting: number;
		set: (newIndex: number) => void;
	};
}
Condition.prototype.requestObject = function(settings: ConditionRequestObjectSettings = {"conditionString": "ConditionExpression"}): {ExpressionAttributeNames?: DynamoDB.Types.ExpressionAttributeNameMap; ExpressionAttributeValues?: DynamoDB.Types.ExpressionAttributeValueMap} {
	if (this.settings.conditions.length === 0) {
		return {};
	}

	let index = (settings.index || {}).starting || 0;
	const setIndex = (i: number) => {index = i; (settings.index || {"set": utils.empty_function}).set(i);};
	function main(input: any) {
		return input.reduce((object: any, entry: any, i: number, arr: any[]) => {
			let expression = "";
			if (Array.isArray(entry[0])) {
				const result = main(entry);
				const newData = utils.merge_objects.main({"combineMethod": "object_combine"})({...result}, {...object});
				const returnObject = utils.object.pick(newData, ["ExpressionAttributeNames", "ExpressionAttributeValues"]);

				expression = `(${result[settings.conditionString]})`;
				object = {...object, ...returnObject};
			} else if (entry !== OR) {
				const [key, condition] = entry;
				const {value} = condition;
				const keys = {"name": `#a${index}`, "value": `:v${index}`};
				setIndex(++index);

				object.ExpressionAttributeNames[keys.name] = key;
				const toDynamo: (value: any, settings: {}) => {} = (Document as any).toDynamo;
				object.ExpressionAttributeValues[keys.value] = toDynamo(value, {"type": "value"});

				switch (condition.type) {
				case "EQ":
				case "NE":
					expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
					break;
				case "IN":
					delete object.ExpressionAttributeValues[keys.value];
					expression = `${keys.name} IN (${value.map((_v: any, i: number) => `${keys.value}-${i + 1}`).join(", ")})`;
					value.forEach((valueItem: any, i: number) => {
						object.ExpressionAttributeValues[`${keys.value}-${i + 1}`] = toDynamo(valueItem, {"type": "value"});
					});
					break;
				case "GT":
				case "GE":
				case "LT":
				case "LE":
					expression = `${keys.name} ${condition.type.startsWith("G") ? ">" : "<"}${condition.type.endsWith("E") ? "=" : ""} ${keys.value}`;
					break;
				case "BETWEEN":
					expression = `${keys.name} BETWEEN ${keys.value}-1 AND ${keys.value}-2`;
					object.ExpressionAttributeValues[`${keys.value}-1`] = toDynamo(value[0], {"type": "value"});
					object.ExpressionAttributeValues[`${keys.value}-2`] = toDynamo(value[1], {"type": "value"});
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

			object[settings.conditionString] = `${object[settings.conditionString]}${object[settings.conditionString] !== "" ? ` ${arr[i - 1] === OR ? "OR" : "AND"} ` : ""}${expression}`;

			return object;
		}, {[settings.conditionString]: "", "ExpressionAttributeNames": {}, "ExpressionAttributeValues": {}});
	}
	return main(this.settings.conditions);
};

export = Condition;
