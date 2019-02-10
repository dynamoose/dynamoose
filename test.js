const AWS = require('aws-sdk');

console.log(AWS.DynamoDB.Converter.output({'NS': [1,2,3]}));
console.log(new Set([1,2,3]));
console.log(AWS.DynamoDB.Converter.input([1,2,3]));
