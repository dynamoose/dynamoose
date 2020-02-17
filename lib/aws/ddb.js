let customDDB;

function main() {
	const aws = require("./index");
	return customDDB || new aws.sdk.DynamoDB();
}
main.set = (ddb) => customDDB = ddb;
main.revert = () => customDDB = null;
main.local = (endpoint = "http://localhost:8000") => {
	const aws = require("./index");
	main.set(new aws.sdk.DynamoDB({
		endpoint
	}));
};

module.exports = main;
