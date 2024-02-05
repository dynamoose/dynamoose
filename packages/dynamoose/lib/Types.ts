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

/**
 * Utility type for non-recursively flattening a type into a single type.
 * Useful for increasing readability for public types, especially
 * types that are derived from utility types like `Omit` or `Pick`.
 *
 * @example
 * ```ts
 * type Intersection = {a: string;} & {b: string;} & {c: string;}
 * type Flattened = Flatten<Intersection> // {a: string; b: string; c: string;}
 * ```
 */
export type Flatten<T> = {
	[Key in keyof T]: T[Key]
} & {}; // Trailing `& {}` is what prompts TS to flatten the type. Without it, TS would display `Flatten<InputType>` instead.
