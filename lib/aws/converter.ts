let customConverter;

function main() {
	const aws = require("./index");
	return customConverter || aws.sdk.DynamoDB.Converter;
}
main.set = (converter) => customConverter = converter;
main.revert = () => customConverter = null;

module.exports = main;
