const {expect} = require("chai");
const utils = require("../../../dist/utils");
const dynamoose = require("../../../dist");

describe("utils.dynamoose.index_changes", () => {
	it("Should be a function", () => {
		expect(utils.dynamoose.index_changes).to.be.a("function");
	});

	const tests = [
		{"input": [], "schema": {"id": String, "name": {"type": String, "index": {"global": true}}}, "output": [
			{
				"spec": {
					"IndexName": "nameGlobalIndex",
					"KeySchema": [
						{
							"AttributeName": "name",
							"KeyType": "HASH"
						}
					],
					"Projection": {
						"ProjectionType": "ALL"
					},
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					}
				},
				"type": "add"
			}
		]},
		{"input": [
			{
				"IndexName": "nameGlobalIndex",
				"KeySchema": [
					{
						"AttributeName": "name",
						"KeyType": "HASH"
					}
				],
				"Projection": {
					"ProjectionType": "ALL"
				},
				"ProvisionedThroughput": {
					"ReadCapacityUnits": 1,
					"WriteCapacityUnits": 1
				}
			}
		], "schema": {"id": String, "name": {"type": String, "index": {"global": true}}}, "output": []},
		{"input": [
			{
				"IndexName": "nameGlobalIndex2",
				"KeySchema": [
					{
						"AttributeName": "name",
						"KeyType": "HASH"
					}
				],
				"Projection": {
					"ProjectionType": "ALL"
				},
				"ProvisionedThroughput": {
					"ReadCapacityUnits": 1,
					"WriteCapacityUnits": 1
				}
			}
		], "schema": {"id": String, "name": {"type": String, "index": {"global": true}}}, "output": [
			{
				"name": "nameGlobalIndex2",
				"type": "delete"
			},
			{
				"spec": {
					"IndexName": "nameGlobalIndex",
					"KeySchema": [
						{
							"AttributeName": "name",
							"KeyType": "HASH"
						}
					],
					"Projection": {
						"ProjectionType": "ALL"
					},
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					}
				},
				"type": "add"
			}
		]},
		{"input": [
			{
				"IndexName": "nameGlobalIndex2",
				"KeySchema": [
					{
						"AttributeName": "name",
						"KeyType": "HASH"
					}
				],
				"Projection": {
					"ProjectionType": "ALL"
				},
				"ProvisionedThroughput": {
					"ReadCapacityUnits": 1,
					"WriteCapacityUnits": 1
				}
			}
		], "schema": {"id": String, "name": {"type": String}}, "output": [
			{
				"name": "nameGlobalIndex2",
				"type": "delete"
			}
		]},
	];

	tests.forEach((test) => {
		it(`Should return ${JSON.stringify(test.output)} for ${test.input}`, async() => {
			const Model = dynamoose.model("Model", test.schema, {"create": false, "waitForActive": false, "update": false});
			expect(await utils.dynamoose.index_changes(Model.Model, test.input)).to.eql(test.output);
		});
	});
});
