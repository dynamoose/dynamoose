const {expect} = require("chai");
const Schema = require("../lib/Schema");

describe("Schema", () => {
	it("Should be a function", () => {
		expect(Schema).to.be.a("function");
	});

	it("Should throw an error if nothing passed in", () => {
		expect(() => new Schema()).to.throw();
	});

	it("Should throw an error if empty object passed in", () => {
		expect(() => new Schema({})).to.throw();
	});

	it("Shouldn't throw an error if object passed in", () => {
		expect(() => new Schema({"id": String})).to.not.throw();
	});

	describe("getAttributeType", () => {
		const schemas = [
			{
				"name": "JS Types",
				"collection": 1,
				"schema": {
					"id": String,
					"name": String,
					"age": Number,
					"happy": Boolean,
					"birthday": Date,
					"metadata": Object,
					"friends": Array,
					"picture": Buffer,
					"favoriteFoods": [String],
					"favoriteNumbers": [Number],
					"favoriteDates": [Date],
					"favoritePictures": [Buffer],
					"favoriteTypes": [Boolean],
					"favoriteObjects": [Object],
					"favoriteFriends": [Array],
					"emptyItem": Symbol,
					"emptyItems": [Symbol]
				}
			},
			{
				"name": "String Types",
				"collection": 2,
				"schema": {
					"id": "String",
					"name": "string",
					"age": "NUMBER",
					"happy": "boolean",
					"birthday": "DaTe",
					"metadata": "objECT",
					"friends": "ARRay",
					"picture": "buffer"
				}
			},
		];
		const tests = [
			{"input": undefined, "output": undefined},
			{"input": null, "output": undefined},
			{"input": "random", "output": undefined},
			{"input": "id", "output": "S"},
			{"input": "name", "output": "S"},
			{"input": "age", "output": "N"},
			{"input": "happy", "output": "BOOL"},
			{"input": "birthday", "output": "N"},
			{"input": "metadata", "output": "M"},
			{"input": "friends", "output": "L"},
			{"input": "picture", "output": "B"},
			{"input": "favoriteFoods", "output": "SS", "collection": 1},
			{"input": "favoriteNumbers", "output": "NS", "collection": 1},
			{"input": "favoriteDates", "output": "NS", "collection": 1},
			{"input": "favoritePictures", "output": null, "collection": 1},
			{"input": "favoriteTypes", "output": null, "collection": 1},
			{"input": "favoriteObjects", "output": null, "collection": 1},
			{"input": "favoriteFriends", "output": null, "collection": 1},
			{"input": "emptyItem", "output": null, "collection": 1},
			{"input": "emptyItems", "output": null, "collection": 1}
		];
		schemas.forEach((schemaObj) => {
			["standard", "objectTypes"].forEach((type) => {
				describe(`${schemaObj.name}${type === "objectTypes" ? " - Object Type" : ""}`, () => {
					let schema;
					beforeEach(() => {
						if (type === "standard") {
							schema = new Schema({...schemaObj.schema});
						} else {
							const schemaObject = {...schemaObj.schema};
							Object.keys(schemaObject).forEach((key) => {
								schemaObject[key] = {"type": schemaObject[key]};
							});
							schema = new Schema(schemaObject);
						}
					});

					tests.forEach((test) => {
						if (!test.collection || test.collection === schemaObj.collection) {
							if (!test.output) {
								it(`Should throw error for ${test.input}`, () => {
									expect(() => schema.getAttributeType(test.input)).to.throw();
								});
							} else {
								it(`Should return ${test.output} for ${test.input}`, () => {
									expect(schema.getAttributeType(test.input)).to.eql(test.output);
								});
							}
						}
					});
				});
			});
		});
	});

	describe("getHashKey", () => {
		it("Should return first attribute if no hash key defined", () => {
			expect(new Schema({"id": String, "age": Number}).getHashKey()).to.eql("id");
		});

		it("Should return hash key if set to true", () => {
			expect(new Schema({"id": String, "age": {"type": Number, "hashKey": true}}).getHashKey()).to.eql("age");
		});
	});

	describe("getRangeKey", () => {
		it("Should return undefined if no range key defined", () => {
			expect(new Schema({"id": String, "age": Number}).getRangeKey()).to.eql(undefined);
		});

		it("Should return range key if set to true", () => {
			expect(new Schema({"id": String, "age": {"type": Number, "rangeKey": true}}).getRangeKey()).to.eql("age");
		});
	});

	describe("getCreateTableAttributeParams", () => {
		const tests = [
			{
				"name": "Should return correct result with one attribute",
				"input": {"id": String},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "id",
							"AttributeType": "S"
						}
					],
					"KeySchema": [
						{
							"AttributeName": "id",
							"KeyType": "HASH"
						}
					]
				}
			},
			{
				"name": "Should return correct result with custom hash key",
				"input": {"id": String, "age": {"type": Number, "hashKey": true}},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "age",
							"AttributeType": "N"
						}
					],
					"KeySchema": [
						{
							"AttributeName": "age",
							"KeyType": "HASH"
						}
					]
				}
			},
			{
				"name": "Should return correct result with custom range key",
				"input": {"id": String, "age": {"type": Number, "rangeKey": true}},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "id",
							"AttributeType": "S"
						},
						{
							"AttributeName": "age",
							"AttributeType": "N"
						}
					],
					"KeySchema": [
						{
							"AttributeName": "id",
							"KeyType": "HASH"
						},
						{
							"AttributeName": "age",
							"KeyType": "RANGE"
						}
					]
				}
			},
			{
				"name": "Should return correct result with custom range key and hash key",
				"input": {"id": {"type": String, "rangeKey": true}, "age": {"type": Number, "hashKey": true}},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "age",
							"AttributeType": "N"
						},
						{
							"AttributeName": "id",
							"AttributeType": "S"
						}
					],
					"KeySchema": [
						{
							"AttributeName": "age",
							"KeyType": "HASH"
						},
						{
							"AttributeName": "id",
							"KeyType": "RANGE"
						}
					]
				}
			}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(new Schema(test.input).getCreateTableAttributeParams()).to.eql(test.output);
			});
		});
	});

	describe("attributes", () => {
		const tests = [
			{
				"name": "Should return correct result with one attribute",
				"input": {"id": String},
				"output": ["id"]
			},
			{
				"name": "Should return correct result with one attribute and object as value",
				"input": {"id": {"type": String}},
				"output": ["id"]
			},
			{
				"name": "Should return correct result with multiple attributes",
				"input": {"id": String, "age": Number},
				"output": ["id", "age"]
			},
			{
				"name": "Should return correct result with multiple attributes and object as values",
				"input": {"id": {"type": String}, "age": {"type": Number}},
				"output": ["id", "age"]
			}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(new Schema(test.input).attributes()).to.eql(test.output);
			});
		});
	});

	describe("getAttributeSettingValue", () => {
		const tests = [
			// Defaults
			{
				"name": "Should return undefined if no object as value for attribute",
				"input": ["default", "id"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return undefined if no default for attribute",
				"input": ["default", "id"],
				"schema": {"id": {"type": String}},
				"output": undefined
			},
			{
				"name": "Should return undefined for attribute that doesn't exist",
				"input": ["default", "random"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return default as string for attribute",
				"input": ["default", "id"],
				"schema": {"id": {"type": String, "default": "Hello World"}},
				"output": "Hello World"
			},
			{
				"name": "Should return default as string for attribute if default is a function",
				"input": ["default", "id"],
				"schema": {"id": {"type": String, "default": () => "Hello World"}},
				"output": "Hello World"
			},
			{
				"name": "Should return default as string for attribute if default is an async function",
				"input": ["default", "id"],
				"schema": {"id": {"type": String, "default": async () => "Hello World"}},
				"output": "Hello World"
			},
			{
				"name": "Should return default as string for attribute if default is a function that returns a promise",
				"input": ["default", "id"],
				"schema": {"id": {"type": String, "default": () => {
					return new Promise((resolve) => setTimeout(() => resolve("Hello World"), 100));
				}}},
				"output": "Hello World"
			},
			// Validator
			{
				"name": "Should return undefined if no object as value for attribute",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return undefined if no validator for attribute",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": {"type": String}},
				"output": undefined
			},
			{
				"name": "Should return undefined for attribute that doesn't exist",
				"input": ["validate", "random", {"returnFunction": true}],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return validator as string for attribute",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": {"type": String, "validate": "Hello World"}},
				"output": "Hello World"
			},
			{
				"name": "Should return validator as function for attribute if validator is a function",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": {"type": String, "validate": () => "Hello World"}},
				"output": () => "Hello World"
			},
			{
				"name": "Should return validator as function for attribute if validator is an async function",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": {"type": String, "validate": async () => "Hello World"}},
				"output": async () => "Hello World"
			},
			{
				"name": "Should return validator as function for attribute if validator is a function that returns a promise",
				"input": ["validate", "id", {"returnFunction": true}],
				"schema": {"id": {"type": String, "validate": () => new Promise((resolve) => setTimeout(() => resolve("Hello World"), 100))}},
				"output": () => new Promise((resolve) => setTimeout(() => resolve("Hello World"), 100))
			}
		];

		tests.forEach((test) => {
			it(test.name, async () => {
				const schema = new Schema(test.schema);
				const output = await (schema.getAttributeSettingValue(...test.input));
				if (typeof output !== "function") {
					expect(output).to.eql(test.output);
				} else {
					expect(typeof output).to.eql(typeof test.output);
					expect(output.toString()).to.eql(test.output.toString());
					expect(await output()).to.eql(await test.output());
				}
			});
		});
	});
});
