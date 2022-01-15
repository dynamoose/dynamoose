const primaryRules = require("../.eslintrc.js");

delete primaryRules.rules["no-console"];

module.exports = primaryRules;
