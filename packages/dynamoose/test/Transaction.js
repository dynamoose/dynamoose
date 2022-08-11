const dynamoose = require("../dist");
const util = require("util");
const ModelStore = require("../dist/ModelStore").default;
const CustomError = require("../dist/Error").default;

describe("Transaction", () => {
	it("Should be a function", () => {
		expect(dynamoose.transaction).toBeInstanceOf(Function);
	});

	const functionCallTypes = [
		{"name": "Promise", "func": (func) => func},
		{"name": "Callback", "func": (func) => util.promisify(func)}
	];
	functionCallTypes.forEach((callType) => {
		describe(callType.name, () => {
			beforeEach(() => {
				dynamoose.Table.defaults.set({
					"create": false,
					"waitForActive": false
				});
			});
			afterEach(() => {
				dynamoose.Table.defaults.set({});
				dynamoose.aws.ddb.revert();
				ModelStore.clear();
			});

			it("Should throw an error if nothing passed in", () => {
				return expect(callType.func(dynamoose.transaction)()).rejects.toEqual(new CustomError.InvalidParameter("You must pass in an array with items for the transactions parameter."));
			});

			it("Should throw an error if empty array passed in", () => {
				return expect(callType.func(dynamoose.transaction)([])).rejects.toEqual(new CustomError.InvalidParameter("You must pass in an array with items for the transactions parameter."));
			});

			it("Should return request if return setting is set to request", () => {
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "User"}}], {"return": "request"})).resolves.toEqual({
					"TransactItems": [
						{
							"Get": {
								"Key": {
									"id": {"N": "1"}
								},
								"TableName": "User"
							}
						}
					]
				});
			});

			it("Should throw error if invalid custom type passed in", () => {
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "User"}}], {"type": "random"})).rejects.toEqual(new CustomError.InvalidParameter("Invalid type option, please pass in \"get\" or \"write\"."));
			});

			it("Should throw error if model hasn't been created", () => {
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "User"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Credit"}}])).rejects.toEqual(new CustomError.InvalidParameter("Table \"User\" not found. Please register the table with dynamoose before using it in transactions."));
			});

			it("Should not throw error if table hasn't been created", () => {
				const ddb = {
					"transactGetItems": () => {
						return Promise.resolve({});
					}
				};
				dynamoose.aws.ddb.set(ddb);

				dynamoose.model("User", {"id": Number, "name": String});
				dynamoose.model("Credit", {"id": Number, "name": String});
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "User"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Credit"}}])).resolves.toEqual(null);
			});

			it("Should throw error if using different instances for each table", () => {
				const InstanceA = new dynamoose.Instance();
				const InstanceB = new dynamoose.Instance();

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new InstanceA.Table("Table", [User]);
				new InstanceB.Table("TableB", [Credit]);

				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "TableB"}}])).rejects.toEqual(new CustomError.InvalidParameter("You must use a single Dynamoose instance for all tables in a transaction."));
			});

			it("Should not throw error if using same custom instance for multiple tables", () => {
				const ddb = {
					"transactGetItems": () => {
						return Promise.resolve({});
					}
				};

				const Instance = new dynamoose.Instance();

				Instance.aws.ddb.set(ddb);

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new Instance.Table("Table", [User]);
				new Instance.Table("TableB", [Credit]);

				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "TableB"}}])).resolves.toEqual(null);
			});

			it("Should not throw error if using custom instance", () => {
				const ddb = {
					"transactGetItems": () => {
						return Promise.resolve({});
					}
				};

				const Instance = new dynamoose.Instance();

				Instance.aws.ddb.set(ddb);

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new Instance.Table("Table", [User, Credit]);

				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}])).resolves.toEqual(null);
			});

			it("Should send correct parameters to AWS", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactGetItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]);
				expect(transactParams).toEqual({
					"TransactItems": [
						{
							"Get": {
								"Key": {
									"id": {"N": "1"}
								},
								"TableName": "Table"
							}
						},
						{
							"Get": {
								"Key": {
									"id": {"N": "2"}
								},
								"TableName": "Table"
							}
						}
					]
				});
			});

			it("Should use correct models when getting transaction for multiple models", async () => {
				dynamoose.aws.ddb.set({
					"transactGetItems": () => {
						return Promise.resolve({
							"Responses": [
								{
									"Item": {
										"id": {"N": "1"},
										"name": {"S": "John"}
									}
								},
								{
									"Item": {
										"id": {"N": "2"},
										"amount": {"N": "100"}
									}
								}
							]
						});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "amount": Number});
				new dynamoose.Table("Table", [User, Credit]);
				const items = await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]);
				expect(items.length).toEqual(2);
				expect(items[0].constructor.name).toEqual("User");
				expect(items[0].toJSON()).toEqual({
					"id": 1,
					"name": "John"
				});
				expect(items[1].constructor.name).toEqual("Credit");
				expect(items[1].toJSON()).toEqual({
					"id": 2,
					"amount": 100
				});
			});

			it("Should send correct parameters to AWS for put items", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactWriteItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				await callType.func(dynamoose.transaction)([{"Put": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Put": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]);
				expect(transactParams).toEqual({
					"TransactItems": [
						{
							"Put": {
								"Key": {
									"id": {"N": "1"}
								},
								"TableName": "Table"
							}
						},
						{
							"Put": {
								"Key": {
									"id": {"N": "2"}
								},
								"TableName": "Table"
							}
						}
					]
				});
			});

			it("Should use correct response from AWS", async () => {
				dynamoose.aws.ddb.set({
					"transactGetItems": () => Promise.resolve({"Responses": [{"Item": {"id": {"N": "1"}, "name": {"S": "Bob"}}}, {"Item": {"id": {"N": "2"}, "name": {"S": "My Credit"}}}]})
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]);
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]).then((res) => res.map((a) => ({...a})))).resolves.toEqual([
					{"id": 1, "name": "Bob"},
					{"id": 2, "name": "My Credit"}
				]);
			});

			it("Should return null if no response from AWS", () => {
				dynamoose.aws.ddb.set({
					"transactGetItems": () => Promise.resolve({})
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				return expect(callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}])).resolves.toEqual(null);
			});

			it("Should send correct parameters to AWS for custom type of write", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactWriteItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				await callType.func(dynamoose.transaction)([{"Put": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Put": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}], {"type": "write"});
				expect(transactParams).toBeInstanceOf(Object);
			});

			it("Should send correct parameters to AWS for custom type of get", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactGetItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit]);
				await callType.func(dynamoose.transaction)([{"Put": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Put": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}], {"type": "get"});
				expect(transactParams).toBeInstanceOf(Object);
			});
		});
	});
});
