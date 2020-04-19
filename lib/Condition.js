const Document = require("./Document");
const Error = require("./Error");
const utils = require("./utils");
const OR = Symbol("OR");

const isRawConditionObject = (object) => Object.keys(object).length === 3 && ["ExpressionAttributeValues", "ExpressionAttributeNames"].every((item) => Boolean(object[item]) && typeof object[item] === "object");

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
				if (!isRawConditionObject(object)) {
					Object.keys(object).forEach((key) => {
						const value = object[key];
						const valueType = typeof value === "object" && Object.keys(value).length > 0 ? Object.keys(value)[0] : "eq";
						const comparisonType = types.find((item) => item.name === valueType);

						if (!comparisonType) {
							throw new Error.InvalidFilterComparison(`The type: ${valueType} is invalid.`);
						}

						this.settings.conditions.push([key, {"type": comparisonType.typeName, "value": typeof value[valueType] !== "undefined" && value[valueType] !== null ? value[valueType] : value}]);
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
	if (this.settings.raw && utils.object.equals(Object.keys(this.settings.raw).sort(), [settings.conditionString, "ExpressionAttributeValues", "ExpressionAttributeNames"].sort())) {
		return Object.entries(this.settings.raw.ExpressionAttributeValues).reduce((obj, entry) => {
			const [key, value] = entry;
			// TODO: we should fix this so that we can do `isDynamoItem(value)`
			if (!Document.isDynamoObject({"key": value})) {
				obj.ExpressionAttributeValues[key] = Document.toDynamo(value, {"type": "value"});
			}
			return obj;
		}, this.settings.raw);
	} else if (this.settings.conditions.length === 0) {
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
				object.ExpressionAttributeValues[keys.value] = Document.toDynamo(value, {"type": "value"});

				switch (condition.type) {
				case "EQ":
				case "NE":
					expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
					break;
				case "IN":
					delete object.ExpressionAttributeValues[keys.value];
					expression = `${keys.name} IN (${value.map((v, i) => `${keys.value}_${i + 1}`).join(", ")})`;
					value.forEach((valueItem, i) => {
						object.ExpressionAttributeValues[`${keys.value}_${i + 1}`] = Document.toDynamo(valueItem, {"type": "value"});
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
					object.ExpressionAttributeValues[`${keys.value}_1`] = Document.toDynamo(value[0], {"type": "value"});
					object.ExpressionAttributeValues[`${keys.value}_2`] = Document.toDynamo(value[1], {"type": "value"});
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

			const conditionStringNewItems = [expression];
			if (object[settings.conditionString].length > 0) {
				conditionStringNewItems.unshift(` ${arr[i - 1] === OR ? "OR" : "AND"} `);
			}
			conditionStringNewItems.forEach((item) => {
				if (typeof object[settings.conditionString] === "string") {
					object[settings.conditionString] = `${object[settings.conditionString]}${item}`;
				} else {
					object[settings.conditionString].push(item.trim());
				}
			});

			return object;
		}, {[settings.conditionString]: settings.conditionStringType === "array" ? [] : "", "ExpressionAttributeNames": {}, "ExpressionAttributeValues": {}});
	}
	return main(this.settings.conditions);
};

module.exports = Condition;
