const dynamoose = require("../dist");
const Error = require("../dist/Error");
const Internal = require("../dist/Internal").default;
const {internalProperties} = Internal.General;
const utils = require("../dist/utils").default;

describe("Schema", () => {
	it("Should be a function", () => {
		expect(dynamoose.Schema).toBeInstanceOf(Function);
	});

	it("Should throw an error if not using `new` keyword", () => {
		expect(() => dynamoose.Schema()).toThrow("Class constructor Schema cannot be invoked without 'new'");
	});

	it("Should throw an error if nothing passed in", () => {
		expect(() => new dynamoose.Schema()).toThrow("Schema initialization parameter must be an object.");
	});

	it("Should throw an error if empty object passed in", () => {
		expect(() => new dynamoose.Schema({})).toThrow("Schema initialization parameter must not be an empty object.");
	});

	it("Should throw an error if invalid random type passed in", () => {
		expect(() => new dynamoose.Schema({"id": "random"})).toThrow("Attribute id does not have a valid type.");
	});

	it("Should throw an error if any type passed in", () => {
		expect(() => new dynamoose.Schema({"id": "any"})).toThrow("Attribute id does not have a valid type.");
	});

	it("Should throw an error if null type passed in", () => {
		expect(() => new dynamoose.Schema({"id": "null"})).toThrow("Attribute id does not have a valid type.");
	});

	it("Should throw an error if ANY type passed in", () => {
		expect(() => new dynamoose.Schema({"id": "ANY"})).toThrow("Attribute id does not have a valid type.");
	});

	it("Should throw an error if NULL type passed in", () => {
		expect(() => new dynamoose.Schema({"id": "NULL"})).toThrow("Attribute id does not have a valid type.");
	});

	it("Shouldn't throw an error if object passed in", () => {
		expect(() => new dynamoose.Schema({"id": String})).not.toThrow();
	});

	it("Should set correct settings value", () => {
		expect(new dynamoose.Schema({"id": String}, {"saveUnknown": true}).getInternalProperties(internalProperties).settings).toEqual({"saveUnknown": true});
	});

	it("Should set correct settings value default value of empty object", () => {
		expect(new dynamoose.Schema({"id": String}).getInternalProperties(internalProperties).settings).toEqual({});
	});

	it("Should throw error if timestamps already exists in schema", () => {
		expect(() => new dynamoose.Schema({"id": String, "createdAt": Date, "updatedAt": Date}, {"timestamps": true}).getInternalProperties(internalProperties).settings).toThrow("Timestamp attributes must not be defined in schema.");
		expect(() => new dynamoose.Schema({"id": String, "created": Date, "updated": Date}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}).getInternalProperties(internalProperties).settings).toThrow("Timestamp attributes must not be defined in schema.");
		expect(() => new dynamoose.Schema({"id": String, "a1": Date, "b1": Date}, {"timestamps": {"createdAt": ["created", "a1"], "updatedAt": ["updated", "b1"]}}).getInternalProperties(internalProperties).settings).toThrow("Timestamp attributes must not be defined in schema.");
		expect(() => new dynamoose.Schema({"id": String, "a1": Date, "b1": Date}, {"timestamps": {"createdAt": {"a1": Date}, "updatedAt": {"b1": Date}}}).getInternalProperties(internalProperties).settings).toThrow("Timestamp attributes must not be defined in schema.");
	});

	it("Should throw error if passing multiple schema elements into array", () => {
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [String, Number]}})).toThrow("You must only pass one element into schema array.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("You must only pass one element into schema array.");
	});

	it("Should not throw error if passing only one element into schema elements array", () => {
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [String]}})).not.toThrow();
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "data": {"type": Array, "schema": [String]}}}]}})).not.toThrow();
	});

	it("Should throw error if attribute names contain dots", () => {
		expect(() => new dynamoose.Schema({"id.data": String})).toThrow("Attributes must not contain dots.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name.other": String, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("Attributes must not contain dots.");
	});

	it("Should throw error if attribute is both hashKey and rangeKey", () => {
		expect(() => new dynamoose.Schema({"id": String, "friend": {"type": String, "hashKey": true, "rangeKey": true}})).toThrow("Attribute friend must not be both hashKey and rangeKey");
	});

	it("Should throw error if using hashKey as nested attribute", () => {
		expect(() => new dynamoose.Schema({"id": String, "friend": {"type": Object, "schema": {"name": {"type": String, "hashKey": true}}}})).toThrow("hashKey must be at root object and not nested in object or array.");
	});

	it("Should throw error if using multiple hashKey's'", () => {
		expect(() => new dynamoose.Schema({"id": String, "attr1": {"type": String, "hashKey": true}, "attr2": {"type": String, "hashKey": true}})).toThrow("Only one hashKey allowed per schema.");
	});

	it("Should throw error if using rangeKey as nested attribute", () => {
		expect(() => new dynamoose.Schema({"id": String, "friend": {"type": Object, "schema": {"name": {"type": String, "rangeKey": true}}}})).toThrow("rangeKey must be at root object and not nested in object or array.");
	});

	it("Should throw error if using multiple rangeKeys's'", () => {
		expect(() => new dynamoose.Schema({"id": String, "attr1": {"type": String, "rangeKey": true}, "attr2": {"type": String, "rangeKey": true}})).toThrow("Only one rangeKey allowed per schema.");
	});

	it("Should throw error if using index as nested attribute", () => {
		expect(() => new dynamoose.Schema({"id": String, "friend": {"type": Object, "schema": {"name": {"type": String, "index": {"type": "global"}}}}})).toThrow("Index must be at root object and not nested in object or array.");
	});

	it("Should throw error if passing an index with multiple data types", () => {
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Object, "schema": {"names": [{"type": Array, "schema": [String]}, {"type": String, "index": true}]}}})).toThrow("Index must be at root object and not nested in object or array.");
	});

	it("Should not throw error if passing multiple data types for a nested array attribute", () => {
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Object, "schema": {"names": [{"type": Array, "schema": [String]}, {"type": Array, "schema": [Number]}]}}})).not.toThrow();
	});

	it.skip("Should throw error if attribute names only contains number", () => {
		expect(() => new dynamoose.Schema({"1": String})).toThrow("Attributes names must not be numbers.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"1": String, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("Attributes names must not be numbers.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"1": {"type": Set, "schema": [String]}, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("Attributes names must not be numbers.");
	});

	it.skip("Should throw error if attribute names contains star", () => {
		expect(() => new dynamoose.Schema({"*": String})).toThrow("Attributes names must not include stars.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"*": String, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("Attributes names must not include stars.");
		expect(() => new dynamoose.Schema({"id": String, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"*": {"type": Set, "schema": [String]}, "data": {"type": Array, "schema": [Buffer, String]}}}]}})).toThrow("Attributes names must not include stars.");
	});

	it("Should not throw error if valid schema passed in", () => {
		expect(() => new dynamoose.Schema({"id": Number, "friends": {"type": Set, "schema": [String]}})).not.toThrow();
	});

	const defaultMapSettingNames = [
		"defaultMap",
		"defaultAlias"
	];
	describe(`${defaultMapSettingNames.map(utils.capitalize_first_letter).join("/")} Settings`, () => {
		defaultMapSettingNames.forEach((settingName) => {
			it(`Should not throw error if only ${settingName} is passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "userID"}})).not.toThrow();
			});

			it(`Should not throw error if ${settingName} passed in that matches attribute name`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "id"}})).not.toThrow();
			});

			it(`Should throw error if ${settingName} passed in that doesn't match map property`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "random"}})).toThrow(`${settingName} must exist in map, alias, or aliases property or be equal to attribute name.`);
			});

			it(`Should throw error if ${settingName} passed in that doesn't match map property within it's own attribute`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "random"}, "data": {"type": String, "map": ["hello", "random"]}})).toThrow(`${settingName} must exist in map, alias, or aliases property or be equal to attribute name.`);
			});

			it(`Should throw error if ${settingName} passed in matches other attribute name`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "data"}, "data": String})).toThrow(`${settingName} must exist in map, alias, or aliases property or be equal to attribute name.`);
			});

			it(`Should throw error if ${settingName} conflicts between types`, () => {
				expect(() => new dynamoose.Schema({"id": [{"type": Number, "map": ["_id", "userID"], [settingName]: "userID"}, {"type": String, "map": ["_id", "userID"], [settingName]: "_id"}]})).toThrow("Only defaultMap or defaultAlias can be specified per attribute.");
			});

			const additionalDefaultMapSettingName = defaultMapSettingNames.find((name) => name !== settingName);
			it(`Should throw error if ${settingName} & ${additionalDefaultMapSettingName} are passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, "map": ["_id", "userID"], [settingName]: "_id", [additionalDefaultMapSettingName]: "userID"}})).toThrow("Only defaultMap or defaultAlias can be specified per attribute.");
			});
		});
	});

	const mapSettingNames = [
		"map",
		"alias",
		"aliases"
	];
	describe(`${mapSettingNames.map(utils.capitalize_first_letter).join("/")} Settings`, () => {
		mapSettingNames.forEach((settingName) => {
			it(`Should not throw error if only ${settingName} is passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, [settingName]: "_id"}})).not.toThrow();
			});

			it(`Should not throw error if only ${settingName} is passed in with multiple types`, () => {
				expect(() => new dynamoose.Schema({"id": [{"type": Number, [settingName]: "_id"}, {"type": String, [settingName]: "_id"}]})).not.toThrow();
			});

			it(`Should not throw error if only ${settingName} is passed in to one type with multiple types`, () => {
				expect(() => new dynamoose.Schema({"id": [{"type": Number, [settingName]: "_id"}, {"type": String}]})).not.toThrow();
			});

			const additionalMapSettingName = mapSettingNames.find((name) => name !== settingName);
			it(`Should throw error if ${settingName} & ${additionalMapSettingName} are passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, [settingName]: "_id", [additionalMapSettingName]: "userID"}})).toThrow("Only one of map, alias, or aliases can be specified per attribute.");
			});

			it(`Should throw error if two properties have identical ${settingName} string value is passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, [settingName]: "random"}, "data": {"type": String, [settingName]: "random"}})).toThrow("Each properties map, alias, or aliases properties must be unique across the entire schema.");
			});

			it(`Should throw error if ${settingName} string value matches another attributes name is passed in`, () => {
				expect(() => new dynamoose.Schema({"id": {"type": Number, [settingName]: "data"}, "data": String})).toThrow("Each properties map, alias, or aliases properties must be not be used as a property name in the schema.");
			});
		});
	});

	describe("Nested Schemas", () => {
		it("Should have correct schemaObject for nested schemas", () => {
			expect(new dynamoose.Schema({"id": Number, "parent": new dynamoose.Schema({"name": String})}).getInternalProperties(internalProperties).schemaObject).toEqual({
				"id": Number,
				"parent": {
					"type": Object,
					"schema": {
						"name": String
					}
				}
			});
		});

		it("Should have correct schemaObject for nested schemas when defined as schema", () => {
			expect(new dynamoose.Schema({"id": Number, "parent": {"type": Object, "schema": new dynamoose.Schema({"name": String})}}).getInternalProperties(internalProperties).schemaObject).toEqual({
				"id": Number,
				"parent": {
					"type": Object,
					"schema": {
						"name": String
					}
				}
			});
		});

		it("Should have correct schemaObject for nested schemas when defined as schema and other settings", () => {
			expect(new dynamoose.Schema({"id": Number, "parent": {"type": Object, "schema": new dynamoose.Schema({"name": String}), "required": true}}).getInternalProperties(internalProperties).schemaObject).toEqual({
				"id": Number,
				"parent": {
					"type": Object,
					"schema": {
						"name": String
					},
					"required": true
				}
			});
		});

		it("Should have correct schemaObject for nested schemas as array", () => {
			expect(new dynamoose.Schema({"id": Number, "parents": {"type": Array, "schema": [new dynamoose.Schema({"name": String})]}}).getInternalProperties(internalProperties).schemaObject).toEqual({
				"id": Number,
				"parents": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"name": String
						}
					}]
				}
			});
		});

		it("Should have correct schemaObject for nested schemas as array and other settings", () => {
			expect(new dynamoose.Schema({"id": Number, "parents": {"type": Array, "schema": [new dynamoose.Schema({"name": String})], "required": true}}).getInternalProperties(internalProperties).schemaObject).toEqual({
				"id": Number,
				"parents": {
					"type": Array,
					"schema": [{
						"type": Object,
						"schema": {
							"name": String
						}
					}],
					"required": true
				}
			});
		});
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
					"data": [String, Buffer],
					"dataArray": [{"type": Array, "schema": [String]}, {"type": Array, "schema": [Buffer]}],
					"randomArray": [{"type": Object, "schema": {"name": String}}, {"type": Array, "schema": [Buffer]}],
					"favoriteFoods": {"type": Set, "schema": [String]},
					"favoriteNumbers": {"type": Set, "schema": [Number]},
					"favoriteDates": {"type": Set, "schema": [Date]},
					"favoritePictures": {"type": Set, "schema": [Buffer]},
					"favoriteTypes": {"type": Set, "schema": [Boolean]},
					"favoriteObjects": {"type": Set, "schema": [Object]},
					"favoriteFriends": {"type": Set, "schema": [Array]}
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
					"picture": "buffer",
					"data": ["String", "Buffer"],
					"dataArray": [{"type": "Array", "schema": ["String"]}, {"type": "Array", "schema": ["Buffer"]}],
					"randomArray": [{"type": "Object", "schema": {"name": "String"}}, {"type": "Array", "schema": ["Buffer"]}]
				}
			}
		];
		const tests = [
			{"input": undefined, "output": undefined},
			{"input": null, "output": undefined},
			{"input": "random", "output": undefined},
			{"input": "any", "output": undefined},
			{"input": "undefined", "output": undefined},
			{"input": "null", "output": undefined},
			{"input": "id", "output": "S"},
			{"input": "name", "output": "S"},
			{"input": "age", "output": "N"},
			{"input": "happy", "output": "BOOL"},
			{"input": "birthday", "output": "N"},
			{"input": "metadata", "output": "M"},
			{"input": "friends", "output": "L"},
			{"input": "picture", "output": "B"},
			{"input": "data", "output": ["S", "B"]},
			{"input": "dataArray", "output": ["L", "L"]},
			{"input": "randomArray", "output": ["M", "L"]},
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
							schema = new dynamoose.Schema({...schemaObj.schema});
						} else {
							const schemaObject = {...schemaObj.schema};
							Object.keys(schemaObject).forEach((key) => {
								if (!schemaObject[key].schema) {
									schemaObject[key] = {"type": schemaObject[key]};
								}
							});
							schema = new dynamoose.Schema(schemaObject);
						}
					});

					tests.forEach((test) => {
						if (!test.collection || test.collection === schemaObj.collection) {
							if (!test.output) {
								it(`Should throw error for ${test.input}`, () => {
									expect(() => schema.getAttributeType(test.input)).toThrow();
								});
							} else {
								it(`Should return ${test.output} for ${test.input}`, () => {
									expect(schema.getAttributeType(test.input)).toEqual(test.output);
								});
							}
						}
					});
				});
			});
		});
	});

	describe("hashKey", () => {
		it("Should return first attribute if no hash key defined", () => {
			expect(new dynamoose.Schema({"id": String, "age": Number}).hashKey).toEqual("id");
		});

		it("Should return hash key if set to true", () => {
			expect(new dynamoose.Schema({"id": String, "age": {"type": Number, "hashKey": true}}).hashKey).toEqual("age");
		});
	});

	describe("rangeKey", () => {
		it("Should return undefined if no range key defined", () => {
			expect(new dynamoose.Schema({"id": String, "age": Number}).rangeKey).toEqual(undefined);
		});

		it("Should return range key if set to true", () => {
			expect(new dynamoose.Schema({"id": String, "age": {"type": Number, "rangeKey": true}}).rangeKey).toEqual("age");
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
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageGlobalIndex",
							"Projection": {
								"ProjectionType": "ALL"
							},
							"KeySchema": [
								{
									"AttributeName": "age",
									"KeyType": "HASH"
								}
							]
						}
					]
				}
			},
			{
				"name": "Should return correct result with index as true and multiple indexes",
				"input": {"id": String, "age": {"type": Number, "index": true}, "name": {"type": String, "index": true}},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "id",
							"AttributeType": "S"
						},
						{
							"AttributeName": "age",
							"AttributeType": "N"
						},
						{
							"AttributeName": "name",
							"AttributeType": "S"
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
							"Projection": {
								"ProjectionType": "ALL"
							},
							"KeySchema": [
								{
									"AttributeName": "age",
									"KeyType": "HASH"
								}
							]
						},
						{
							"IndexName": "nameGlobalIndex",
							"Projection": {
								"ProjectionType": "ALL"
							},
							"KeySchema": [
								{
									"AttributeName": "name",
									"KeyType": "HASH"
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
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageIndex",
							"Projection": {
								"ProjectionType": "ALL"
							},
							"KeySchema": [
								{
									"AttributeName": "age",
									"KeyType": "HASH"
								}
							]
						}
					]
				}
			},
			{
				"name": "Should return correct result with global index as object",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "rangeKey": "id", "project": true, "throughput": 5}}},
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
								"ReadCapacityUnits": 5,
								"WriteCapacityUnits": 5
							},
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					]
				}
			},
			{
				"name": "Should return correct result with global index as object with rangeKey as different property",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "rangeKey": "type", "project": true, "throughput": 5}}, "type": String},
				"output": {
					"AttributeDefinitions": [
						{
							"AttributeName": "id",
							"AttributeType": "S"
						},
						{
							"AttributeName": "age",
							"AttributeType": "N"
						},
						{
							"AttributeName": "type",
							"AttributeType": "S"
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
									"AttributeName": "type",
									"KeyType": "RANGE"
								}
							],
							"ProvisionedThroughput": {
								"ReadCapacityUnits": 5,
								"WriteCapacityUnits": 5
							},
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					]
				}
			},
			{
				"name": "Should return correct result with index and project as null",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "project": null}}},
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
				"name": "Should return correct result with index and project as true",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "project": null}}},
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
				"name": "Should return correct result with index and project as false",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "project": false}}},
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
								}
							],
							"Projection": {
								"ProjectionType": "KEYS_ONLY"
							}
						}
					]
				}
			},
			{
				"name": "Should return correct result with index and project as array",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "ageIndex", "type": "global", "project": ["name"]}, "name": String, "address": String}},
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
								}
							],
							"Projection": {
								"NonKeyAttributes": ["name"],
								"ProjectionType": "INCLUDE"
							}
						}
					]
				}
			},
			{
				"name": "Should return correct result with index and no name as index with type undefined",
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
					"GlobalSecondaryIndexes": [
						{
							"IndexName": "ageGlobalIndex",
							"KeySchema": [
								{
									"AttributeName": "age",
									"KeyType": "HASH"
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
				"name": "Should return correct result with index and no name as local index",
				"input": {"id": String, "age": {"type": Number, "index": {"name": "", "type": "local"}}},
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
				"input": {"id": String, "age": {"type": Number, "index": {"name": "", "type": "global"}}},
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
									"AttributeName": "age",
									"KeyType": "HASH"
								}
							],
							"Projection": {
								"ProjectionType": "ALL"
							}
						}
					]
				}
			}
		];

		tests.forEach((test) => {
			it(test.name, async () => {
				const table = {"getInternalProperties": () => ({"options": {"throughput": "ON_DEMAND"}})};
				const model = {"getInternalProperties": () => ({"table": () => table})};
				expect(await new dynamoose.Schema(test.input).getCreateTableAttributeParams(model)).toEqual(test.output);
			});
		});
	});

	describe("getMapSettingObject", () => {
		const tests = [
			{
				"input": {"id": {"type": String, "map": "_id"}},
				"output": {"_id": "id"}
			},
			{
				"input": {"id": {"type": String, "map": ["_id", "userID"]}},
				"output": {"_id": "id", "userID": "id"}
			}
		];

		tests.forEach((test) => {
			it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
				const schema = new dynamoose.Schema(test.input);
				expect(schema.getInternalProperties(internalProperties).getMapSettingObject()).toEqual(test.output);
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
			},
			{
				"name": "Should return correct result for multiple attribute types",
				"input": {"id": Number, "data": [String, Number]},
				"output": ["id", "data"]
			},
			{
				"name": "Should return correct result for multiple attribute types and one as array",
				"input": {"id": Number, "data": [{"type": Array, "schema": [Number]}, Number]},
				"output": ["id", "data", "data.0"]
			},
			{
				"name": "Should work for multiple nested types",
				"input": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Object, "schema": {"name": String}}]},
				"output": ["id", "data", "data.0", "data.name"]
			}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(new dynamoose.Schema(test.input).attributes()).toEqual(test.output);
			});
		});

		describe("Mapped Attributes", () => {
			const tests = [
				{
					"name": "Should return correct result when passing in a mapped attribute as a string",
					"input": {"id": {"type": Number, "map": "_id"}},
					"output": ["id", "_id"]
				},
				{
					"name": "Should return correct result when passing in a mapped attribute as an array of string",
					"input": {"id": {"type": Number, "map": ["_id", "userID"]}},
					"output": ["id", "_id", "userID"]
				},
				{
					"name": "Should return correct result when passing in an alias attribute as a string",
					"input": {"id": {"type": Number, "alias": "_id"}},
					"output": ["id", "_id"]
				},
				{
					"name": "Should return correct result when passing in an alias attribute as an array of string",
					"input": {"id": {"type": Number, "alias": ["_id", "userID"]}},
					"output": ["id", "_id", "userID"]
				},
				{
					"name": "Should return correct result when passing in an aliases attribute as a string",
					"input": {"id": {"type": Number, "aliases": "_id"}},
					"output": ["id", "_id"]
				},
				{
					"name": "Should return correct result when passing in an aliases attribute as an array of string",
					"input": {"id": {"type": Number, "aliases": ["_id", "userID"]}},
					"output": ["id", "_id", "userID"]
				}
			];

			tests.forEach((test) => {
				it(test.name, () => {
					expect(new dynamoose.Schema(test.input).attributes(undefined, {"includeMaps": true})).toEqual(test.output);
				});
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
				expect(new dynamoose.Schema({"id": String}, test.settings).getSettingValue(test.input)).toEqual(test.output);
			});
		});
	});

	describe("getAttributeTypeDetails", () => {
		it("Should throw for invalid attribute", () => {
			const func = () => new dynamoose.Schema({"id": String}).getAttributeTypeDetails("random");
			expect(func).toThrow(Error.UnknownAttribute);
			expect(func).toThrow("Invalid Attribute: random");
		});

		it("Should not throw for attribute with number in it (without . prefix)", () => {
			const func = () => new dynamoose.Schema({"id": String, "ran2dom": String}).getAttributeTypeDetails("ran2dom");
			expect(func).not.toThrow(Error.UnknownAttribute);
			expect(func).not.toThrow("Invalid Attribute: ran2dom");
		});

		it("Should have correct custom type for date", () => {
			const functions = new dynamoose.Schema({"id": Date}).getAttributeTypeDetails("id").customType.functions;
			expect(functions.toDynamo).toBeDefined();
			expect(functions.fromDynamo).toBeDefined();
			expect(functions.toDynamo(new Date(1582246653000))).toEqual(1582246653000);
			expect(functions.fromDynamo(1582246653000)).toEqual(new Date(1582246653000));
		});

		it("Should have correct custom type for date with type object and no settings", () => {
			const functions = new dynamoose.Schema({"id": {"type": {"value": Date}}}).getAttributeTypeDetails("id").customType.functions;
			expect(functions.toDynamo).toBeDefined();
			expect(functions.fromDynamo).toBeDefined();
			expect(functions.toDynamo(new Date(1582246653000))).toEqual(1582246653000);
			expect(functions.fromDynamo(1582246653000)).toEqual(new Date(1582246653000));
		});

		it("Should have correct custom type for date with custom storage settings as milliseconds", () => {
			const functions = new dynamoose.Schema({"id": {"type": {"value": Date, "settings": {"storage": "milliseconds"}}}}).getAttributeTypeDetails("id").customType.functions;
			expect(functions.toDynamo).toBeDefined();
			expect(functions.fromDynamo).toBeDefined();
			expect(functions.toDynamo(new Date(1582246653000))).toEqual(1582246653000);
			expect(functions.fromDynamo(1582246653000)).toEqual(new Date(1582246653000));
		});

		it("Should have correct custom type for date with custom storage settings as seconds", () => {
			const functions = new dynamoose.Schema({"id": {"type": {"value": Date, "settings": {"storage": "seconds"}}}}).getAttributeTypeDetails("id").customType.functions;
			expect(functions.toDynamo).toBeDefined();
			expect(functions.fromDynamo).toBeDefined();
			expect(functions.toDynamo(new Date(1582246653000))).toEqual(1582246653);
			expect(functions.fromDynamo(1582246653)).toEqual(new Date(1582246653000));
		});

		it("Should have correct result for multiple types", () => {
			const result = new dynamoose.Schema({"id": {"type": [String, Buffer]}}).getAttributeTypeDetails("id");
			expect(result.map((item) => ({"name": item.name, "dynamodbType": item.dynamodbType}))).toEqual([{"name": "String", "dynamodbType": "S"}, {"name": "Buffer", "dynamodbType": "B"}]);
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
					return new Promise((resolve) => setTimeout(() => resolve("Hello World"), 10));
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
				"schema": {"id": {"type": String, "validate": () => new Promise((resolve) => setTimeout(() => resolve("Hello World"), 10))}},
				"output": () => new Promise((resolve) => setTimeout(() => resolve("Hello World"), 10))
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
				const schema = new dynamoose.Schema(test.schema);
				const output = await schema.getAttributeSettingValue(...test.input);
				if (typeof output !== "function") {
					expect(output).toEqual(test.output);
				} else {
					expect(typeof output).toEqual(typeof test.output);
					expect(output.toString()).toEqual(test.output.toString());
					expect(await output()).toEqual(await test.output());
				}
			});
		});
	});

	describe("getIndexAttributes", () => {
		const tests = [
			{
				"name": "Should return an empty array if no indices are defined",
				"schema": {"id": String},
				"output": []
			},
			{
				"name": "Should return an array containing definitions for an boolean defined index",
				"schema": {"id": {"type": String, "index": true}},
				"output": [{"attribute": "id", "index": true}]
			},
			{
				"name": "Should return an array containing definitions for an object defined index",
				"schema": {"id": {"type": String, "index": {"type": "global", "name": "id-index"}}},
				"output": [{"attribute": "id", "index": {"type": "global", "name": "id-index"}}]
			},
			{
				"name": "Should return an array containing definitions for an array defined index",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index"}]}},
				"output": [{"attribute": "id", "index": {"type": "global", "name": "id-index"}}]
			},
			{
				"name": "Should return an array containing multiple definitions for array defined indexes",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index-1"}, {"type": "local", "name": "id-index-2"}]}},
				"output": [{"attribute": "id", "index": {"type": "global", "name": "id-index-1"}}, {"attribute": "id", "index": {"type": "local", "name": "id-index-2"}}]
			},
			{
				"name": "Should aggregate an array containing multiple definitions for all defined indexes",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index-1"}, {"type": "local", "name": "id-index-2"}]}, "uid": {"type": String, "index": {"type": "global", "name": "uid-index"}}, "uuid": {"type": String}},
				"output": [{"attribute": "id", "index": {"type": "global", "name": "id-index-1"}}, {"attribute": "id", "index": {"type": "local", "name": "id-index-2"}}, {"attribute": "uid", "index": {"type": "global", "name": "uid-index"}}]
			},
			{
				"name": "Should work with multiple types for single attribute",
				"schema": {"id": String, "data": [String, Number]},
				"output": []
			}
		];

		tests.forEach((test) => {
			it(test.name, async () => {
				const schema = new dynamoose.Schema(test.schema);
				const output = await schema.getInternalProperties(internalProperties).getIndexAttributes();
				expect(output).toEqual(test.output);
			});
		});
	});

	describe("indexAttributes", () => {
		const tests = [
			{
				"name": "Should return an empty array if no indices are defined",
				"schema": {"id": String},
				"output": []
			},
			{
				"name": "Should return an array containing definitions for an boolean defined index",
				"schema": {"id": {"type": String, "index": true}},
				"output": ["id"]
			},
			{
				"name": "Should return an array containing definitions for an object defined index",
				"schema": {"id": {"type": String, "index": {"type": "global", "name": "id-index"}}},
				"output": ["id"]
			},
			{
				"name": "Should return an array containing definitions for an array defined index",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index"}]}},
				"output": ["id"]
			},
			{
				"name": "Should return an array containing multiple definitions for array defined indexes",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index-1"}, {"type": "local", "name": "id-index-2"}]}},
				"output": ["id", "id"]
			},
			{
				"name": "Should aggregate an array containing multiple definitions for all defined indexes",
				"schema": {"id": {"type": String, "index": [{"type": "global", "name": "id-index-1"}, {"type": "local", "name": "id-index-2"}]}, "uid": {"type": String, "index": {"type": "global", "name": "uid-index"}}, "uuid": {"type": String}},
				"output": ["id", "id", "uid"]
			},
			{
				"name": "Should work with multiple types for single attribute",
				"schema": {"id": String, "data": [String, Number]},
				"output": []
			}
		];

		tests.forEach((test) => {
			it(test.name, async () => {
				const schema = new dynamoose.Schema(test.schema);
				const output = schema.indexAttributes;
				expect(output).toEqual(test.output);
			});
		});
	});

	describe("getTypePaths", () => {
		it("Should be a function", () => {
			expect(new dynamoose.Schema({"id": String}).getTypePaths).toBeInstanceOf(Function);
		});

		const tests = [
			{"schema": {"id": String, "data": [String, Number]}, "input": {"id": "id1", "data": "hello world"}, "output": {"data": 0}},
			{"schema": {"id": String, "data": [String, Number]}, "input": {"id": "id1", "data": 10}, "output": {"data": 1}},
			{"schema": {"id": String, "data": [{"type": Object, "schema": {"item1": String}}, {"type": Object, "schema": {"item2": String}}]}, "input": {"id": "id1", "data": {"item1": "hello"}}, "output": {"data": 0}},
			{"schema": {"id": String, "data": [{"type": Object, "schema": {"item1": String}}, {"type": Object, "schema": {"item2": String}}]}, "input": {"id": "id1", "data": {"item2": "hello"}}, "output": {"data": 1}},
			{"schema": {"id": String, "data": [{"type": Object, "schema": {"item1": String}}, {"type": Object, "schema": {"item1": Number}}]}, "input": {"id": "id1", "data": {"item1": "hello"}}, "output": {"data": 0}},
			{"schema": {"id": String, "data": [{"type": Object, "schema": {"item1": String}}, {"type": Object, "schema": {"item1": Number}}]}, "input": {"id": "id1", "data": {"item1": 10}}, "output": {"data": 1}},
			{"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": Number, "id2": String}}]}, "input": {"id": 1, "data": {"name": 1, "id1": "1", "id2": "1"}}, "output": {"data": 1}},
			{"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": Number}}, {"type": Object, "schema": {"name": Number, "id2": String}}]}, "input": {"id": 1, "data": {"name": 1, "id2": 2}}, "output": {"data": 1}},
			{"schema": {"id": Number, "data": String}, "input": {"id": 1, "data9": "Hello"}, "settings": {"includeAllProperties": true}, "output": {"id": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "data9": {"index": 0, "entryCorrectness": [0.5], "matchCorrectness": 0.5}}},
			{"schema": {"id": Number, "data": {"type": Object, "schema": {"parameter": String}}}, "input": {"id": 1, "data": {"parameter": "hello"}}, "settings": {"includeAllProperties": true}, "output": {"id": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "data": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "data.parameter": {"entryCorrectness": [1], "index": 0, "matchCorrectness": 1}}},
			{"schema": {"id": Number, "data": {"type": Object, "schema": {"parameter": Number}}}, "input": {"id": 1, "data": {"parameter": "hello"}}, "settings": {"includeAllProperties": true}, "output": {"id": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "data": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "data.parameter": {"entryCorrectness": [0], "index": 0, "matchCorrectness": 0}}},
			{"schema": {"id": String, "data": Buffer}, "input": {"id": "id1", "data": Buffer.from("hello world")}, "settings": {"includeAllProperties": true}, "output": {"data": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}, "id": {"index": 0, "entryCorrectness": [1], "matchCorrectness": 1}}}
		];

		tests.forEach((test) => {
			it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)} with schema as ${JSON.stringify(test.schema)}`, () => {
				expect(new dynamoose.Schema(test.schema).getTypePaths(test.input, test.settings)).toEqual(test.output);
			});
		});
	});

	describe("getTimestampAttributes", () => {
		it("Should be a function", () => {
			expect(new dynamoose.Schema({"id": String}).getInternalProperties(internalProperties).getTimestampAttributes).toBeInstanceOf(Function);
		});

		const tests = [
			{"input": undefined, "output": []}
		];

		tests.forEach((test) => {
			it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
				expect(new dynamoose.Schema({"id": String}).getInternalProperties(internalProperties).getTimestampAttributes(test.input)).toEqual(test.output);
			});
		});
	});
});
