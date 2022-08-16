const utils = require("../../../dist/utils").default;
const dynamoose = require("../../../dist");

describe("utils.dynamoose.index_changes", () => {
	it("Should be a function", () => {
		expect(utils.dynamoose.index_changes).toBeInstanceOf(Function);
	});

	const tests = [
		{"input": [], "schema": {"id": String, "name": {"type": String, "index": {"type": "global"}}}, "output": [
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
		], "schema": {"id": String, "name": {"type": String, "index": {"type": "global"}}}, "output": []},
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
		], "schema": {"id": String, "name": {"type": String, "index": {"type": "global"}}}, "output": [
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
		{
			"input": [],
			"schema": [{"id": String, "data1": String, "data": {"type": String, "index": {"type": "global", "rangeKey": "data1"}}}, {"id": String, "data2": String, "data": {"type": String, "index": {"type": "global", "rangeKey": "data2"}}}],
			"output": [
				{
					"spec": {
						"IndexName": "dataGlobalIndex",
						"KeySchema": [
							{
								"AttributeName": "data",
								"KeyType": "HASH"
							},
							{
								"AttributeName": "data1",
								"KeyType": "RANGE"
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
				},
				{
					"spec": {
						"IndexName": "dataGlobalIndex",
						"KeySchema": [
							{
								"AttributeName": "data",
								"KeyType": "HASH"
							},
							{
								"AttributeName": "data2",
								"KeyType": "RANGE"
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
			]
		},
		{
			"input": [
				{
					"IndexName": "data-index-1",
					"KeySchema": [
						{
							"AttributeName": "data",
							"KeyType": "HASH"
						}
					],
					"Projection": {
						"ProjectionType": "ALL"
					},
					"IndexStatus": "ACTIVE",
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"IndexSizeBytes": 0,
					"ItemCount": 0,
					"IndexArn": "arn:aws:dynamodb:ddblocal:000000000000:table/User/index/data-index-1"
				}
			],
			"schema": {"id": String, "data": {"type": String, "index": {"name": "data-index-1", "type": "global", "project": true}}},
			"output": []
		},
		{
			"input": [
				{
					"IndexName": "data-index-1",
					"KeySchema": [
						{
							"AttributeName": "data",
							"KeyType": "HASH"
						}
					],
					"Projection": {
						"ProjectionType": "ALL"
					},
					"IndexStatus": "ACTIVE",
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1,
						"Random": undefined
					},
					"IndexSizeBytes": 0,
					"ItemCount": 0,
					"IndexArn": "arn:aws:dynamodb:ddblocal:000000000000:table/User/index/data-index-1"
				}
			],
			"schema": {"id": String, "data": {"type": String, "index": {"name": "data-index-1", "type": "global", "project": true}}},
			"output": []
		}
	];

	tests.forEach((test) => {
		it(`Should return ${JSON.stringify(test.output)} for ${test.input}`, async () => {
			const Model = dynamoose.model("Model", test.schema);
			const table = new dynamoose.Table("Table", [Model], {"create": false, "waitForActive": false, "update": false});
			expect(await utils.dynamoose.index_changes(table, test.input)).toEqual(test.output);
		});
	});
});
