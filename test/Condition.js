const chai = require("chai");
const {expect} = chai;
const dynamoose = require("../lib");
const {Condition} = dynamoose;

describe("Condition", () => {
	it("Should be a function", () => {
		expect(Condition).to.be.a("function");
	});

	it("Should return an object", () => {
		expect(new Condition()).to.be.an("object");
	});

	describe("requestObject", () => {
		it("Should be a function", () => {
			expect(new Condition().requestObject).to.be.a("function");
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
			// TODO: fix the test below
			// {
			// 	"input": () => new Condition({"id": {"ne": "5"}}),
			// 	"output": {"ConditionExpression": "#a0 <> :v0", "ExpressionAttributeNames": {"#a0": "id"}, "ExpressionAttributeValues": {":v0": {"S": "5"}}}
			// },
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
				"output": {"ConditionExpression": "attribute_exists (#a0)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {}}
			},
			{
				"input": () => new Condition().where("name").not().exists(),
				"output": {"ConditionExpression": "attribute_not_exists (#a0)", "ExpressionAttributeNames": {"#a0": "name"}, "ExpressionAttributeValues": {}}
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
				"input": () => new Condition({"FilterExpression": "#id = :id", "ExpressionAttributeValues": {":id": "5"}, "ExpressionAttributeNames": {"#id": "id"}}),
				"output": {}
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
				"output": {}
			},
		];

		tests.forEach((test) => {
			it(`Should ${test.error ? "throw" : "return"} ${JSON.stringify(test.error || test.output)} for ${JSON.stringify(test.input)}`, () => {
				if (test.error) {
					expect(() => test.input().requestObject(test.settings)).to.throw(test.error);
				} else {
					expect(test.input().requestObject(test.settings)).to.eql(test.output);
				}
			});
		});
	});
});
