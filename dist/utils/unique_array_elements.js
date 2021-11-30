"use strict";
const obj = require("js-object-utilities");
module.exports = (array) => array.filter((value, index, self) => self.findIndex((searchVal) => obj.equals(searchVal, value)) === index);
