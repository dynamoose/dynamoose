const AWS = require("aws-sdk");

module.exports = (item) => {
  if (AWS.DynamoDB.Converter.output(item)) {
    return true;
  }

  return false;
};
