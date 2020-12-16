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

const shouldSucceedWithDynamooseThis = new dynamoose.Schema({
	"id": String,
	"name": String,
	"parent": dynamoose.THIS
});

// Nested Schema
const shouldSucceedWithNestedSchema = new dynamoose.Schema({
	"id": String,
	"data": new dynamoose.Schema({
		"name": String
	})
});

// Array of types
const shouldSucceedWithArrayOfTypes = new dynamoose.Schema({
	"id": String,
	"data": [String, Number]
});
const shouldSucceedWithArrayOfTypesInObject = new dynamoose.Schema({
	"id": String,
	"data": {
		"type": [String, Number]
	}
});
const shouldSucceedWithArrayOfTypesInNestedSchema = new dynamoose.Schema({
	"id": String,
	"data": {
		"type": Array,
		"schema": [
			{
				"type": [String, Number]
			}
		]
	}
});
