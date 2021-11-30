"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = exports.Scan = void 0;
const ddb = require("./aws/ddb/internal");
const CustomError = require("./Error");
const utils = require("./utils");
const Condition_1 = require("./Condition");
const Item_1 = require("./Item");
const General_1 = require("./General");
const Populate_1 = require("./Populate");
const Internal = require("./Internal");
const { internalProperties } = Internal.General;
var ItemRetrieverTypes;
(function (ItemRetrieverTypes) {
    ItemRetrieverTypes["scan"] = "scan";
    ItemRetrieverTypes["query"] = "query";
})(ItemRetrieverTypes || (ItemRetrieverTypes = {}));
// ItemRetriever is used for both Scan and Query since a lot of the code is shared between the two
// type ItemRetriever = BasicOperators;
class ItemRetriever {
    constructor(model, typeInformation, object) {
        this.internalSettings = { model, typeInformation };
        let condition;
        try {
            condition = new Condition_1.Condition(object);
        }
        catch (e) {
            e.message = `${e.message.replace(" is invalid.", "")} is invalid for the ${this.internalSettings.typeInformation.type} operation.`;
            throw e;
        }
        this.settings = {
            "condition": condition
        };
    }
    exec(callback) {
        let timesRequested = 0;
        const prepareForReturn = async (result) => {
            if (Array.isArray(result)) {
                result = utils.merge_objects(...result);
            }
            if (this.settings.count) {
                return {
                    "count": result.Count,
                    [`${this.internalSettings.typeInformation.pastTense}Count`]: result[`${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}Count`]
                };
            }
            const array = (await Promise.all(result.Items.map(async (item) => await new this.internalSettings.model.Item(item, { "type": "fromDynamo" }).conformToSchema({ "customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo" })))).filter((a) => Boolean(a));
            array.lastKey = result.LastEvaluatedKey ? Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => this.internalSettings.model.Item.fromDynamo(key)) : this.internalSettings.model.Item.fromDynamo(result.LastEvaluatedKey) : undefined;
            array.count = result.Count;
            array[`${this.internalSettings.typeInformation.pastTense}Count`] = result[`${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}Count`];
            array[`times${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}`] = timesRequested;
            array["populate"] = Populate_1.PopulateItems;
            array["toJSON"] = utils.dynamoose.itemToJSON;
            return array;
        };
        const promise = this.internalSettings.model[internalProperties].pendingTaskPromise().then(() => this.getRequest()).then((request) => {
            const allRequest = (extraParameters = {}) => {
                let promise = ddb(this.internalSettings.typeInformation.type, Object.assign(Object.assign({}, request), extraParameters));
                timesRequested++;
                if (this.settings.all) {
                    promise = promise.then(async (result) => {
                        if (this.settings.all.delay && this.settings.all.delay > 0) {
                            await utils.timeout(this.settings.all.delay);
                        }
                        let lastKey = result.LastEvaluatedKey;
                        let requestedTimes = 1;
                        while (lastKey && (this.settings.all.max === 0 || requestedTimes < this.settings.all.max)) {
                            if (this.settings.all.delay && this.settings.all.delay > 0) {
                                await utils.timeout(this.settings.all.delay);
                            }
                            const nextRequest = await ddb(this.internalSettings.typeInformation.type, Object.assign(Object.assign(Object.assign({}, request), extraParameters), { "ExclusiveStartKey": lastKey }));
                            timesRequested++;
                            result = utils.merge_objects(result, nextRequest);
                            // The operation below is safe because right above we are overwriting the entire `result` variable, so there is no chance it'll be reassigned based on an outdated value since it's already been overwritten. There might be a better way to do this than ignoring the rule on the line below.
                            result.LastEvaluatedKey = nextRequest.LastEvaluatedKey; // eslint-disable-line require-atomic-updates
                            lastKey = nextRequest.LastEvaluatedKey;
                            requestedTimes++;
                        }
                        return result;
                    });
                }
                return promise;
            };
            if (this.settings.parallel) {
                return Promise.all(new Array(this.settings.parallel).fill(0).map((a, index) => allRequest({ "Segment": index })));
            }
            else {
                return allRequest();
            }
        });
        // TODO: we do something similar to do this below in other functions as well (ex. get, save), where we allow a callback or a promise, we should figure out a way to make this code more DRY and have a standard way of doing this throughout Dynamoose
        if (callback) {
            promise.then((result) => prepareForReturn(result)).then((result) => callback(null, result)).catch((error) => callback(error));
        }
        else {
            return (async () => {
                const result = await promise;
                const finalResult = await prepareForReturn(result);
                return finalResult;
            })();
        }
    }
}
Object.entries(Condition_1.Condition.prototype).forEach((prototype) => {
    const [key, func] = prototype;
    if (key !== "requestObject") {
        ItemRetriever.prototype[key] = function (...args) {
            func.bind(this.settings.condition)(...args);
            return this;
        };
    }
});
ItemRetriever.prototype.getRequest = async function () {
    const object = Object.assign(Object.assign({}, this.settings.condition.requestObject({ "conditionString": "FilterExpression", "conditionStringType": "array" })), { "TableName": this.internalSettings.model[internalProperties].name });
    if (this.settings.limit) {
        object.Limit = this.settings.limit;
    }
    if (this.settings.startAt) {
        object.ExclusiveStartKey = Item_1.Item.isDynamoObject(this.settings.startAt) ? this.settings.startAt : this.internalSettings.model.Item.objectToDynamo(this.settings.startAt);
    }
    const indexes = await this.internalSettings.model[internalProperties].getIndexes();
    if (this.settings.index) {
        object.IndexName = this.settings.index;
    }
    else if (this.internalSettings.typeInformation.type === "query") {
        const comparisonChart = this.settings.condition[internalProperties].settings.conditions.reduce((res, item) => {
            const myItem = Object.entries(item)[0];
            res[myItem[0]] = { "type": myItem[1].type };
            return res;
        }, {});
        const indexSpec = utils.find_best_index(indexes, comparisonChart);
        if (!indexSpec.tableIndex) {
            if (!indexSpec.indexName) {
                throw new CustomError.InvalidParameter("Index can't be found for query.");
            }
            object.IndexName = indexSpec.indexName;
        }
    }
    function moveParameterNames(val, prefix) {
        const entry = Object.entries(object.ExpressionAttributeNames).find((entry) => entry[1] === val);
        if (!entry) {
            return;
        }
        const [key, value] = entry;
        const filterExpressionIndex = object.FilterExpression.findIndex((item) => item.includes(key));
        const filterExpression = object.FilterExpression[filterExpressionIndex];
        if (filterExpression.includes("attribute_exists") || filterExpression.includes("contains")) {
            return;
        }
        object.ExpressionAttributeNames[`#${prefix}a`] = value;
        delete object.ExpressionAttributeNames[key];
        const valueKey = key.replace("#a", ":v");
        Object.keys(object.ExpressionAttributeValues).filter((key) => key.startsWith(valueKey)).forEach((key) => {
            object.ExpressionAttributeValues[key.replace(new RegExp(":v\\d"), `:${prefix}v`)] = object.ExpressionAttributeValues[key];
            delete object.ExpressionAttributeValues[key];
        });
        const newExpression = filterExpression.replace(key, `#${prefix}a`).replace(new RegExp(valueKey, "g"), `:${prefix}v`);
        object.KeyConditionExpression = `${object.KeyConditionExpression || ""}${object.KeyConditionExpression ? " AND " : ""}${newExpression}`;
        utils.object.delete(object.FilterExpression, filterExpressionIndex);
        const previousElementIndex = filterExpressionIndex === 0 ? 0 : filterExpressionIndex - 1;
        if (object.FilterExpression[previousElementIndex] === "AND") {
            utils.object.delete(object.FilterExpression, previousElementIndex);
        }
    }
    if (this.internalSettings.typeInformation.type === "query") {
        const index = utils.array_flatten(Object.values(indexes)).find((index) => index.IndexName === object.IndexName) || indexes.TableIndex;
        const { hash, range } = index.KeySchema.reduce((res, item) => {
            res[item.KeyType.toLowerCase()] = item.AttributeName;
            return res;
        }, {});
        moveParameterNames(hash, "qh");
        if (range) {
            moveParameterNames(range, "qr");
        }
    }
    if (this.settings.consistent) {
        object.ConsistentRead = this.settings.consistent;
    }
    if (this.settings.count) {
        object.Select = "COUNT";
    }
    if (this.settings.parallel) {
        object.TotalSegments = this.settings.parallel;
    }
    if (this.settings.sort === General_1.SortOrder.descending) {
        object.ScanIndexForward = false;
    }
    if (this.settings.attributes) {
        if (!object.ExpressionAttributeNames) {
            object.ExpressionAttributeNames = {};
        }
        object.ProjectionExpression = this.settings.attributes.map((attribute) => {
            let expressionAttributeName = "";
            expressionAttributeName = (Object.entries(object.ExpressionAttributeNames).find((entry) => entry[1] === attribute) || [])[0];
            if (!expressionAttributeName) {
                const nextIndex = (Object.keys(object.ExpressionAttributeNames).map((item) => parseInt(item.replace("#a", ""))).filter((item) => !isNaN(item)).reduce((existing, item) => Math.max(item, existing), 0) || 0) + 1;
                expressionAttributeName = `#a${nextIndex}`;
                object.ExpressionAttributeNames[expressionAttributeName] = attribute;
            }
            return expressionAttributeName;
        }).sort().join(", ");
    }
    if (object.FilterExpression) {
        object.FilterExpression = utils.dynamoose.convertConditionArrayRequestObjectToString(object.FilterExpression);
    }
    if (object.FilterExpression === "") {
        delete object.FilterExpression;
    }
    return object;
};
const settings = [
    "limit",
    "startAt",
    "attributes",
    { "name": "count", "boolean": true },
    { "name": "consistent", "boolean": true },
    { "name": "using", "settingsName": "index" }
];
settings.forEach((item) => {
    ItemRetriever.prototype[item.name || item] = function (value) {
        const key = item.settingsName || item.name || item;
        this.settings[key] = item.boolean ? !this.settings[key] : value;
        return this;
    };
});
ItemRetriever.prototype.all = function (delay = 0, max = 0) {
    this.settings.all = { delay, max };
    return this;
};
class Scan extends ItemRetriever {
    exec(callback) {
        return super.exec(callback);
    }
    parallel(value) {
        this.settings.parallel = value;
        return this;
    }
    constructor(model, object) {
        super(model, { "type": ItemRetrieverTypes.scan, "pastTense": "scanned" }, object);
    }
}
exports.Scan = Scan;
class Query extends ItemRetriever {
    exec(callback) {
        return super.exec(callback);
    }
    sort(order) {
        this.settings.sort = order;
        return this;
    }
    constructor(model, object) {
        super(model, { "type": ItemRetrieverTypes.query, "pastTense": "queried" }, object);
    }
}
exports.Query = Query;
