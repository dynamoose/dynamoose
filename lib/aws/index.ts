const AWS = require("aws-sdk");
const ddb = require("./ddb");
const converter = require("./converter");

module.exports = {
	"sdk": AWS,
	ddb,
	converter
};
