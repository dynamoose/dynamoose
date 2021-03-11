import DynamoDB = require("@aws-sdk/client-dynamodb");

export type AttributeMap = {
	[key: string]: DynamoDB.AttributeValue;
};

export type ExpressionAttributeNameMap = {
	[key: string]: string;
};
export type ExpressionAttributeValueMap = {
	[key: string]: DynamoDB.AttributeValue;
};
