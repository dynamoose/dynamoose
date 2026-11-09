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

			it("Should send correct parameters to AWS with Prefix and Suffix", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactGetItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit], {"prefix": "MyApp_", "suffix": "_Table"});
				await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "MyApp_Table_Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "MyApp_Table_Table"}}]);
				expect(transactParams).toEqual({
					"TransactItems": [
						{
							"Get": {
								"Key": {
									"id": {"N": "1"}
								},
								"TableName": "MyApp_Table_Table"
							}
						},
						{
							"Get": {
								"Key": {
									"id": {"N": "2"}
								},
								"TableName": "MyApp_Table_Table"
							}
						}
					]
				});
			});

			it("Should send correct parameters to AWS by using the Model.transaction methods with Prefix", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactGetItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit], {"prefix": "MyApp_"});
				await callType.func(dynamoose.transaction)([User.transaction.get(1), Credit.transaction.get(2)]);
				expect(transactParams).toEqual({
					"TransactItems": [
						{
							"Get": {
								"Key": {
									"id": {"N": "1"}
								},
								"TableName": "MyApp_Table"
							}
						},
						{
							"Get": {
								"Key": {
									"id": {"N": "2"}
								},
								"TableName": "MyApp_Table"
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

			it("Should return undefined for an item that does not exist", async () => {
				dynamoose.aws.ddb.set({
					"transactGetItems": () => Promise.resolve({
						"Responses": [
							{
								"Item": {
									"id": {"N": "1"},
									"name": {"S": "John"}
								}
							},
							{}
						]
					})
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User]);
				const items = await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}, {"Get": {"Key": {"id": {"N": "2"}}, "TableName": "Table"}}]);
				expect(items.length).toEqual(2);
				expect(items[0].toJSON()).toEqual({"id": 1, "name": "John"});
				expect(items[1]).toEqual(undefined);
			});

			it("Should apply get modifiers to items returned from AWS", async () => {
				dynamoose.aws.ddb.set({
					"transactGetItems": () => Promise.resolve({"Responses": [{"Item": {"id": {"N": "1"}, "name": {"S": "Bob"}}}]})
				});

				const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "get": (val) => `${val}-get`}});
				new dynamoose.Table("Table", [User]);
				const items = await callType.func(dynamoose.transaction)([{"Get": {"Key": {"id": {"N": "1"}}, "TableName": "Table"}}]);
				expect(items[0].toJSON()).toEqual({
					"id": 1,
					"name": "Bob-get"
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

			it("Should send correct parameters to AWS for put items by using the Model.transaction methods with Suffix", async () => {
				let transactParams = {};
				dynamoose.aws.ddb.set({
					"transactWriteItems": (params) => {
						transactParams = params;
						return Promise.resolve({});
					}
				});

				const User = dynamoose.model("User", {"id": Number, "name": String});
				const Credit = dynamoose.model("Credit", {"id": Number, "name": String});
				new dynamoose.Table("Table", [User, Credit], {"suffix": "_Table"});
				await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1}), Credit.transaction.create({"id": 2})]);
				expect(transactParams).toEqual({
					"TransactItems": [
						{
							"Put": {
								"ConditionExpression": "attribute_not_exists(#__hash_key)",
								"ExpressionAttributeNames": {
									"#__hash_key": "id"
								},
								"Item": {
									"id": {"N": "1"}
								},
								"TableName": "Table_Table"
							}
						},
						{
							"Put": {
								"ConditionExpression": "attribute_not_exists(#__hash_key)",
								"ExpressionAttributeNames": {
									"#__hash_key": "id"
								},
								"Item": {
									"id": {"N": "2"}
								},
								"TableName": "Table_Table"
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

			describe("returnItems", () => {
				let writeParams, getParams;
				const mockAWS = (getResult) => {
					writeParams = [];
					getParams = [];
					dynamoose.aws.ddb.set({
						"transactWriteItems": (params) => {
							writeParams.push(params);
							return Promise.resolve({});
						},
						"transactGetItems": (params) => {
							getParams.push(params);
							return typeof getResult === "function" ? getResult(params) : Promise.resolve(getResult);
						}
					});
				};

				it("Should return the item written by a create without reading it back", async () => {
					mockAWS({"Responses": []});
					const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "get": (value) => value.toUpperCase()}});
					new dynamoose.Table("Table", [User]);
					const items = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"returnItems": true});
					expect(writeParams.length).toEqual(1);
					expect(getParams).toEqual([]);
					expect(items.length).toEqual(1);
					expect(items[0].constructor.name).toEqual("User");
					expect(items[0].toJSON()).toEqual({"id": 1, "name": "BOB"});
				});

				it("Should read back only the updated items, in one call, and keep the order of the request", async () => {
					mockAWS({"Responses": [{"Item": {"id": {"N": "2"}, "name": {"S": "Tim"}, "balance": {"N": "15"}}}]});
					const User = dynamoose.model("User", {"id": Number, "name": String, "balance": Number});
					new dynamoose.Table("Table", [User]);
					const items = await callType.func(dynamoose.transaction)([
						User.transaction.create({"id": 1, "name": "Bob", "balance": 0}),
						User.transaction.update({"id": 2}, {"$ADD": {"balance": 5}}),
						User.transaction.delete({"id": 3}),
						User.transaction.condition({"id": 4}, new dynamoose.Condition("balance").gt(0))
					], {"returnItems": true});
					expect(getParams).toEqual([{"TransactItems": [{"Get": {"TableName": "Table", "Key": {"id": {"N": "2"}}}}]}]);
					expect(items.length).toEqual(4);
					expect(items[0].toJSON()).toEqual({"id": 1, "name": "Bob", "balance": 0});
					expect(items[1].toJSON()).toEqual({"id": 2, "name": "Tim", "balance": 15});
					expect(items[2]).toEqual(undefined);
					expect(items[3]).toEqual(undefined);
				});

				it("Should not read anything back when no item was updated", async () => {
					mockAWS({"Responses": []});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					const items = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"}), User.transaction.delete({"id": 2})], {"returnItems": true});
					expect(getParams).toEqual([]);
					expect(items[0].toJSON()).toEqual({"id": 1, "name": "Bob"});
					expect(items[1]).toEqual(undefined);
				});

				it("Should use the model that built each request when several models fit the item", async () => {
					mockAWS({"Responses": [{"Item": {"id": {"N": "2"}, "name": {"S": "quiet"}}}]});
					const Plain = dynamoose.model("Plain", {"id": Number, "name": String});
					const Shouty = dynamoose.model("Shouty", {"id": Number, "name": {"type": String, "get": (value) => value.toUpperCase()}});
					new dynamoose.Table("Table", [Plain, Shouty]);
					const items = await callType.func(dynamoose.transaction)([Shouty.transaction.create({"id": 1, "name": "quiet"}), Shouty.transaction.update({"id": 2}, {"name": "quiet"})], {"returnItems": true});
					expect(items.map((item) => item.constructor.name)).toEqual(["Shouty", "Shouty"]);
					expect(items.map((item) => item.name)).toEqual(["QUIET", "QUIET"]);
				});

				it("Should find the model from the item for requests not built by a model", async () => {
					mockAWS({"Responses": [{"Item": {"id": {"N": "2"}, "amount": {"N": "100"}}}]});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					const Credit = dynamoose.model("Credit", {"id": Number, "amount": Number});
					new dynamoose.Table("Table", [User, Credit]);
					const items = await callType.func(dynamoose.transaction)([
						{"Put": {"Item": {"id": {"N": "1"}, "name": {"S": "Bob"}}, "TableName": "Table"}},
						{"Update": {"Key": {"id": {"N": "2"}}, "TableName": "Table", "UpdateExpression": "SET #a = :a", "ExpressionAttributeNames": {"#a": "amount"}, "ExpressionAttributeValues": {":a": {"N": "100"}}}}
					], {"returnItems": true});
					expect(items[0].constructor.name).toEqual("User");
					expect(items[0].toJSON()).toEqual({"id": 1, "name": "Bob"});
					expect(items[1].constructor.name).toEqual("Credit");
					expect(items[1].toJSON()).toEqual({"id": 2, "amount": 100});
				});

				it("Should return undefined for an updated item that no longer exists when read back", async () => {
					mockAWS({"Responses": [{}]});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					const items = await callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})], {"returnItems": true});
					expect(items).toEqual([undefined]);
				});

				it("Should reject with a TransactionReadError that says the write was committed when reading back fails", async () => {
					const failure = Object.assign(new Error("Rate exceeded"), {"name": "ProvisionedThroughputExceededException"});
					mockAWS(() => Promise.reject(failure));
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					let error;
					try {
						await callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})], {"returnItems": true});
					} catch (e) {
						error = e;
					}
					expect(writeParams.length).toEqual(1);
					expect(error).toBeInstanceOf(CustomError.TransactionReadError);
					expect(error.name).toEqual("TransactionReadError");
					expect(error.committed).toEqual(true);
					expect(error.cause).toBe(failure);
					expect(error.message).toEqual("The transaction was written, but returning the written items failed: Rate exceeded");
				});

				it("Should reject with a TransactionReadError when reading back fails with a value that is not an error", async () => {
					mockAWS(() => Promise.reject("timeout"));
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					const error = await callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})], {"returnItems": true}).catch((e) => e);
					expect(error.name).toEqual("TransactionReadError");
					expect(error.cause).toEqual("timeout");
					expect(error.message).toEqual("The transaction was written, but returning the written items failed");
				});

				it("Should reject with a TransactionReadError when building a written item fails", async () => {
					mockAWS({"Responses": [{"Item": {"id": {"N": "2"}, "secret": {"S": "boom"}}}]});
					const User = dynamoose.model("User", {"id": Number, "secret": {"type": String, "get": (value) => {
						if (value === "boom") {
							throw new Error("get failed");
						}
						return value;
					}}});
					new dynamoose.Table("Table", [User]);
					const createError = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "secret": "boom"})], {"returnItems": true}).catch((e) => e);
					const updateError = await callType.func(dynamoose.transaction)([User.transaction.update({"id": 2}, {"secret": "boom"})], {"returnItems": true}).catch((e) => e);
					expect(writeParams.length).toEqual(2);
					[createError, updateError].forEach((error) => {
						expect(error.name).toEqual("TransactionReadError");
						expect(error.committed).toEqual(true);
						expect(error.cause.message).toEqual("get failed");
					});
				});

				it("Should return written items whose expiry time has passed", async () => {
					const past = Math.floor(Date.now() / 1000) - 60;
					mockAWS({"Responses": [{"Item": {"id": {"N": "2"}, "ttl": {"N": `${past}`}}}]});
					const User = dynamoose.model("User", {"id": Number});
					new dynamoose.Table("Table", [User], {"expires": {"ttl": 1000, "attribute": "ttl", "items": {"returnExpired": false}}});
					const items = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "ttl": new Date(past * 1000)}), User.transaction.update({"id": 2}, {"ttl": new Date(past * 1000)})], {"returnItems": true});
					expect(items.map((item) => item && item.id)).toEqual([1, 2]);
				});

				it("Should not read anything back when the write fails", async () => {
					const failure = Object.assign(new Error("Transaction cancelled"), {"name": "TransactionCanceledException"});
					writeParams = [];
					getParams = [];
					dynamoose.aws.ddb.set({
						"transactWriteItems": () => Promise.reject(failure),
						"transactGetItems": (params) => {
							getParams.push(params);
							return Promise.resolve({"Responses": []});
						}
					});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					await expect(callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})], {"returnItems": true})).rejects.toBe(failure);
					expect(getParams).toEqual([]);
				});

				it("Should throw an error when used with return set to request", () => {
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					return expect(callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})], {"return": "request", "returnItems": true})).rejects.toEqual(new CustomError.InvalidParameter("returnItems can't be used when return is set to request, because no request is sent to DynamoDB."));
				});

				it("Should return the same items for a get transaction as without returnItems", async () => {
					mockAWS({"Responses": [{"Item": {"id": {"N": "1"}, "name": {"S": "Bob"}}}]});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					const items = await callType.func(dynamoose.transaction)([User.transaction.get({"id": 1})], {"returnItems": true});
					expect(writeParams).toEqual([]);
					expect(items.map((item) => item.toJSON())).toEqual([{"id": 1, "name": "Bob"}]);
				});

				it("Should not change the request sent to DynamoDB", async () => {
					mockAWS({"Responses": []});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					const request = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"return": "request"});
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"returnItems": true});
					expect(writeParams).toEqual([request]);
					expect(Object.keys(writeParams[0].TransactItems[0])).toEqual(["Put"]);
				});

				it("Should resolve null for a write transaction without returnItems", async () => {
					mockAWS({"Responses": []});
					const User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
					expect(await callType.func(dynamoose.transaction)([User.transaction.update({"id": 1}, {"name": "Bob"})])).toEqual(null);
					expect(getParams).toEqual([]);
				});
			});
		});
	});
});
