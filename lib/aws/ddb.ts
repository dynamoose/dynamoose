import AWS from "./sdk";

let customDDB: AWS.DynamoDB;
function main() {
	return customDDB || new AWS.DynamoDB();
}
main.set = (ddb: AWS.DynamoDB) => customDDB = ddb;
main.revert = () => customDDB = null;
main.local = (endpoint = "http://localhost:8000") => {
	main.set(new AWS.DynamoDB({
		endpoint
	}));
};

export = main;
