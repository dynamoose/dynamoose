"use strict";
const Model_1 = require("./Model");
const Schema_1 = require("./Schema");
const Condition_1 = require("./Condition");
const Transaction_1 = require("./Transaction");
const aws = require("./aws");
const Internal = require("./Internal");
const utils = require("./utils");
const ModelStore = require("./ModelStore");
const dynamoose_utils_1 = require("dynamoose-utils");
const model = (name, schema, options = {}) => {
    let model;
    let storedSchema;
    if (name) {
        storedSchema = ModelStore(name);
    }
    // TODO: this is something I'd like to do. But is a breaking change. Need to enable this and uncomment it in a breaking release. Also will need to fix the tests as well.
    /* if (schema && storedSchema) {
        throw new CustomError.InvalidParameter(`Model with name ${name} has already been registered.`);
    } else */
    if (!schema && storedSchema) {
        model = storedSchema;
    }
    else {
        model = new Model_1.Model(name, schema, options, ModelStore);
    }
    const returnObject = model.Item;
    const keys = utils.array_flatten([
        Object.keys(model),
        Object.keys(Object.getPrototypeOf(model)),
        Object.getOwnPropertyNames(Object.getPrototypeOf(model))
    ]).filter((key) => !["constructor", "name"].includes(key));
    keys.forEach((key) => {
        if (typeof model[key] === "object") {
            const main = (key) => {
                utils.object.set(returnObject, key, {});
                const value = utils.object.get(model, key);
                if (value === null || value.constructor !== Object && value.constructor !== Array) {
                    utils.object.set(returnObject, key, value);
                }
                else {
                    Object.keys(value).forEach((subKey) => {
                        const newKey = `${key}.${subKey}`;
                        const subValue = utils.object.get(model, newKey);
                        if (typeof subValue === "object") {
                            main(newKey);
                        }
                        else {
                            utils.object.set(returnObject, newKey, subValue.bind(model));
                        }
                    });
                }
            };
            main(key);
        }
        else {
            returnObject[key] = model[key].bind(model);
        }
    });
    return returnObject;
};
model.defaults = Object.assign({}, require("./Model/defaults").custom);
module.exports = {
    model,
    Schema: Schema_1.Schema,
    Condition: Condition_1.Condition,
    transaction: Transaction_1.default,
    aws,
    "logger": async () => {
        try {
            return await utils.importPackage("dynamoose-logger");
        }
        catch (error) {
            throw new dynamoose_utils_1.CustomError.OtherError("dynamoose-logger has not been installed. Install it using `npm i --save-dev dynamoose-logger`.");
        }
    },
    "UNDEFINED": Internal.Public.undefined,
    "THIS": Internal.Public.this,
    "NULL": Internal.Public.null
};
