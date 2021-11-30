"use strict";
// import * as AWS from "./sdk";
const DynamoDBUtil = require("@aws-sdk/util-dynamodb");
let customConverter;
const defaultConverter = {
    "marshall": DynamoDBUtil.marshall,
    "unmarshall": DynamoDBUtil.unmarshall,
    "convertToAttr": DynamoDBUtil.convertToAttr,
    "convertToNative": DynamoDBUtil.convertToNative
};
function main() {
    return customConverter || defaultConverter;
}
main.set = (converter) => {
    customConverter = converter;
};
main.revert = () => {
    customConverter = undefined;
};
module.exports = main;
