/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";

// @ts-expect-error
const shouldFailWithNothingPassedIn = new dynamoose.Schema();
const shouldSucceedWithObjectPassedIn = new dynamoose.Schema({"id": "String"});
const shouldSucceedWithTypeConstructorPassedIn = new dynamoose.Schema({"id": String});

const shouldSucceedWithNestedSchemaAsConstructor = new dynamoose.Schema({
	"data": {
		"type": Array,
		"schema": [String]
	}
});
const shouldSucceedWithNestedSchemaAsObject = new dynamoose.Schema({
	"data": {
		"type": Array,
		"schema": [
			{
				"type": String
			}
		]
	}
});
const shouldSucceedWithMultipleNestedSchemas = new dynamoose.Schema({
	"friends": {
		"type": Array,
		"schema": [
			{
				"type": Object,
				"schema": {
					"zip": Number,
					"country": String
				}
			}
		]
	}
});
const shouldSucceedWithStringSet = new dynamoose.Schema({
	"data": {
		"type": Set,
		"schema": [String]
	}
});
