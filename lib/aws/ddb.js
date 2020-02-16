let customDDB;

function main() {
	const aws = require("./index");
	return customDDB || new aws.sdk.DynamoDB();
}
main.set = (ddb) => customDDB = ddb;
main.revert = () => customDDB = null;

module.exports = main;
