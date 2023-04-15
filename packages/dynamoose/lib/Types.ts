import * as DynamoDB from "@aws-sdk/client-dynamodb";

export type AttributeMap = {
	[key: string]: DynamoDB.AttributeValue;
};

export type ExpressionAttributeNameMap = {
	[key: string]: string;
};
export type ExpressionAttributeValueMap = {
	[key: string]: DynamoDB.AttributeValue;
};

///// --- https://github.com/aws/aws-sdk-js-v3/issues/2125 ---
// some @aws-sdk clients references these DOM lib interfaces,
// so we need them to exist to compile without having DOM.
declare global {
	/* eslint-disable @typescript-eslint/no-empty-interface */
	interface Blob {}
	interface File {}
	/* eslint-enable @typescript-eslint/no-empty-interface */
}

///// --- https://github.com/aws/aws-sdk-js-v3/issues/3807 ---
declare global {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface ReadableStream {}
}

export type AnySimpleValue = string | number | symbol;
export type AnySimpleObject = Record<string, AnySimpleValue>;

export type ArrayItemsMerger = <T extends AnySimpleObject = AnySimpleObject>(target: T[], source: T[]) => T[];
