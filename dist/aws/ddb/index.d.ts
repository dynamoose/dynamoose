import DynamoDB = require("@aws-sdk/client-dynamodb");
declare function main(): DynamoDB.DynamoDB;
declare namespace main {
    var set: (ddb: DynamoDB.DynamoDB) => void;
    var revert: () => void;
    var local: (endpoint?: string) => void;
}
export = main;
