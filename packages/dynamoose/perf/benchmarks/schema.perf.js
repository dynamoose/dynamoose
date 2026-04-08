const {runSuite} = require("../harness");
const dynamoose = require("../../dist");
const ModelStore = require("../../dist/ModelStore").default;

async function run () {
	ModelStore.clear();

	await runSuite("schema", (bench) => {
		bench.add("Schema - simple (3 attributes)", () => {
			new dynamoose.Schema({
				"id": String,
				"name": String,
				"age": Number
			});
		});

		bench.add("Schema - medium (10 attributes, mixed types)", () => {
			new dynamoose.Schema({
				"id": String,
				"name": String,
				"age": Number,
				"email": String,
				"isActive": Boolean,
				"createdAt": Date,
				"tags": {"type": Array, "schema": [String]},
				"score": Number,
				"bio": String,
				"loginCount": Number
			});
		});

		bench.add("Schema - with settings (saveUnknown + timestamps)", () => {
			new dynamoose.Schema(
				{
					"id": String,
					"name": String,
					"age": Number
				},
				{
					"saveUnknown": true,
					"timestamps": true
				}
			);
		});

		bench.add("Schema - nested objects", () => {
			new dynamoose.Schema({
				"id": String,
				"address": {
					"type": Object,
					"schema": {
						"street": String,
						"city": String,
						"state": String,
						"zip": String,
						"country": String
					}
				},
				"metadata": {
					"type": Object,
					"schema": {
						"source": String,
						"version": Number
					}
				}
			});
		});

		bench.add("Schema - complex (20 attributes, nested, arrays, sets)", () => {
			new dynamoose.Schema({
				"id": String,
				"sk": {"type": String, "rangeKey": true},
				"name": {"type": String, "required": true},
				"email": {"type": String, "required": true},
				"age": {"type": Number, "required": true},
				"isActive": {"type": Boolean, "default": true},
				"role": {"type": String, "enum": ["admin", "user", "moderator"]},
				"tags": {"type": Array, "schema": [String]},
				"score": Number,
				"bio": String,
				"loginCount": {"type": Number, "default": 0},
				"lastLogin": Date,
				"preferences": {
					"type": Object,
					"schema": {
						"theme": String,
						"language": String,
						"notifications": Boolean
					}
				},
				"friends": {"type": Array, "schema": [String]},
				"address": {
					"type": Object,
					"schema": {
						"street": String,
						"city": String,
						"state": String,
						"zip": String
					}
				},
				"status": String,
				"rating": Number,
				"notes": String,
				"data": String
			});
		});

		bench.add("Schema - with index definitions", () => {
			new dynamoose.Schema({
				"id": String,
				"email": {
					"type": String,
					"index": {
						"name": "emailIndex",
						"type": "global"
					}
				},
				"age": {
					"type": Number,
					"index": {
						"name": "ageIndex",
						"type": "global"
					}
				},
				"status": String
			});
		});
	});
}

module.exports = run;
