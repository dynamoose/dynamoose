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

	it("Should set correct settings value", () => {
		expect(new Schema({"id": String}, {"saveUnknown": true}).settings).to.eql({"saveUnknown": true});
	});

	it("Should set correct settings value default value of empty object", () => {
		expect(new Schema({"id": String}).settings).to.eql({});
	});

	it("Should throw error if timestamps already exists in schema", () => {
		expect(() => new Schema({"id": String, "createdAt": Date, "updatedAt": Date}, {"timestamps": true}).settings).to.throw("Timestamp attributes must not be defined in schema.");
		expect(() => new Schema({"id": String, "created": Date, "updated": Date}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}).settings).to.throw("Timestamp attributes must not be defined in schema.");
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
			{"input": "favoritePictures", "output": "BS", "collection": 1},
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
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": []
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
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": []
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
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": []
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
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": []
				}
			},
			{
				"name": "Should return correct result with index as true",
				"input": {"id": String, "age": {"type": Number, "index": true}},
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
						}
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": [
						{
							"IndexName": "ageLocalIndex",
							"Projection": {
								"ProjectionType": "ALL"
							},
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
					]
				}
			},
			{
				"name": "Should return correct result with global index as object with just name",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex"}}},
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
						}
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"Projection": {
								"ProjectionType": "ALL"
							},
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
					]
				}
			},
			{
				"name": "Should return correct result with global index as object",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "global": true, "rangeKey": "id", "project": true, "throughput": 5}}},
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
						}
					],
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"KeySchema": [
								{
									"AttributeName": "age",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "id",
									"KeyType": "RANGE"
								}
							],
							"ProvisionedThroughput": {
								"ReadCapacityUnits": "5",
								"WriteCapacityUnits": "5"
							},
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					],
					"LocalSecondaryIndexes": []
				}
			},
			{
				"name": "Should return correct result with index and project as null",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "global": true, "project": null}}},
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
						}
					],
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"KeySchema": [
								{
									"AttributeName": "id",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "age",
									"KeyType": "RANGE"
								}
							],
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					],
					"LocalSecondaryIndexes": []
				}
			},
			{
				"name": "Should return correct result with index and project as false",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "global": true, "project": false}}},
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
						}
					],
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"KeySchema": [
								{
									"AttributeName": "id",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "age",
									"KeyType": "RANGE"
								}
							],
							"Projection": {
								"ProjectionType": "KEYS_ONLY"
							}
						}
					],
					"LocalSecondaryIndexes": []
				}
			},
			{
				"name": "Should return correct result with index and project as array",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "global": true, "project": ["name"]}, "name": String, "address": String}},
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
						}
					],
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"KeySchema": [
								{
									"AttributeName": "id",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "age",
									"KeyType": "RANGE"
								}
							],
							"Projection": {
								"NonKeyAttributes": ["name"],
								"ProjectionType": "INCLUDE"
							}
						}
					],
					"LocalSecondaryIndexes": []
				}
			},
			{
				"name": "Should return correct result with index and no name as local index",
				"input": {"id": String, "age": {"type": Number, "index": {"name": ""}}},
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
						}
					],
					"GlobalSecondaryIndexes": [],
					"LocalSecondaryIndexes": [
						{
							"IndexName": "ageLocalIndex",
							"KeySchema": [
								{
									"AttributeName": "id",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "age",
									"KeyType": "RANGE"
								}
							],
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					]
				}
			},
			{
				"name": "Should return correct result with index and no name as global index",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "", "global": true}}},
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
						}
					],
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageGlobalIndex",
							"KeySchema": [
								{
									"AttributeName": "id",
									"KeyType": "HASH"
								},
								{
									"AttributeName": "age",
									"KeyType": "RANGE"
								}
							],
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					],
					"LocalSecondaryIndexes": []
				}
			}
		];

		tests.forEach((test) => {
			it(test.name, async () => {
				expect(await (new Schema(test.input).getCreateTableAttributeParams())).to.eql(test.output);
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
			},
			{
				"name": "Should return correct result with object type",
				"input": {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}},
				"output": ["id", "address", "address.street", "address.country"]
			},
			{
				"name": "Should return correct result with object type and no schema",
				"input": {"id": Number, "address": Object},
				"output": ["id", "address"]
			}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(new Schema(test.input).attributes()).to.eql(test.output);
			});
		});
	});

	describe("getSettingValue", () => {
		const tests = [
			{"name": "Should return correct value as array for settings", "settings": {"saveUnknown": ["name"]}, "input": "saveUnknown", "output": ["name"]},
			{"name": "Should return correct value as boolean for settings", "settings": {"saveUnknown": true}, "input": "saveUnknown", "output": true},
			{"name": "Should return undefined if key doesn't exist in settings", "settings": {"saveUnknown": true}, "input": "random", "output": undefined}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(new Schema({"id": String}, test.settings).getSettingValue(test.input)).to.eql(test.output);
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
			},
			// Required
			{
				"name": "Should return undefined if no object as value for attribute",
				"input": ["required", "id"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return undefined if no required setting for attribute",
				"input": ["required", "id"],
				"schema": {"id": {"type": String}},
				"output": undefined
			},
			{
				"name": "Should return undefined for attribute that doesn't exist",
				"input": ["required", "random"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return required as true for attribute being required",
				"input": ["required", "id"],
				"schema": {"id": {"type": String, "required": true}},
				"output": true
			},
			{
				"name": "Should return required as false for attribute being not required",
				"input": ["required", "id"],
				"schema": {"id": {"type": String, "required": false}},
				"output": false
			},
			// Enum
			{
				"name": "Should return undefined if no object as value for attribute",
				"input": ["enum", "id"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return undefined if no enum setting for attribute",
				"input": ["enum", "id"],
				"schema": {"id": {"type": String}},
				"output": undefined
			},
			{
				"name": "Should return undefined for attribute that doesn't exist",
				"input": ["enum", "random"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return enum array for attribute having enum",
				"input": ["enum", "id"],
				"schema": {"id": {"type": String, "enum": ["Tim", "Tom"]}},
				"output": ["Tim", "Tom"]
			},
			// forceDefault
			{
				"name": "Should return undefined if no object as value for attribute",
				"input": ["forceDefault", "id"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return undefined if no forceDefault setting for attribute",
				"input": ["forceDefault", "id"],
				"schema": {"id": {"type": String}},
				"output": undefined
			},
			{
				"name": "Should return undefined for attribute that doesn't exist",
				"input": ["forceDefault", "random"],
				"schema": {"id": String},
				"output": undefined
			},
			{
				"name": "Should return forceDefault as true for attribute with forceDefault set to true",
				"input": ["forceDefault", "id"],
				"schema": {"id": {"type": String, "forceDefault": true}},
				"output": true
			},
			{
				"name": "Should return forceDefault as false for attribute with forceDefault set to false",
				"input": ["forceDefault", "id"],
				"schema": {"id": {"type": String, "forceDefault": false}},
				"output": false
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
