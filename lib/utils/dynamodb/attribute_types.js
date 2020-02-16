const attribute_types = require("../attribute_types");
module.exports = attribute_types.map((type) => type.dynamodbType);
