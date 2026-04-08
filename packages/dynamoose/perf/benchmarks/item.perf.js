const {runSuite} = require("../harness");
const {Item} = require("../../dist/Item");

async function run () {
	await runSuite("item", (bench) => {
		// Item.objectToDynamo benchmarks
		bench.add("Item.objectToDynamo - simple object", () => {
			Item.objectToDynamo({"id": "123", "name": "John", "age": 30});
		});

		bench.add("Item.objectToDynamo - medium object (10 fields)", () => {
			Item.objectToDynamo({
				"id": "123",
				"name": "John Doe",
				"age": 30,
				"email": "john@example.com",
				"isActive": true,
				"score": 95.5,
				"loginCount": 42,
				"bio": "A test user for benchmarking purposes",
				"status": "active",
				"role": "admin"
			});
		});

		bench.add("Item.objectToDynamo - nested object", () => {
			Item.objectToDynamo({
				"id": "123",
				"name": "John",
				"address": {
					"street": "123 Main St",
					"city": "Anytown",
					"state": "CA",
					"zip": "12345"
				},
				"metadata": {
					"source": "api",
					"version": 2
				}
			});
		});

		bench.add("Item.objectToDynamo - with arrays", () => {
			Item.objectToDynamo({
				"id": "123",
				"name": "John",
				"tags": ["admin", "user", "premium"],
				"scores": [95, 87, 92, 88, 91]
			});
		});

		const largeDynamoObject = {};
		for (let i = 0; i < 50; i++) {
			largeDynamoObject[`field${i}`] = `value${i}`;
		}
		largeDynamoObject.id = "123";
		bench.add("Item.objectToDynamo - large object (50 fields)", () => {
			Item.objectToDynamo(largeDynamoObject);
		});

		// Item.fromDynamo benchmarks
		bench.add("Item.fromDynamo - simple DynamoDB object", () => {
			Item.fromDynamo({
				"id": {"S": "123"},
				"name": {"S": "John"},
				"age": {"N": "30"}
			});
		});

		bench.add("Item.fromDynamo - medium DynamoDB object (10 fields)", () => {
			Item.fromDynamo({
				"id": {"S": "123"},
				"name": {"S": "John Doe"},
				"age": {"N": "30"},
				"email": {"S": "john@example.com"},
				"isActive": {"BOOL": true},
				"score": {"N": "95.5"},
				"loginCount": {"N": "42"},
				"bio": {"S": "A test user"},
				"status": {"S": "active"},
				"role": {"S": "admin"}
			});
		});

		bench.add("Item.fromDynamo - nested DynamoDB object", () => {
			Item.fromDynamo({
				"id": {"S": "123"},
				"name": {"S": "John"},
				"address": {
					"M": {
						"street": {"S": "123 Main St"},
						"city": {"S": "Anytown"},
						"state": {"S": "CA"},
						"zip": {"S": "12345"}
					}
				}
			});
		});

		// Item.isDynamoObject benchmarks
		bench.add("Item.isDynamoObject - valid DynamoDB object", () => {
			Item.isDynamoObject({
				"id": {"S": "123"},
				"name": {"S": "John"},
				"age": {"N": "30"}
			});
		});

		bench.add("Item.isDynamoObject - plain JS object", () => {
			Item.isDynamoObject({
				"id": "123",
				"name": "John",
				"age": 30
			});
		});
	});
}

module.exports = run;
