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
			{"input": "favoritePictures", "output": "BS", "collection": 1},
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
							it(`Should return ${test.output} for ${test.input}`, () => {
								expect(schema.getAttributeType(test.input)).to.eql(test.output);
							});
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
});
