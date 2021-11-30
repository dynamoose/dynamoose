"use strict";
const ddb = require("./index");
const utils = require("../../utils");
async function main(method, params) {
    utils.log({ "level": "debug", "category": `aws:dynamodb:${method}:request`, "message": JSON.stringify(params, null, 4), "payload": { "request": params } });
    const result = await ddb()[method](params);
    utils.log({ "level": "debug", "category": `aws:dynamodb:${method}:response`, "message": typeof result === "undefined" ? "undefined" : JSON.stringify(result, null, 4), "payload": { "response": result } });
    return result;
}
module.exports = main;
