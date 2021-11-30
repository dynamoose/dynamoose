"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Condition = void 0;
const Item_1 = require("./Item");
const CustomError = require("./Error");
const utils = require("./utils");
const OR = Symbol("OR");
const Internal = require("./Internal");
const { internalProperties } = Internal.General;
const isRawConditionObject = (object) => Object.keys(object).length === 3 && ["ExpressionAttributeValues", "ExpressionAttributeNames"].every((item) => Boolean(object[item]) && typeof object[item] === "object");
var ConditionComparisonComparatorName;
(function (ConditionComparisonComparatorName) {
    ConditionComparisonComparatorName["equals"] = "eq";
    ConditionComparisonComparatorName["lessThan"] = "lt";
    ConditionComparisonComparatorName["lessThanEquals"] = "le";
    ConditionComparisonComparatorName["greaterThan"] = "gt";
    ConditionComparisonComparatorName["greaterThanEquals"] = "ge";
    ConditionComparisonComparatorName["beginsWith"] = "beginsWith";
    ConditionComparisonComparatorName["contains"] = "contains";
    ConditionComparisonComparatorName["exists"] = "exists";
    ConditionComparisonComparatorName["in"] = "in";
    ConditionComparisonComparatorName["between"] = "between";
})(ConditionComparisonComparatorName || (ConditionComparisonComparatorName = {}));
var ConditionComparisonComparatorDynamoName;
(function (ConditionComparisonComparatorDynamoName) {
    ConditionComparisonComparatorDynamoName["equals"] = "EQ";
    ConditionComparisonComparatorDynamoName["notEquals"] = "NE";
    ConditionComparisonComparatorDynamoName["lessThan"] = "LT";
    ConditionComparisonComparatorDynamoName["lessThanEquals"] = "LE";
    ConditionComparisonComparatorDynamoName["greaterThan"] = "GT";
    ConditionComparisonComparatorDynamoName["greaterThanEquals"] = "GE";
    ConditionComparisonComparatorDynamoName["beginsWith"] = "BEGINS_WITH";
    ConditionComparisonComparatorDynamoName["contains"] = "CONTAINS";
    ConditionComparisonComparatorDynamoName["notContains"] = "NOT_CONTAINS";
    ConditionComparisonComparatorDynamoName["exists"] = "EXISTS";
    ConditionComparisonComparatorDynamoName["notExists"] = "NOT_EXISTS";
    ConditionComparisonComparatorDynamoName["in"] = "IN";
    ConditionComparisonComparatorDynamoName["between"] = "BETWEEN";
})(ConditionComparisonComparatorDynamoName || (ConditionComparisonComparatorDynamoName = {}));
const types = [
    { "name": ConditionComparisonComparatorName.equals, "typeName": ConditionComparisonComparatorDynamoName.equals, "not": ConditionComparisonComparatorDynamoName.notEquals },
    { "name": ConditionComparisonComparatorName.lessThan, "typeName": ConditionComparisonComparatorDynamoName.lessThan, "not": ConditionComparisonComparatorDynamoName.greaterThanEquals },
    { "name": ConditionComparisonComparatorName.lessThanEquals, "typeName": ConditionComparisonComparatorDynamoName.lessThanEquals, "not": ConditionComparisonComparatorDynamoName.greaterThan },
    { "name": ConditionComparisonComparatorName.greaterThan, "typeName": ConditionComparisonComparatorDynamoName.greaterThan, "not": ConditionComparisonComparatorDynamoName.lessThanEquals },
    { "name": ConditionComparisonComparatorName.greaterThanEquals, "typeName": ConditionComparisonComparatorDynamoName.greaterThanEquals, "not": ConditionComparisonComparatorDynamoName.lessThan },
    { "name": ConditionComparisonComparatorName.beginsWith, "typeName": ConditionComparisonComparatorDynamoName.beginsWith },
    { "name": ConditionComparisonComparatorName.contains, "typeName": ConditionComparisonComparatorDynamoName.contains, "not": ConditionComparisonComparatorDynamoName.notContains },
    { "name": ConditionComparisonComparatorName.exists, "typeName": ConditionComparisonComparatorDynamoName.exists, "not": ConditionComparisonComparatorDynamoName.notExists },
    { "name": ConditionComparisonComparatorName.in, "typeName": ConditionComparisonComparatorDynamoName.in },
    { "name": ConditionComparisonComparatorName.between, "typeName": ConditionComparisonComparatorDynamoName.between, "multipleArguments": true }
];
class Condition {
    constructor(object) {
        Object.defineProperty(this, internalProperties, {
            "configurable": false,
            "value": {}
        });
        if (object instanceof Condition) {
            this[internalProperties].settings = object[internalProperties].settings;
        }
        else {
            this[internalProperties].settings = {
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
                        this[internalProperties].settings.conditions.push({
                            [key]: {
                                "type": comparisonType.typeName,
                                "value": typeof value[valueType] !== "undefined" && value[valueType] !== null ? value[valueType] : value
                            }
                        });
                    });
                }
            }
            else if (object) {
                this[internalProperties].settings.pending.key = object;
            }
        }
        this[internalProperties].settings.raw = object;
        return this;
    }
}
exports.Condition = Condition;
function finalizePending(instance) {
    const pending = instance[internalProperties].settings.pending;
    let dynamoNameType;
    if (pending.not === true) {
        if (!pending.type.not) {
            throw new CustomError.InvalidFilterComparison(`${pending.type.typeName} can not follow not()`);
        }
        dynamoNameType = pending.type.not;
    }
    else {
        dynamoNameType = pending.type.typeName;
    }
    instance[internalProperties].settings.conditions.push({
        [pending.key]: {
            "type": dynamoNameType,
            "value": pending.value
        }
    });
    instance[internalProperties].settings.pending = {};
}
Condition.prototype.parenthesis = Condition.prototype.group = function (value) {
    value = typeof value === "function" ? value(new Condition()) : value;
    this[internalProperties].settings.conditions.push(value[internalProperties].settings.conditions);
    return this;
};
Condition.prototype.or = function () {
    this[internalProperties].settings.conditions.push(OR);
    return this;
};
Condition.prototype.and = function () {
    return this;
};
Condition.prototype.not = function () {
    this[internalProperties].settings.pending.not = !this[internalProperties].settings.pending.not;
    return this;
};
Condition.prototype.where = Condition.prototype.filter = Condition.prototype.attribute = function (key) {
    this[internalProperties].settings.pending = { key };
    return this;
};
// TODO: I don't think this prototypes are being exposed which is gonna cause a lot of problems with our type definition file. Need to figure out a better way to do this since they aren't defined and are dynamic.
types.forEach((type) => {
    Condition.prototype[type.name] = function (...args) {
        if (args.includes(undefined)) {
            console.warn(`Dynamoose Warning: Passing \`undefined\` into a condition ${type.name} is not supported and can lead to behavior where DynamoDB returns an error related to your conditional. In a future version of Dynamoose this behavior will throw an error. If you believe your conditional is valid and you received this message in error, please submit an issue at https://github.com/dynamoose/dynamoose/issues/new/choose.`);
        }
        this[internalProperties].settings.pending.value = type.multipleArguments ? args : args[0];
        this[internalProperties].settings.pending.type = type;
        finalizePending(this);
        return this;
    };
});
Condition.prototype.requestObject = function (settings = { "conditionString": "ConditionExpression", "conditionStringType": "string" }) {
    if (this[internalProperties].settings.raw && utils.object.equals(Object.keys(this[internalProperties].settings.raw).sort(), [settings.conditionString, "ExpressionAttributeValues", "ExpressionAttributeNames"].sort())) {
        return Object.entries(this[internalProperties].settings.raw.ExpressionAttributeValues).reduce((obj, entry) => {
            const [key, value] = entry;
            // TODO: we should fix this so that we can do `isDynamoItem(value)`
            if (!Item_1.Item.isDynamoObject({ "key": value })) {
                obj.ExpressionAttributeValues[key] = Item_1.Item.objectToDynamo(value, { "type": "value" });
            }
            return obj;
        }, this[internalProperties].settings.raw);
    }
    else if (this[internalProperties].settings.conditions.length === 0) {
        return {};
    }
    let index = (settings.index || {}).start || 0;
    const setIndex = (i) => {
        index = i;
        (settings.index || { "set": utils.empty_function }).set(i);
    };
    function main(input) {
        return input.reduce((object, entry, i, arr) => {
            let expression = "";
            if (Array.isArray(entry)) {
                const result = main(entry);
                const newData = utils.merge_objects.main({ "combineMethod": "object_combine" })(Object.assign({}, result), Object.assign({}, object));
                const returnObject = utils.object.pick(newData, ["ExpressionAttributeNames", "ExpressionAttributeValues"]);
                expression = settings.conditionStringType === "array" ? result[settings.conditionString] : `(${result[settings.conditionString]})`;
                object = Object.assign(Object.assign({}, object), returnObject);
            }
            else if (entry !== OR) {
                const [key, condition] = Object.entries(entry)[0];
                const { value } = condition;
                const keys = { "name": `#a${index}`, "value": `:v${index}` };
                setIndex(++index);
                const keyParts = key.split(".");
                if (keyParts.length === 1) {
                    object.ExpressionAttributeNames[keys.name] = key;
                }
                else {
                    keys.name = keyParts.reduce((finalName, part, index) => {
                        const name = `${keys.name}_${index}`;
                        object.ExpressionAttributeNames[name] = part;
                        finalName.push(name);
                        return finalName;
                    }, []).join(".");
                }
                const toDynamo = (value) => {
                    return Item_1.Item.objectToDynamo(value, { "type": "value" });
                };
                object.ExpressionAttributeValues[keys.value] = toDynamo(value);
                switch (condition.type) {
                    case "EQ":
                    case "NE":
                        expression = `${keys.name} ${condition.type === "EQ" ? "=" : "<>"} ${keys.value}`;
                        break;
                    case "IN":
                        delete object.ExpressionAttributeValues[keys.value];
                        expression = `${keys.name} IN (${value.map((_v, i) => `${keys.value}_${i + 1}`).join(", ")})`;
                        value.forEach((valueItem, i) => {
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
            }
            else {
                return object;
            }
            const conditionStringNewItems = [expression];
            if (object[settings.conditionString].length > 0) {
                conditionStringNewItems.unshift(` ${arr[i - 1] === OR ? "OR" : "AND"} `);
            }
            conditionStringNewItems.forEach((item) => {
                if (typeof object[settings.conditionString] === "string") {
                    object[settings.conditionString] = `${object[settings.conditionString]}${item}`;
                }
                else {
                    object[settings.conditionString].push(Array.isArray(item) ? item : item.trim());
                }
            });
            return object;
        }, { [settings.conditionString]: settings.conditionStringType === "array" ? [] : "", "ExpressionAttributeNames": {}, "ExpressionAttributeValues": {} });
    }
    return utils.object.clearEmpties(main(this[internalProperties].settings.conditions));
};
