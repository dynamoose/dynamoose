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
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": "5"}),
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"eq": "5"}}),
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition({"id": {"lt": "5"}}),
				"output": {"ConditionExpression": "#ca0 < :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			// TODO: fix the test below
			// {
			// 	"input": () => new Condition({"id": {"ne": "5"}}),
			// 	"output": {"ConditionExpression": "#ca0 <> :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			// },
			{
				"input": () => new Condition({"id": {"random": "5"}}),
				"error": "The type: random is invalid."
			},
			{
				"input": () => new Condition().group(new Condition("id").eq("5")),
				"output": {"ConditionExpression": "(#ca0 = :cv0)", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().parenthesis(new Condition("id").eq("5")),
				"output": {"ConditionExpression": "(#ca0 = :cv0)", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5")),
				"output": {"ConditionExpression": "(#ca0 = :cv0)", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().group(new Condition().group(new Condition().where("id").eq("5")))),
				"output": {"ConditionExpression": "(((#ca0 = :cv0)))", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group((condition) => condition.where("id").eq("5")),
				"output": {"ConditionExpression": "(#ca0 = :cv0)", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5")).and().group(new Condition().where("name").eq("Charlie")),
				"output": {"ConditionExpression": "(#ca0 = :cv0) AND (#ca1 = :cv1)", "ExpressionAttributeNames": {"#ca0": "id", "#ca1": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}, ":cv1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5").group(new Condition().where("name").eq("Charlie"))),
				"output": {"ConditionExpression": "(#ca0 = :cv0 AND (#ca1 = :cv1))", "ExpressionAttributeNames": {"#ca0": "id", "#ca1": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}, ":cv1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().group(new Condition().where("id").eq("5").group(new Condition().where("name").eq("Charlie").and().where("power").eq(10))),
				"output": {"ConditionExpression": "(#ca0 = :cv0 AND (#ca1 = :cv1 AND #ca2 = :cv2))", "ExpressionAttributeNames": {"#ca0": "id", "#ca1": "name", "#ca2": "power"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}, ":cv1": {"S": "Charlie"}, ":cv2": {"N": "10"}}}
			},
			{
				"input": () => new Condition().where("id").eq("5"),
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().filter("id").eq("5"),
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().attribute("id").eq("5"),
				"output": {"ConditionExpression": "#ca0 = :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().where("id").not().eq("5"),
				"output": {"ConditionExpression": "#ca0 <> :cv0", "ExpressionAttributeNames": {"#ca0": "id"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}}}
			},
			{
				"input": () => new Condition().where("id").not().eq("5").and().where("name").eq("Charlie"),
				"output": {"ConditionExpression": "#ca0 <> :cv0 AND #ca1 = :cv1", "ExpressionAttributeNames": {"#ca0": "id", "#ca1": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}, ":cv1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().where("id").eq("5").and().where("name").eq("Charlie"),
				"output": {"ConditionExpression": "#ca0 = :cv0 AND #ca1 = :cv1", "ExpressionAttributeNames": {"#ca0": "id", "#ca1": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "5"}, ":cv1": {"S": "Charlie"}}}
			},
			{
				"input": () => new Condition().where("age").lt(5),
				"output": {"ConditionExpression": "#ca0 < :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().lt(5),
				"output": {"ConditionExpression": "#ca0 >= :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").le(5),
				"output": {"ConditionExpression": "#ca0 <= :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().le(5),
				"output": {"ConditionExpression": "#ca0 > :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").gt(5),
				"output": {"ConditionExpression": "#ca0 > :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().gt(5),
				"output": {"ConditionExpression": "#ca0 <= :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").ge(5),
				"output": {"ConditionExpression": "#ca0 >= :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("age").not().ge(5),
				"output": {"ConditionExpression": "#ca0 < :cv0", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0": {"N": "5"}}}
			},
			{
				"input": () => new Condition().where("name").beginsWith("C"),
				"output": {"ConditionExpression": "begins_with (#ca0, :cv0)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").not().beginsWith("C"),
				"error": "BEGINS_WITH can not follow not()"
			},
			{
				"input": () => new Condition().where("name").contains("C"),
				"output": {"ConditionExpression": "contains (#ca0, :cv0)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").not().contains("C"),
				"output": {"ConditionExpression": "NOT contains (#ca0, :cv0)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {":cv0": {"S": "C"}}}
			},
			{
				"input": () => new Condition().where("name").exists(),
				"output": {"ConditionExpression": "attribute_exists (#ca0)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {}}
			},
			{
				"input": () => new Condition().where("name").not().exists(),
				"output": {"ConditionExpression": "attribute_not_exists (#ca0)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {}}
			},
			{
				"input": () => new Condition().where("name").in(["Charlie", "Bob"]),
				"output": {"ConditionExpression": "#ca0 IN (:cv0-1, :cv0-2)", "ExpressionAttributeNames": {"#ca0": "name"}, "ExpressionAttributeValues": {":cv0-1": {"S": "Charlie"}, ":cv0-2": {"S": "Bob"}}}
			},
			{
				"input": () => new Condition().where("name").not().in(["Charlie", "Bob"]),
				"error": "IN can not follow not()"
			},
			{
				"input": () => new Condition().where("age").between(13, 18),
				"output": {"ConditionExpression": "#ca0 BETWEEN :cv0-1 AND :cv0-2", "ExpressionAttributeNames": {"#ca0": "age"}, "ExpressionAttributeValues": {":cv0-1": {"N": "13"}, ":cv0-2": {"N": "18"}}}
			},
			{
				"input": () => new Condition().where("age").not().between(13, 18),
				"error": "BETWEEN can not follow not()"
			},
			{
				"input": () => new Condition().where("userID").eq("1").and().where("userID").exists(),
				"output": {"ConditionExpression": "#ca0 = :cv0 AND attribute_exists (#ca1)", "ExpressionAttributeNames": {"#ca0": "userID", "#ca1": "userID"}, "ExpressionAttributeValues": {":cv0": {"S": "1"}}}
			},
		];

		tests.forEach((test) => {
			it(`Should ${test.error ? "throw" : "return"} ${JSON.stringify(test.error || test.output)} for ${JSON.stringify(test.input)}`, () => {
				if (test.error) {
					expect(() => test.input().requestObject()).to.throw(test.error);
				} else {
					expect(test.input().requestObject()).to.eql(test.output);
				}
			});
		});
	});
});
