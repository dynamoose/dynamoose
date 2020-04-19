import AWS from "../sdk";

let customDDB: AWS.DynamoDB | undefined;
function main(): AWS.DynamoDB {
	return customDDB || new AWS.DynamoDB();
}
main.set = (ddb: AWS.DynamoDB): void => {customDDB = ddb;};
main.revert = (): void => {customDDB = undefined;};
main.local = (endpoint = "http://localhost:8000"): void => {
	main.set(new AWS.DynamoDB({
		endpoint
	}));
};

export = main;
