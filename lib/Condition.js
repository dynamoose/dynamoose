const Document = require("./Document");
const Error = require("./Error");
const utils = require("./utils");
const OR = Symbol("OR");

class Condition {
	constructor(object) {
		if (object instanceof Condition) {
			Object.entries(object).forEach((entry) => {
				const [key, value] = entry;
				this[key] = value;
			});
		} else {
			this.settings = {};
			this.settings.conditions = [];
			this.settings.pending = {}; // represents the pending chain of filter data waiting to be attached to the `conditions` parameter. For example, storing the key before we know what the comparison operator is.

			if (typeof object === "object") {
				Object.keys(object).forEach((key) => {
					const value = object[key];
					const valueType = typeof value === "object" && Object.keys(value).length > 0 ? Object.keys(value)[0] : "eq";
					const comparisonType = types.find((item) => item.name === valueType);

					if (!comparisonType) {
						throw new Error.InvalidFilterComparison(`The type: ${valueType} is invalid.`);
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


function finalizePending(instance) {
	const pending = instance.settings.pending;

	if (pending.not === true) {
		if (!pending.type.not) {
			throw new Error.InvalidFilterComparison(`${pending.type.typeName} can not follow not()`);
		}
		pending.type = pending.type.not;
	} else {
		pending.type = pending.type.typeName;
	}

	instance.settings.conditions.push([pending.key, {
		"type": pending.type,
		"value": pending.value
	}]);

	instance.settings.pending = {};
}

Condition.prototype.parenthesis = Condition.prototype.group = function (value) {
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
Condition.prototype.where = Condition.prototype.filter = Condition.prototype.attribute = function(key) {
	this.settings.pending = {key};
	return this;
};
const types = [
	{"name": "eq", "typeName": "EQ", "not": "NE"},
	{"name": "lt", "typeName": "LT", "not": "GE"},
	{"name": "le", "typeName": "LE", "not": "GT"},
	{"name": "gt", "typeName": "GT", "not": "LE"},
	{"name": "ge", "typeName": "GE", "not": "LT"},
	{"name": "beginsWith", "typeName": "BEGINS_WITH"},
	{"name": "contains", "typeName": "CONTAINS", "not": "NOT_CONTAINS"},
	{"name": "exists", "typeName": "EXISTS", "not": "NOT_EXISTS"},
	{"name": "in", "typeName": "IN"},
	{"name": "between", "typeName": "BETWEEN", "multipleArguments": true}
];
types.forEach((type) => {
	Condition.prototype[type.name] = function(value) {
		this.settings.pending.value = type.value || (type.multipleArguments ? [...arguments] : value);
		this.settings.pending.type = type;
		finalizePending(this);
		return this;
	};
});

Condition.prototype.requestObject = function(settings = {"conditionString": "ConditionExpression"}) {
	if (this.settings.conditions.length === 0) {
		return {};
	}

	let index = (settings.index || {}).starting || 0;
	const setIndex = (i) => {index = i; (settings.index || {"set": utils.empty_function}).set(i);};
	function main(input) {
		return input.reduce((object, entry, i, arr) => {
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
				object.ExpressionAttributeValues[keys.value] = Document.toDynamo(value, {"type": "value"});

				switch (condition.type) {
				case "EQ":
				case "NE":
					expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
					break;
				case "IN":
					delete object.ExpressionAttributeValues[keys.value];
					expression = `${keys.name} IN (${value.map((v, i) => `${keys.value}-${i + 1}`).join(", ")})`;
					value.forEach((valueItem, i) => {
						object.ExpressionAttributeValues[`${keys.value}-${i + 1}`] = Document.toDynamo(valueItem, {"type": "value"});
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
					object.ExpressionAttributeValues[`${keys.value}-1`] = Document.toDynamo(value[0], {"type": "value"});
					object.ExpressionAttributeValues[`${keys.value}-2`] = Document.toDynamo(value[1], {"type": "value"});
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

module.exports = Condition;
