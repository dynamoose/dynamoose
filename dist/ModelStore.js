"use strict";
const CustomError = require("./Error");
const Model_1 = require("./Model");
const Internal = require("./Internal");
const { internalProperties } = Internal.General;
let aliases = {};
let models = {};
const returnObject = (input) => {
    if (input instanceof Model_1.Model) {
        models[input[internalProperties].originalName] = input;
        aliases[input[internalProperties].name] = input[internalProperties].originalName;
        return input;
    }
    else if (typeof input === "string") {
        const alias = aliases[input];
        const result = models[input] || models[alias];
        return result;
    }
    else {
        throw new CustomError.InvalidParameter("You must pass in a Model or table name as a string.");
    }
};
returnObject.clear = () => {
    models = {};
    aliases = {};
};
module.exports = returnObject;
