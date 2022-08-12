import * as DynamoDB from "@aws-sdk/client-dynamodb";

export interface DDBInterface {
	(): DynamoDB.DynamoDB;
	DynamoDB: typeof DynamoDB.DynamoDB;
	set: (ddb: DynamoDB.DynamoDB) => void;
	revert: () => void;
	local: (endpoint?: string) => void;
}

export default function (): DDBInterface {
	let customDDB: DynamoDB.DynamoDB = new DynamoDB.DynamoDB({});

	const func = (): DynamoDB.DynamoDB => customDDB;
	func.DynamoDB = DynamoDB.DynamoDB;
	func.set = (ddb: DynamoDB.DynamoDB): void => {
		customDDB = ddb;
	};
	func.revert = () => {
		customDDB = new DynamoDB.DynamoDB({});
	};
	func.local = (endpoint = "http://localhost:8000"): void => {
		func.set(new DynamoDB.DynamoDB({
			endpoint
		}));
	};
	return func;
}
