const dynamoose = require("../dist");
const {Instance} = require("../dist/Instance");
const CustomError = require("../dist/Error").default;
const {Condition} = dynamoose;
const Internal = require("../dist/Internal").default;
const {internalProperties} = Internal.General;

describe("Condition", () => {
	it("Should be a function", () => {
		expect(Condition).toBeInstanceOf(Function);
	});

	it("Should return an object", () => {
		expect(new Condition()).toBeInstanceOf(Object);
	});

	it("Should display warning when passing undefined into condition", () => {
		let result;
		const originalFunction = console.warn; // eslint-disable-line no-console
		console.warn = (str) => { // eslint-disable-line no-console
			result = str;
		};
		new Condition("id").eq(undefined);
		console.warn = originalFunction; // eslint-disable-line no-console
		expect(result).toEqual("Dynamoose Warning: Passing `undefined` into a condition eq is not supported and can lead to behavior where DynamoDB returns an error related to your conditional. In a future version of Dynamoose this behavior will throw an error. If you believe your conditional is valid and you received this message in error, please submit an issue at https://github.com/dynamoose/dynamoose/issues/new/choose.");
	});

	describe("requestObject", () => {
		it("Should be a function", () => {
			expect(new Condition().getInternalProperties(internalProperties).requestObject).toBeInstanceOf(Function);
		});

		const tests = [
			{
				"input": () => new Condition(),
				"output": {}
			},
			{
				"input": () => new Condition("id").eq("5"),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": "5"}),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition(new Condition({"id": "5"})),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"eq": "5"}}),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"lt": "5"}}),
				"output": {"ConditionExpression": "#a0 < :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"ne": "5"}}),
				"output": {"ConditionExpression": "#a0 <> :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"random": "5"}}),
				"error": "The type: random is invalid."
			},
			{
				"input": () => new Condition("name.first").eq("Charlie"),
				"output": {"ConditionExpression": "#a0_0.#a0_1 = :v0", "ExpressionAttributeNames": {"#a0_0": "name", "#a0_1": "first"}, "ExpressionAttributeValues": {":v0": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().group(new Condition("id").eq("5")),
				"output": {"ConditionExpression": "(#a0 = :v0)", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().parenthesis(new Condition("id").eq("5")),
				"output": {"ConditionExpression": "(#a0 = :v0)", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5")),
				"output": {"ConditionExpression": "(#a0 = :v0)", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().group(new Condition().group(new Condition().where("id").eq("5")))),
				"output": {"ConditionExpression": "(((#a0 = :v0)))", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group((condition) => condition.where("id").eq("5")),
				"output": {"ConditionExpression": "(#a0 = :v0)", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5")).and().group(new Condition().where("name").eq("Charlie")),
				"output": {"ConditionExpression": "(#a0 = :v0) AND (#a1 = :v1)", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5").group(new Condition().where("name").eq("Charlie"))),
				"output": {"ConditionExpression": "(#a0 = :v0 AND (#a1 = :v1))", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5").group(new Condition().where("name").eq("Charlie").and().where("power").eq(10))),
				"output": {"ConditionExpression": "(#a0 = :v0 AND (#a1 = :v1 AND #a2 = :v2))", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name", "#a2": "power"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}, ":v2": {"N": "10"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5").or().group(new Condition().where("name").eq("Charlie").and().where("power").eq(10))),
				"output": {"ConditionExpression": "(#a0 = :v0 OR (#a1 = :v1 AND #a2 = :v2))", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name", "#a2": "power"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}, ":v2": {"N": "10"}}}
			},
			{
				"input": () => new Condition({"id": 1}).parenthesis((a) => a.where("name").eq("Charlie").or().where("name").eq("Bob")),
				"output": {"ConditionExpression": "#a0 = :v0 AND (#a1 = :v1 OR #a2 = :v2)", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name", "#a2": "name"}, "ExpressionAttributeValues": {":v0": {"N": "1"}, ":v1": {"S": "Charlie"}, ":v2": {"S": "Bob"}}}
			},
			{
				"input": () => new Condition({"id": 1}).parenthesis((a) => a.where("name").eq("Charlie").or().where("name").eq("Bob")),
				"settings": {"conditionStringType": "array", "conditionString": "ConditionExpression"},
				"output": {"ConditionExpression": ["#a0 = :v0", "AND", ["#a1 = :v1", "OR", "#a2 = :v2"]], "ExpressionAttributeNames": {"#a0": "id", "#a1": "name", "#a2": "name"}, "ExpressionAttributeValues": {":v0": {"N": "1"}, ":v1": {"S": "Charlie"}, ":v2": {"S": "Bob"}}}
			},
			{
				"input": () => new Condition().where("id").eq("5").or().where("name").eq("Charlie"),
				"output": {"ConditionExpression": "#a0 = :v0 OR #a1 = :v1", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().where("id").eq("5"),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().filter("id").eq("5"),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().attribute("id").eq("5"),
				"output": {"ConditionExpression": "#a0 = :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().where("id").not().eq("5"),
				"output": {"ConditionExpression": "#a0 <> :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().where("id").not().eq("5").and().where("name").eq("Charlie"),
				"output": {"ConditionExpression": "#a0 <> :v0 AND #a1 = :v1", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().where("id").eq("5").and().where("name").eq("Charlie"),
				"output": {"ConditionExpression": "#a0 = :v0 AND #a1 = :v1", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "5"}, ":v1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().where("age").lt(5),
				"output": {"ConditionExpression": "#a0 < :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().lt(5),
				"output": {"ConditionExpression": "#a0 >= :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").le(5),
				"output": {"ConditionExpression": "#a0 <= :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().le(5),
				"output": {"ConditionExpression": "#a0 > :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").gt(5),
				"output": {"ConditionExpression": "#a0 > :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().gt(5),
				"output": {"ConditionExpression": "#a0 <= :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").ge(5),
				"output": {"ConditionExpression": "#a0 >= :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().ge(5),
				"output": {"ConditionExpression": "#a0 < :v0", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("name").beginsWith("C"),
				"output": {"ConditionExpression": "begins_with (#a0, :v0)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {":v0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").not().beginsWith("C"),
				"error": "BEGINS_WITH can not follow not()"
			},
			{
				"input": () => new Condition().where("name").contains("C"),
				"output": {"ConditionExpression": "contains (#a0, :v0)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {":v0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").not().contains("C"),
				"output": {"ConditionExpression": "NOT contains (#a0, :v0)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {":v0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").exists(),
				"output": {"ConditionExpression": "attribute_exists (#a0)", "ExpressionAttributeNames": {"#a0": "name"}}
			},
			{
				"input": () => new Condition().where("name").not().exists(),
				"output": {"ConditionExpression": "attribute_not_exists (#a0)", "ExpressionAttributeNames": {"#a0": "name"}}
			},
			{
				"input": () => new Condition().where("name").in(["Charlie", "Bob"]),
				"output": {"ConditionExpression": "#a0 IN (:v0_1, :v0_2)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {":v0_1": {"S": "Charlie"}, ":v0_2": {"S": "Bob"}}}
			},
			{
				"input": () => new Condition().where("name").not().in(["Charlie", "Bob"]),
				"error": "IN can not follow not()"
			},
			{
				"input": () => new Condition().where("age").between(13, 18),
				"output": {"ConditionExpression": "#a0 BETWEEN :v0_1 AND :v0_2", "ExpressionAttributeNames": {"#a0": "age"}, "ExpressionAttributeValues": {":v0_1": {"N": "13"}, ":v0_2": {"N": "18"}}}
			},
			{
				"input": () => new Condition().where("age").not().between(13, 18),
				"error": "BETWEEN can not follow not()"
			},
			{
				"input": () => new Condition().where("userID").eq("1").and().where("userID").exists(),
				"output": {"ConditionExpression": "#a0 = :v0 AND attribute_exists (#a1)", "ExpressionAttributeNames": {"#a0": "userID", "#a1": "userID"}, "ExpressionAttributeValues": {":v0": {"S": "1"}}}
			},
			{
				"input": () => new Condition({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}),
				"settings": {"conditionString": "FilterExpression"},
				"output": {"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}}),
				"settings": {"conditionString": "FilterExpression"},
				"output": {"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition(new Condition({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}})),
				"settings": {"conditionString": "FilterExpression"},
				"output": {"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}}),
				"output": {"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition({"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}),
				"output": {"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition({"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}}),
				"output": {"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			},
			{
				"input": () => new Condition({"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}}),
				"settings": {"conditionString": "FilterExpression"},
				"output": {"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}}
			}
		];

		tests.forEach((test) => {
			it(`Should ${test.error ? "throw" : "return"} ${JSON.stringify(test.error || test.output)} for ${JSON.stringify(test.input)}`, async () => {
				const model = {
					"getInternalProperties": () => ({
						"table": () => ({
							"getInternalProperties": () => ({
								"instance": Instance.default
							})
						}),
						"schemaForObject": () => new dynamoose.Schema({"id": String}),
						"dynamoPropertyForAttribute": (key) => key
					})
				};
				if (test.error) {
					return expect(() => test.input().requestObject(model, test.settings)).toThrow(test.error);
				} else {
					return expect(await test.input().getInternalProperties(internalProperties).requestObject(model, test.settings)).toEqual(test.output);
				}
			});
		});

		describe("Raw condition objects", () => {
			const model = {
				"getInternalProperties": () => ({
					"table": () => ({
						"getInternalProperties": () => ({
							"instance": Instance.default
						})
					}),
					"schemaForObject": () => new dynamoose.Schema({"id": String}),
					"dynamoPropertyForAttribute": (key) => key
				})
			};

			["ComparisonExpression", "KeyConditionExpression"].forEach((key) => {
				["ConditionExpression", "FilterExpression"].forEach((conditionString) => {
					it(`Should throw an error for a ${key} property when building a ${conditionString}`, () => {
						const condition = new Condition({[key]: "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}});
						return expect(condition.getInternalProperties(internalProperties).requestObject(model, {conditionString, "conditionStringType": "string"})).rejects.toEqual(new CustomError.InvalidParameter(`A raw condition object must have a "ConditionExpression" or "FilterExpression" property, but it has "${key}".`));
					});
				});
			});

			[["ConditionExpression", "ConditionExpression"], ["FilterExpression", "ConditionExpression"], ["ConditionExpression", "FilterExpression"], ["FilterExpression", "FilterExpression"]].forEach(([key, conditionString]) => {
				it(`Should use a ${key} without ExpressionAttributeValues when building a ${conditionString}`, async () => {
					const condition = new Condition({[key]: "attribute_exists(#id)", "ExpressionAttributeNames": {"#id": "id"}});
					expect(await condition.getInternalProperties(internalProperties).requestObject(model, {conditionString, "conditionStringType": "string"})).toEqual({[conditionString]: "attribute_exists(#id)", "ExpressionAttributeNames": {"#id": "id"}});
				});
			});

			it("Should leave out empty ExpressionAttributeNames and ExpressionAttributeValues", async () => {
				const condition = new Condition({"ConditionExpression": "attribute_exists(id)", "ExpressionAttributeNames": {}, "ExpressionAttributeValues": {}});
				expect(await condition.getInternalProperties(internalProperties).requestObject(model)).toEqual({"ConditionExpression": "attribute_exists(id)"});
			});

			it("Should throw an error for an unknown property without ExpressionAttributeValues", () => {
				const condition = new Condition({"ComparisonExpression": "attribute_exists(#id)", "ExpressionAttributeNames": {"#id": "id"}});
				return expect(condition.getInternalProperties(internalProperties).requestObject(model)).rejects.toEqual(new CustomError.InvalidParameter("A raw condition object must have a \"ConditionExpression\" or \"FilterExpression\" property, but it has \"ComparisonExpression\"."));
			});

			it("Should still treat an object of attributes as a condition on those attributes", async () => {
				const condition = new Condition({"id": "1", "name": "Bob"});
				expect(await condition.getInternalProperties(internalProperties).requestObject(model)).toEqual({"ConditionExpression": "#a0 = :v0 AND #a1 = :v1", "ExpressionAttributeNames": {"#a0": "id", "#a1": "name"}, "ExpressionAttributeValues": {":v0": {"S": "1"}, ":v1": {"S": "Bob"}}});
			});

			it("Should use a raw condition in parenthesis() as a group of the condition expression", async () => {
				const condition = new Condition().where("id").eq("1").parenthesis(new Condition({"ConditionExpression": "attribute_exists(#n)", "ExpressionAttributeNames": {"#n": "name"}}));
				expect(await condition.getInternalProperties(internalProperties).requestObject(model)).toEqual({"ConditionExpression": "#a0 = :v0 AND (attribute_exists(#n))", "ExpressionAttributeNames": {"#a0": "id", "#n": "name"}, "ExpressionAttributeValues": {":v0": {"S": "1"}}});
			});

			it("Should use a raw condition in parenthesis() as a group of one part in an array", async () => {
				const condition = new Condition().where("id").eq("1").parenthesis(new Condition({"FilterExpression": "#n = :n", "ExpressionAttributeNames": {"#n": "name"}, "ExpressionAttributeValues": {":n": "Bob"}}));
				expect(await condition.getInternalProperties(internalProperties).requestObject(model, {"conditionString": "FilterExpression", "conditionStringType": "array"})).toEqual({"FilterExpression": ["#a0 = :v0", "AND", ["#n = :n"]], "ExpressionAttributeNames": {"#a0": "id", "#n": "name"}, "ExpressionAttributeValues": {":v0": {"S": "1"}, ":n": {"S": "Bob"}}});
			});

			it("Should throw an error for a raw condition in parenthesis() with an unknown property", () => {
				const condition = new Condition().parenthesis(new Condition({"ComparisonExpression": "attribute_exists(#n)", "ExpressionAttributeNames": {"#n": "name"}}));
				return expect(condition.getInternalProperties(internalProperties).requestObject(model)).rejects.toEqual(new CustomError.InvalidParameter("A raw condition object must have a \"ConditionExpression\" or \"FilterExpression\" property, but it has \"ComparisonExpression\"."));
			});

			it("Should not change the object passed in", async () => {
				const raw = {"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}};
				const condition = new Condition(raw);
				const result = await condition.getInternalProperties(internalProperties).requestObject(model);
				result.ExpressionAttributeNames["#a0"] = "name";
				result.ExpressionAttributeValues[":v0"] = {"S": "Bob"};
				expect(raw).toEqual({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}});
				expect(await condition.getInternalProperties(internalProperties).requestObject(model)).toEqual({"ConditionExpression": "#id = :id", "ExpressionAttributeValues": {":id": {"S": "5"}}, "ExpressionAttributeNames": {"#id": "id"}});
			});
		});
	});
});
