// This file is not currently in use, but here for future development

const AWS = require('aws-sdk');

module.exports = (item) => AWS.DynamoDB.Converter.output(item);
