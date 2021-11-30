"use strict";
const DynamoDB = require("@aws-sdk/client-dynamodb");
let customDDB;
function main() {
    return customDDB || new DynamoDB.DynamoDB({});
}
main.set = (ddb) => {
    customDDB = ddb;
};
main.revert = () => {
    customDDB = undefined;
};
main.local = (endpoint = "http://localhost:8000") => {
    main.set(new DynamoDB.DynamoDB({
        endpoint
    }));
};
module.exports = main;
