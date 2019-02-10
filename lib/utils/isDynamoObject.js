// This file is not currently in use, but here for future development

const AWS = require('aws-sdk');

/**
 * This function returns true if the input is a DynamoDB object, otherwise returns false.
 * @inner
 * @param {(object|function|number|boolean|string|array)} item - The item you want to check to see if is a DynamoDB Object
 * @returns {boolean} If item passed in is a DynamoDB object or not
 */
module.exports = (item) => AWS.DynamoDB.Converter.output(item);
