"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnyItem = exports.Item = void 0;
const aws = require("./aws");
const ddb = require("./aws/ddb/internal");
const utils = require("./utils");
const Error = require("./Error");
const Internal = require("./Internal");
const { internalProperties } = Internal.General;
const dynamooseUndefined = Internal.Public.undefined;
const Populate_1 = require("./Populate");
// Item represents an item in a Model that is either pending (not saved) or saved
class Item {
    constructor(model, object, settings) {
        const itemObject = Item.isDynamoObject(object) ? aws.converter().unmarshall(object) : object;
        Object.keys(itemObject).forEach((key) => this[key] = itemObject[key]);
        Object.defineProperty(this, internalProperties, {
            "configurable": false,
            "value": {}
        });
        this[internalProperties].originalObject = JSON.parse(JSON.stringify(itemObject));
        this[internalProperties].originalSettings = Object.assign({}, settings);
        Object.defineProperty(this, "model", {
            "configurable": false,
            "value": model
        });
        if (settings.type === "fromDynamo") {
            this[internalProperties].storedInDynamo = true;
        }
    }
    static objectToDynamo(object, settings = { "type": "object" }) {
        if (object === undefined) {
            return undefined;
        }
        const options = settings.type === "value" ? undefined : { "removeUndefinedValues": true };
        return (settings.type === "value" ? aws.converter().convertToAttr : aws.converter().marshall)(object, options);
    }
    static fromDynamo(object) {
        return aws.converter().unmarshall(object);
    }
    // This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
    static isDynamoObject(object, recurrsive) {
        function isValid(value) {
            if (typeof value === "undefined" || value === null) {
                return false;
            }
            const keys = Object.keys(value);
            const key = keys[0];
            const nestedResult = typeof value[key] === "object" && !(value[key] instanceof Buffer) ? Array.isArray(value[key]) ? value[key].every((value) => Item.isDynamoObject(value, true)) : Item.isDynamoObject(value[key]) : true;
            const { Schema } = require("./Schema");
            const attributeType = Schema.attributeTypes.findDynamoDBType(key);
            return typeof value === "object" && keys.length === 1 && attributeType && (nestedResult || Object.keys(value[key]).length === 0 || attributeType.isSet);
        }
        const keys = Object.keys(object);
        const values = Object.values(object);
        if (keys.length === 0) {
            return null;
        }
        else {
            return recurrsive ? isValid(object) : values.every((value) => isValid(value));
        }
    }
    // This function handles actions that should take place before every response (get, scan, query, batchGet, etc.)
    async prepareForResponse() {
        if (this.model[internalProperties].options.populate) {
            return this.populate({ "properties": this.model[internalProperties].options.populate });
        }
        return this;
    }
    // Original
    original() {
        return this[internalProperties].originalSettings.type === "fromDynamo" ? this[internalProperties].originalObject : null;
    }
    // toJSON
    toJSON() {
        return utils.dynamoose.itemToJSON.bind(this)();
    }
    // Serializer
    serialize(nameOrOptions) {
        return this.model.serializer._serialize(this, nameOrOptions);
    }
    delete(callback) {
        const hashKey = this.model[internalProperties].getHashKey();
        const rangeKey = this.model[internalProperties].getRangeKey();
        const key = { [hashKey]: this[hashKey] };
        if (rangeKey) {
            key[rangeKey] = this[rangeKey];
        }
        return this.model.delete(key, callback);
    }
    save(settings, callback) {
        if (typeof settings !== "object" && typeof settings !== "undefined") {
            callback = settings;
            settings = {};
        }
        if (typeof settings === "undefined") {
            settings = {};
        }
        let savedItem;
        const localSettings = settings;
        const paramsPromise = this.toDynamo({ "defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "combine": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"] }).then((item) => {
            savedItem = item;
            let putItemObj = {
                "Item": item,
                "TableName": this.model[internalProperties].name
            };
            if (localSettings.condition) {
                putItemObj = Object.assign(Object.assign({}, putItemObj), localSettings.condition.requestObject());
            }
            if (localSettings.overwrite === false) {
                const conditionExpression = "attribute_not_exists(#__hash_key)";
                putItemObj.ConditionExpression = putItemObj.ConditionExpression ? `(${putItemObj.ConditionExpression}) AND (${conditionExpression})` : conditionExpression;
                putItemObj.ExpressionAttributeNames = Object.assign(Object.assign({}, putItemObj.ExpressionAttributeNames || {}), { "#__hash_key": this.model[internalProperties].getHashKey() });
            }
            return putItemObj;
        });
        if (settings.return === "request") {
            if (callback) {
                const localCallback = callback;
                paramsPromise.then((result) => localCallback(null, result));
                return;
            }
            else {
                return paramsPromise;
            }
        }
        const promise = Promise.all([paramsPromise, this.model[internalProperties].pendingTaskPromise()]).then((promises) => {
            const [putItemObj] = promises;
            return ddb("putItem", putItemObj);
        });
        if (callback) {
            const localCallback = callback;
            promise.then(() => {
                this[internalProperties].storedInDynamo = true;
                const returnItem = new this.model.Item(savedItem);
                returnItem[internalProperties].storedInDynamo = true;
                localCallback(null, returnItem);
            }).catch((error) => callback(error));
        }
        else {
            return (async () => {
                await promise;
                this[internalProperties].storedInDynamo = true;
                const returnItem = new this.model.Item(savedItem);
                returnItem[internalProperties].storedInDynamo = true;
                return returnItem;
            })();
        }
    }
    populate(...args) {
        return Populate_1.PopulateItem.bind(this)(...args);
    }
}
exports.Item = Item;
class AnyItem extends Item {
}
exports.AnyItem = AnyItem;
// This function will mutate the object passed in to run any actions to conform to the schema that cannot be achieved through non mutating methods in Item.objectFromSchema (setting timestamps, etc.)
Item.prepareForObjectFromSchema = async function (object, model, settings) {
    if (settings.updateTimestamps) {
        const schema = await model[internalProperties].schemaForObject(object);
        if (schema[internalProperties].settings.timestamps && settings.type === "toDynamo") {
            const date = new Date();
            const createdAtProperties = (Array.isArray(schema[internalProperties].settings.timestamps.createdAt) ? schema[internalProperties].settings.timestamps.createdAt : [schema[internalProperties].settings.timestamps.createdAt]).filter((a) => Boolean(a));
            const updatedAtProperties = (Array.isArray(schema[internalProperties].settings.timestamps.updatedAt) ? schema[internalProperties].settings.timestamps.updatedAt : [schema[internalProperties].settings.timestamps.updatedAt]).filter((a) => Boolean(a));
            if (object[internalProperties] && !object[internalProperties].storedInDynamo && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.createdAt)) {
                createdAtProperties.forEach((prop) => {
                    utils.object.set(object, prop, date);
                });
            }
            if (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.updatedAt) {
                updatedAtProperties.forEach((prop) => {
                    utils.object.set(object, prop, date);
                });
            }
        }
    }
    return object;
};
// This function will return a list of attributes combining both the schema attributes with the item attributes. This also takes into account all attributes that could exist (ex. properties in sets that don't exist in item), adding the indexes for each item in the item set.
// https://stackoverflow.com/a/59928314/894067
Item.attributesWithSchema = async function (item, model) {
    const schema = await model[internalProperties].schemaForObject(item);
    const attributes = schema.attributes();
    // build a tree out of schema attributes
    const root = {};
    attributes.forEach((attribute) => {
        let node = root;
        attribute.split(".").forEach((part) => {
            node[part] = node[part] || {};
            node = node[part];
        });
    });
    // explore the tree
    function traverse(node, treeNode, outPath, callback) {
        callback(outPath);
        if (Object.keys(treeNode).length === 0) { // a leaf
            return;
        }
        Object.keys(treeNode).forEach((attr) => {
            if (attr === "0") {
                // We check for empty objects here (added `typeof node === "object" && Object.keys(node).length == 0`, see PR https://github.com/dynamoose/dynamoose/pull/1034) to handle the use case of 2d arrays, or arrays within arrays. `node` in that case will be an empty object.
                if (!node || node.length == 0 || typeof node === "object" && Object.keys(node).length == 0) {
                    node = [{}]; // fake the path for arrays
                }
                node.forEach((a, index) => {
                    outPath.push(index);
                    traverse(node[index], treeNode[attr], outPath, callback);
                    outPath.pop();
                });
            }
            else {
                if (!node) {
                    node = {}; // fake the path for properties
                }
                outPath.push(attr);
                traverse(node[attr], treeNode[attr], outPath, callback);
                outPath.pop();
            }
        });
    }
    const out = [];
    traverse(item, root, [], (val) => out.push(val.join(".")));
    const result = out.slice(1);
    return result;
};
// This function will return an object that conforms to the schema (removing any properties that don't exist, using default values, etc.) & throws an error if there is a typemismatch.
Item.objectFromSchema = async function (object, model, settings = { "type": "toDynamo" }) {
    if (settings.checkExpiredItem && model[internalProperties].options.expires && (model[internalProperties].options.expires.items || {}).returnExpired === false && object[model[internalProperties].options.expires.attribute] && object[model[internalProperties].options.expires.attribute] * 1000 < Date.now()) {
        return undefined;
    }
    const returnObject = Object.assign({}, object);
    const schema = settings.schema || await model[internalProperties].schemaForObject(returnObject);
    const schemaAttributes = schema.attributes(returnObject);
    // Type check
    const validParents = []; // This array is used to allow for set contents to not be type checked
    const keysToDelete = [];
    const typeIndexOptionMap = schema.getTypePaths(returnObject, settings);
    const checkTypeFunction = (item) => {
        const [key, value] = item;
        if (validParents.find((parent) => key.startsWith(parent.key) && (parent.infinite || key.split(".").length === parent.key.split(".").length + 1))) {
            return;
        }
        const genericKey = key.replace(/\.\d+/gu, ".0"); // This is a key replacing all list numbers with 0 to standardize things like checking if it exists in the schema
        const existsInSchema = schemaAttributes.includes(genericKey);
        if (existsInSchema) {
            const { isValidType, matchedTypeDetails, typeDetailsArray } = utils.dynamoose.getValueTypeCheckResult(schema, value, genericKey, settings, { "standardKey": true, typeIndexOptionMap });
            if (!isValidType) {
                throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetailsArray.map((detail) => detail.dynamicName ? detail.dynamicName() : detail.name.toLowerCase()).join(", ")}, instead found type ${utils.type_name(value, typeDetailsArray)}.`);
            }
            else if (matchedTypeDetails.isSet || matchedTypeDetails.name.toLowerCase() === "model") {
                validParents.push({ key, "infinite": true });
            }
            else if ( /*typeDetails.dynamodbType === "M" || */matchedTypeDetails.dynamodbType === "L") {
                // The code below is an optimization for large array types to speed up the process of not having to check the type for every element but only the ones that are different
                value.forEach((subValue, index, array) => {
                    if (index === 0 || typeof subValue !== typeof array[0]) {
                        checkTypeFunction([`${key}.${index}`, subValue]);
                    }
                    else if (keysToDelete.includes(`${key}.0`) && typeof subValue === typeof array[0]) {
                        keysToDelete.push(`${key}.${index}`);
                    }
                });
                validParents.push({ key });
            }
        }
        else {
            // Check saveUnknown
            if (!settings.saveUnknown || !utils.dynamoose.wildcard_allowed_check(schema.getSettingValue("saveUnknown"), key)) {
                keysToDelete.push(key);
            }
        }
    };
    utils.object.entries(returnObject).filter((item) => item[1] !== undefined && item[1] !== dynamooseUndefined).map(checkTypeFunction);
    keysToDelete.reverse().forEach((key) => utils.object.delete(returnObject, key));
    if (settings.defaults || settings.forceDefault) {
        await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
            const value = utils.object.get(returnObject, key);
            if (value === dynamooseUndefined) {
                utils.object.set(returnObject, key, undefined);
            }
            else {
                const defaultValue = await schema.defaultCheck(key, value, settings);
                const isDefaultValueUndefined = Array.isArray(defaultValue) ? defaultValue.some((defaultValue) => typeof defaultValue === "undefined" || defaultValue === null) : typeof defaultValue === "undefined" || defaultValue === null;
                if (!isDefaultValueUndefined) {
                    const { isValidType, typeDetailsArray } = utils.dynamoose.getValueTypeCheckResult(schema, defaultValue, key, settings, { typeIndexOptionMap });
                    if (!isValidType) {
                        throw new Error.TypeMismatch(`Expected ${key} to be of type ${typeDetailsArray.map((detail) => detail.dynamicName ? detail.dynamicName() : detail.name.toLowerCase()).join(", ")}, instead found type ${typeof defaultValue}.`);
                    }
                    else {
                        utils.object.set(returnObject, key, defaultValue);
                    }
                }
            }
        }));
    }
    // Custom Types
    if (settings.customTypesDynamo) {
        (await Item.attributesWithSchema(returnObject, model)).map((key) => {
            const value = utils.object.get(returnObject, key);
            const isValueUndefined = typeof value === "undefined" || value === null;
            if (!isValueUndefined) {
                const typeDetails = utils.dynamoose.getValueTypeCheckResult(schema, value, key, settings, { typeIndexOptionMap }).matchedTypeDetails;
                const { customType } = typeDetails;
                const { "type": typeInfo } = typeDetails.isOfType(value);
                const isCorrectTypeAlready = typeInfo === (settings.type === "toDynamo" ? "underlying" : "main");
                if (customType && customType.functions[settings.type] && !isCorrectTypeAlready) {
                    const customValue = customType.functions[settings.type](value);
                    utils.object.set(returnObject, key, customValue);
                }
            }
        });
    }
    // DynamoDB Type Handler (ex. converting sets to correct value for toDynamo & fromDynamo)
    utils.object.entries(returnObject).filter((item) => typeof item[1] === "object").forEach((item) => {
        const [key, value] = item;
        let typeDetails;
        try {
            typeDetails = utils.dynamoose.getValueTypeCheckResult(schema, value, key, settings, { typeIndexOptionMap }).matchedTypeDetails;
        }
        catch (e) {
            const { Schema } = require("./Schema");
            typeDetails = Schema.attributeTypes.findTypeForValue(value, settings.type, settings);
        }
        if (typeDetails && typeDetails[settings.type]) {
            utils.object.set(returnObject, key, typeDetails[settings.type](value));
        }
    });
    if (settings.combine) {
        schemaAttributes.map((key) => {
            try {
                const typeDetails = schema.getAttributeTypeDetails(key);
                return {
                    key,
                    "type": typeDetails
                };
            }
            catch (e) { } // eslint-disable-line no-empty
        }).filter((item) => {
            return Array.isArray(item.type) ? item.type.some((type) => type.name === "Combine") : item.type.name === "Combine";
        }).map((obj) => {
            if (obj && Array.isArray(obj.type)) {
                throw new Error.InvalidParameter("Combine type is not allowed to be used with multiple types.");
            }
            return obj;
        }).forEach((item) => {
            const { key, type } = item;
            const value = type.typeSettings.attributes.map((attribute) => utils.object.get(returnObject, attribute)).filter((value) => typeof value !== "undefined" && value !== null).join(type.typeSettings.seperator);
            utils.object.set(returnObject, key, value);
        });
    }
    if (settings.modifiers) {
        await Promise.all(settings.modifiers.map(async (modifier) => {
            return Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
                const value = utils.object.get(returnObject, key);
                const modifierFunction = await schema.getAttributeSettingValue(modifier, key, { "returnFunction": true, typeIndexOptionMap });
                const modifierFunctionExists = Array.isArray(modifierFunction) ? modifierFunction.some((val) => Boolean(val)) : Boolean(modifierFunction);
                const isValueUndefined = typeof value === "undefined" || value === null;
                if (modifierFunctionExists && !isValueUndefined) {
                    const oldValue = object.original ? utils.object.get(object.original(), key) : undefined;
                    utils.object.set(returnObject, key, await modifierFunction(value, oldValue));
                }
            }));
        }));
    }
    if (settings.validate) {
        await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
            const value = utils.object.get(returnObject, key);
            const isValueUndefined = typeof value === "undefined" || value === null;
            if (!isValueUndefined) {
                const validator = await schema.getAttributeSettingValue("validate", key, { "returnFunction": true, typeIndexOptionMap });
                if (validator) {
                    let result;
                    if (validator instanceof RegExp) {
                        // TODO: fix the line below to not use `as`. This will cause a weird issue even in vanilla JS, where if your validator is a Regular Expression but the type isn't a string, it will throw a super random error.
                        result = validator.test(value);
                    }
                    else {
                        result = typeof validator === "function" ? await validator(value) : validator === value;
                    }
                    if (!result) {
                        throw new Error.ValidationError(`${key} with a value of ${value} had a validation error when trying to save the item`);
                    }
                }
            }
        }));
    }
    if (settings.required) {
        let attributesToCheck = await Item.attributesWithSchema(returnObject, model);
        if (settings.required === "nested") {
            attributesToCheck = attributesToCheck.filter((attribute) => utils.object.keys(returnObject).find((key) => attribute === key || attribute.startsWith(key + ".")));
        }
        await Promise.all(attributesToCheck.map(async (key) => {
            const check = async () => {
                const value = utils.object.get(returnObject, key);
                await schema.requiredCheck(key, value);
            };
            const keyParts = key.split(".");
            const parentKey = keyParts.slice(0, -1).join(".");
            if (parentKey) {
                const parentValue = utils.object.get(returnObject, parentKey);
                const isParentValueUndefined = typeof parentValue === "undefined" || parentValue === null;
                if (!isParentValueUndefined) {
                    await check();
                }
            }
            else {
                await check();
            }
        }));
    }
    if (settings.enum) {
        await Promise.all((await Item.attributesWithSchema(returnObject, model)).map(async (key) => {
            const value = utils.object.get(returnObject, key);
            const isValueUndefined = typeof value === "undefined" || value === null;
            if (!isValueUndefined) {
                const enumArray = await schema.getAttributeSettingValue("enum", key, { "returnFunction": false, typeIndexOptionMap });
                if (enumArray && !enumArray.includes(value)) {
                    throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
                }
            }
        }));
    }
    return returnObject;
};
Item.prototype.toDynamo = async function (settings = {}) {
    const newSettings = Object.assign(Object.assign({}, settings), { "type": "toDynamo" });
    await Item.prepareForObjectFromSchema(this, this.model, newSettings);
    const object = await Item.objectFromSchema(this, this.model, newSettings);
    return Item.objectToDynamo(object);
};
// This function will modify the item to conform to the Schema
Item.prototype.conformToSchema = async function (settings = { "type": "fromDynamo" }) {
    let item = this;
    if (settings.type === "fromDynamo") {
        item = await this.prepareForResponse();
    }
    await Item.prepareForObjectFromSchema(item, item.model, settings);
    const expectedObject = await Item.objectFromSchema(item, item.model, settings);
    if (!expectedObject) {
        return expectedObject;
    }
    const expectedKeys = Object.keys(expectedObject);
    Object.keys(item).forEach((key) => {
        if (!expectedKeys.includes(key)) {
            delete this[key];
        }
        else if (this[key] !== expectedObject[key]) {
            this[key] = expectedObject[key];
        }
    });
    return this;
};
