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

			describe("clientRequestToken and retry", () => {
				const canceled = (codes) => Object.assign(new Error("Transaction cancelled"), {"name": "TransactionCanceledException", "CancellationReasons": codes.map((Code) => ({Code}))});
				let writeParams;
				const mockAWS = (results) => {
					writeParams = [];
					dynamoose.aws.ddb.set({
						"transactWriteItems": (params) => {
							writeParams.push(params);
							const result = results[Math.min(writeParams.length, results.length) - 1];
							return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
						}
					});
				};
				let User;
				beforeEach(() => {
					User = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("Table", [User]);
				});

				it("Should send the clientRequestToken", async () => {
					mockAWS([{}]);
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"clientRequestToken": "token-1"});
					expect(writeParams[0].ClientRequestToken).toEqual("token-1");
				});

				it("Should include the clientRequestToken in the request", async () => {
					const request = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"clientRequestToken": "token-1", "return": "request"});
					expect(request.ClientRequestToken).toEqual("token-1");
				});

				it("Should throw an error for a clientRequestToken on a get transaction", () => {
					return expect(callType.func(dynamoose.transaction)([User.transaction.get({"id": 1})], {"clientRequestToken": "token-1"})).rejects.toEqual(new CustomError.InvalidParameter("clientRequestToken can only be used with a write transaction."));
				});

				it("Should throw an error for a clientRequestToken with the type set to get", () => {
					return expect(callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"clientRequestToken": "token-1", "type": "get"})).rejects.toEqual(new CustomError.InvalidParameter("clientRequestToken can only be used with a write transaction."));
				});

				it("Should send the clientRequestToken with the type set to write", async () => {
					mockAWS([{}]);
					await callType.func(dynamoose.transaction)([User.transaction.get({"id": 1})], {"clientRequestToken": "token-1", "type": "write"});
					expect(writeParams[0].ClientRequestToken).toEqual("token-1");
				});

				it("Should throw an error for an invalid clientRequestToken", () => {
					return expect(callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"clientRequestToken": ""})).rejects.toEqual(new CustomError.InvalidParameter("clientRequestToken must be a string of 1 to 36 characters."));
				});

				it("Should retry a transaction canceled by a conflict, with the same request", async () => {
					mockAWS([canceled(["None", "TransactionConflict"]), {}]);
					const result = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"}), User.transaction.update({"id": 2}, {"name": "Tim"})], {"retry": {"attempts": 2, "delay": 0}, "clientRequestToken": "token-1"});
					expect(result).toEqual(null);
					expect(writeParams.length).toEqual(2);
					expect(writeParams[1]).toEqual(writeParams[0]);
				});

				it("Should retry a TransactionInProgressException", async () => {
					mockAWS([Object.assign(new Error("in progress"), {"name": "TransactionInProgressException"}), {}]);
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1, "delay": 0}});
					expect(writeParams.length).toEqual(2);
				});

				it("Should send a TransactionInProgressException retry with the token of the first attempt", async () => {
					mockAWS([Object.assign(new Error("in progress"), {"name": "TransactionInProgressException"}), {}]);
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1, "delay": 0}});
					expect(writeParams[0].ClientRequestToken).toMatch(/^[0-9a-f-]{36}$/);
					expect(writeParams[1].ClientRequestToken).toEqual(writeParams[0].ClientRequestToken);
				});

				it("Should send a conflict retry with a new token when the caller passed none", async () => {
					mockAWS([canceled(["TransactionConflict"]), {}]);
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1, "delay": 0}});
					expect(writeParams[0].ClientRequestToken).toMatch(/^[0-9a-f-]{36}$/);
					expect(writeParams[1].ClientRequestToken).toMatch(/^[0-9a-f-]{36}$/);
					expect(writeParams[1].ClientRequestToken).not.toEqual(writeParams[0].ClientRequestToken);
				});

				it("Should not add a token without retry, or to the request", async () => {
					mockAWS([{}]);
					await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})]);
					expect(writeParams[0].ClientRequestToken).toBeUndefined();
					const request = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1}, "return": "request"});
					expect(request.ClientRequestToken).toBeUndefined();
				});

				it("Should throw the last error once the attempts are used up", async () => {
					const error = canceled(["TransactionConflict"]);
					mockAWS([error]);
					const result = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 2, "delay": 0}}).catch((e) => e);
					expect(result).toBe(error);
					expect(writeParams.length).toEqual(3);
				});

				[["a failed condition", canceled(["ConditionalCheckFailed"])], ["another error", Object.assign(new Error("bad"), {"name": "ValidationException"})]].forEach(([label, error]) => {
					it(`Should not retry ${label}`, async () => {
						mockAWS([error, {}]);
						const result = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 3, "delay": 0}}).catch((e) => e);
						expect(result).toBe(error);
						expect(writeParams.length).toEqual(1);
					});
				});

				[["a cancellation without reasons", Object.assign(new Error("Transaction cancelled"), {"name": "TransactionCanceledException"})]].forEach(([label, error]) => {
					it(`Should not retry ${label}`, async () => {
						writeParams = [];
						dynamoose.aws.ddb.set({
							"transactWriteItems": (params) => {
								writeParams.push(params);
								return writeParams.length === 1 ? Promise.reject(error) : Promise.resolve({});
							}
						});
						const result = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 3, "delay": 0}}).catch((e) => e);
						expect(result).toBe(error);
						expect(writeParams.length).toEqual(1);
					});
				});

				it("Should wait up to 100 milliseconds before the first retry by default", async () => {
					mockAWS([canceled(["TransactionConflict"]), {}]);
					const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
					try {
						const start = Date.now();
						await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1}});
						expect(Date.now() - start).toBeGreaterThanOrEqual(45);
						expect(writeParams.length).toEqual(2);
					} finally {
						random.mockRestore();
					}
				});

				it("Should not retry without the retry setting", async () => {
					const error = canceled(["TransactionConflict"]);
					mockAWS([error, {}]);
					const result = await callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})]).catch((e) => e);
					expect(result).toBe(error);
					expect(writeParams.length).toEqual(1);
				});

				it("Should throw an error for an invalid retry", () => {
					return expect(callType.func(dynamoose.transaction)([User.transaction.create({"id": 1, "name": "Bob"})], {"retry": {"attempts": 1.5}})).rejects.toEqual(new CustomError.InvalidParameter("retry.attempts must be a whole number of 0 or more, and retry.delay a number of milliseconds of 0 or more."));
				});

				it("Should retry a get transaction canceled by a conflict", async () => {
					let calls = 0;
					dynamoose.aws.ddb.set({
						"transactGetItems": () => ++calls === 1 ? Promise.reject(canceled(["TransactionConflict"])) : Promise.resolve({"Responses": [{"Item": {"id": {"N": "1"}, "name": {"S": "Bob"}}}]})
					});
					const result = await callType.func(dynamoose.transaction)([User.transaction.get({"id": 1})], {"retry": {"attempts": 1, "delay": 0}});
					expect(calls).toEqual(2);
					expect(result.map((item) => item.toJSON())).toEqual([{"id": 1, "name": "Bob"}]);
				});
			});
		});
	});
});
