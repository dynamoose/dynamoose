import DynamoDB = require("@aws-sdk/client-dynamodb");

let customDDB: DynamoDB.DynamoDB | undefined;
function main (): DynamoDB.DynamoDB {
	return customDDB || new DynamoDB.DynamoDB({});
}
main.set = (ddb: DynamoDB.DynamoDB): void => {
	customDDB = ddb;
};
main.revert = (): void => {
	customDDB = undefined;
};
main.local = (endpoint = "http://localhost:8000"): void => {
	main.set(new DynamoDB.DynamoDB({
		endpoint
	}));
};

export = main;
