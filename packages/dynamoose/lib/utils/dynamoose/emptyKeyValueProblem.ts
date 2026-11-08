import * as DynamoDB from "@aws-sdk/client-dynamodb";

/**
 * Describes why DynamoDB would reject an attribute value used for a key attribute (of the table or of an index): there is no value, the value is NULL, or it is an empty string or binary value.
 * @param value The value, in DynamoDB's format (`{"S": "abc"}`).
 * @returns The problem, worded to follow an attribute name (`has no value (it is null)`), or `undefined` when DynamoDB accepts the value.
 */
export default function emptyKeyValueProblem (value: DynamoDB.AttributeValue | undefined): string | undefined {
	if (value === undefined || value === null) {
		return "has no value (it is undefined)";
	}
	const {S, B, NULL} = value as {S?: string; B?: Uint8Array; NULL?: boolean};
	if (NULL) {
		return "has no value (it is null)";
	}
	if (S === "" || B instanceof Uint8Array && B.length === 0) {
		return "has an empty value";
	}
}
