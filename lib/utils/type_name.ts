import {DynamoDBSetTypeResult, DynamoDBTypeResult} from "../Schema";

// This function takes in a value and returns a user string for the type of that value. This function is mostly used to display type errors to users.
export default (value: any, typeDetailsArray: (DynamoDBTypeResult | DynamoDBSetTypeResult)[]): string => {
	let str = "";
	if (value === null) {
		str += "null";
	} else {
		str += typeof value;
	}

	// Add constant value to type name
	str += typeDetailsArray.some((val) => val.name === "Constant") ? ` (${value})` : "";

	return str;
};
