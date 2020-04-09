import AWS from "./sdk";

let customDDB: AWS.DynamoDB;
function main(): AWS.DynamoDB {
	return customDDB || new AWS.DynamoDB();
}
main.set = (ddb: AWS.DynamoDB): void => {customDDB = ddb;};
main.revert = (): void => customDDB = null;
main.local = (endpoint = "http://localhost:8000"): void => {
	main.set(new AWS.DynamoDB({
		endpoint
	}));
};

export = main;
