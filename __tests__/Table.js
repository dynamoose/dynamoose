const expectChai = require("chai").expect;
const dynamoose = require("../dist");
const Internal = require("../dist/Internal");
const utils = require("../dist/utils");
const CustomError = require("../dist/Error");
const {internalProperties} = Internal.General;
const util = require("util");

describe("Table", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
		dynamoose.aws.ddb.revert();
	});

	it("Should be a function", () => {
		expectChai(dynamoose.Table).to.be.a("function");
	});

	describe("Initialization", () => {
		it("Should throw an error if not using `new` keyword", () => {
			expectChai(() => dynamoose.Table()).to.throw("Class constructor Table cannot be invoked without 'new'");
		});

		it("Should throw an error if nothing passed in", () => {
			expectChai(() => new dynamoose.Table()).to.throw("Name must be passed into table constructor.");
		});

		it("Should throw an error if number passed in as first argument", () => {
			expectChai(() => new dynamoose.Table(1)).to.throw("Name passed into table constructor should be of type string.");
		});

		it("Should throw an error if nothing passed into second argument", () => {
			expectChai(() => new dynamoose.Table("Table")).to.throw("Models must be passed into table constructor.");
		});

		it("Should throw an error if number passed into second argument", () => {
			expectChai(() => new dynamoose.Table("Table", 1)).to.throw("Models passed into table constructor should be an array of models.");
		});

		it("Should throw an error if array of strings passed into second arguemnt", () => {
			expectChai(() => new dynamoose.Table("Table", ["hello", "world"])).to.throw("Models passed into table constructor should be an array of models.");
		});

		it("Should throw an error if empty array passed into second arguemnt", () => {
			expectChai(() => new dynamoose.Table("Table", [])).to.throw("Models passed into table constructor should be an array of models.");
		});

		it("Should throw an error if model passed in is already assigned to table", () => {
			const model = dynamoose.model("User", {"id": String});
			new dynamoose.Table("Table", [model]);
			expectChai(() => new dynamoose.Table("Table", [model])).to.throw("Model User has already been assigned to a table.");
		});

		it("Should throw an error if models passed in with different hashKey's", () => {
			const model = dynamoose.model("User", {"id": String});
			const model2 = dynamoose.model("Movie", {"_id": String});
			expectChai(() => new dynamoose.Table("Table", [model, model2])).to.throw("hashKey's for all models must match.");
		});

		it("Should throw an error if models passed in with different rangeKey's", () => {
			const model = dynamoose.model("User", {"id": String, "name": {"type": String, "rangeKey": true}});
			const model2 = dynamoose.model("Movie", {"id": String, "date": {"type": Date, "rangeKey": true}});
			expectChai(() => new dynamoose.Table("Table", [model, model2])).to.throw("rangeKey's for all models must match.");
		});

		it("Should succeed if constructing table correctly", () => {
			new dynamoose.Table("Table", [dynamoose.model("User", {"id": String})], {"create": false, "waitForActive": false});
			expectChai(() => new dynamoose.Table("Table", [dynamoose.model("User", {"id": String})], {"create": false, "waitForActive": false})).to.not.throw();
		});

		describe("Prefixes and Suffixes", () => {
			const optionsB = [
				{"name": "Prefix", "value": "prefix", "check": (val, result) => expectChai(result).to.match(new RegExp(`^${val}`))},
				{"name": "Suffix", "value": "suffix", "check": (val, result) => expectChai(result).to.match(new RegExp(`${val}$`))}
			];
			const optionsC = [
				{"name": "Defaults", "func": (type, value, ...args) => {
					dynamoose.Table.defaults.set({...dynamoose.Table.defaults.get(), [type]: value});
					const model = dynamoose.model(...args);
					return new dynamoose.Table(args[0], [model]);
				}},
				{"name": "Options", "func": (type, value, ...args) => new dynamoose.Table(args[0], [dynamoose.model(...args)], {[type]: value})}
			];
			optionsB.forEach((optionB) => {
				describe(optionB.name, () => {
					optionsC.forEach((optionC) => {
						describe(optionC.name, () => {
							it("Should result in correct table name", () => {
								const extension = "MyApp";
								const tableName = "Users";
								const table = optionC.func(optionB.value, extension, tableName, {"id": String});
								expectChai(table.name).to.include(extension);
								expectChai(table.name).to.not.eql(tableName);
							});
						});
					});
				});
			});
		});

		describe("Table.ready", () => {
			it("Should not be ready to start", () => {
				const Model = dynamoose.model("Cat", {"id": String});
				const Table = new dynamoose.Table("Cat", [Model], {"create": false});
				expectChai(Table.getInternalProperties(internalProperties).ready).to.be.false;
			});

			it("Should set ready after setup flow", async () => {
				const Model = dynamoose.model("Cat", {"id": String});
				const Table = new dynamoose.Table("Cat", [Model], {"create": false, "waitForActive": false});
				await utils.set_immediate_promise();
				expectChai(Table.getInternalProperties(internalProperties).ready).to.be.true;
			});

			it("Should resolve pendingTaskPromises after model is ready", async () => {
				let describeTableResponse = {
					"Table": {"TableStatus": "CREATING"}
				};
				dynamoose.aws.ddb.set({
					"describeTable": () => Promise.resolve(describeTableResponse)
				});
				const Model = dynamoose.model("Cat", {"id": String});
				const Table = new dynamoose.Table("Cat", [Model], {"waitForActive": {"enabled": true, "check": {"frequency": 0}}});

				await utils.set_immediate_promise();

				let pendingTaskPromiseResolved = false;
				Table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

				await utils.set_immediate_promise();
				expectChai(pendingTaskPromiseResolved).to.be.false;

				describeTableResponse = {
					"Table": {"TableStatus": "ACTIVE"}
				};
				await Table.getInternalProperties(internalProperties).pendingTaskPromise();
				await utils.set_immediate_promise();
				expectChai(pendingTaskPromiseResolved).to.be.true;
				expectChai(Table.getInternalProperties(internalProperties).pendingTasks).to.eql([]);
			});

			it("Should immediately resolve pendingTaskPromises promise if table is already ready", async () => {
				const Model = dynamoose.model("Cat", {"id": String});
				const Table = new dynamoose.Table("Cat", [Model], {"create": false});
				await utils.set_immediate_promise();

				let pendingTaskPromiseResolved = false;
				Table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

				await utils.set_immediate_promise();

				expectChai(pendingTaskPromiseResolved).to.be.true;
			});
		});

		describe("Creation", () => {
			let createTableParams = null;
			beforeEach(() => {
				dynamoose.Table.defaults.set({
					"waitForActive": false
				});
			});
			beforeEach(() => {
				createTableParams = null;
				dynamoose.aws.ddb.set({
					"createTable": (params) => {
						createTableParams = params;
						return {
							"promise": () => Promise.resolve()
						};
					},
					"describeTable": () => ({"promise": () => Promise.resolve()})
				});
			});
			afterEach(() => {
				createTableParams = null;
				dynamoose.aws.ddb.revert();
			});

			it("Should call createTable with correct parameters", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters with capacity as number", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"throughput": 1});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters with capacity as object", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"throughput": {"read": 2, "write": 3}});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 2,
						"WriteCapacityUnits": 3
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters with capacity as ON_DEMAND", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"throughput": "ON_DEMAND"});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"BillingMode": "PAY_PER_REQUEST",
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters when tags are specified", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"tags": {"hello": "world"}});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"Tags": [
						{
							"Key": "hello",
							"Value": "world"
						}
					],
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters when multiple tags are specified", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"tags": {"hello": "world", "foo": "bar"}});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"Tags": [
						{
							"Key": "hello",
							"Value": "world"
						},
						{
							"Key": "foo",
							"Value": "bar"
						}
					],
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters when tableClass is undefined", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters when tableClass is standard", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"tableClass": "standard"});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters when tableClass is infrequent access", async () => {
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"tableClass": "infrequentAccess"});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql({
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
					],
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 1
					},
					"TableName": tableName,
					"TableClass": "STANDARD_INFREQUENT_ACCESS"
				});
			});

			it("Shouldn't call createTable if table already exists", async () => {
				dynamoose.aws.ddb.set({
					"createTable": (params) => {
						createTableParams = params;
						return Promise.resolve();
					},
					"describeTable": () => Promise.resolve({"Table": {"TableStatus": "ACTIVE"}})
				});

				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql(null);
			});

			it("Should not call createTable if create option set to false", async () => {
				const model = dynamoose.model("Cat", {"id": String});
				new dynamoose.Table("Cat", [model], {"create": false});
				await utils.set_immediate_promise();
				expectChai(createTableParams).to.eql(null);
			});

			it("Should bind request to function being called", async () => {
				let self;
				dynamoose.aws.ddb.set({
					"createTable": function (params) {
						createTableParams = params;
						self = this;
						return Promise.resolve();
					},
					"describeTable": () => Promise.resolve()
				});

				const model = dynamoose.model("Cat", {"id": String});
				new dynamoose.Table("Cat", [model]);
				await utils.set_immediate_promise();
				expectChai(self).to.be.an("object");
				expectChai(Object.keys(self)).to.eql(["createTable", "describeTable"]);
			});
		});

		describe("Wait For Active", () => {
			let describeTableParams = [], describeTableFunction, updateTableParams = [];
			beforeEach(() => {
				dynamoose.Table.defaults.set({
					"create": false,
					"waitForActive": {
						"enabled": true,
						"check": {
							"timeout": 10,
							"frequency": 1
						}
					}
				});
			});
			beforeEach(() => {
				describeTableParams = [];
				dynamoose.aws.ddb.set({
					"describeTable": (params) => {
						describeTableParams.push(params);
						return describeTableFunction(params);
					},
					"updateTable": (params) => {
						updateTableParams.push(params);
						return Promise.resolve();
					}
				});
			});
			afterEach(() => {
				describeTableParams = [];
				updateTableParams = [];
				describeTableFunction = null;
				dynamoose.aws.ddb.revert();
			});

			it("Should call describeTable with correct parameters", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"TableStatus": "ACTIVE"
					}
				});
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				await utils.set_immediate_promise();
				expectChai(describeTableParams).to.eql([{
					"TableName": tableName
				}]);
			});

			it("Should call describeTable with correct parameters multiple times", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"TableStatus": describeTableParams.length > 1 ? "ACTIVE" : "CREATING"
					}
				});
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				await utils.timeout(5);
				expectChai(describeTableParams).to.eql([{
					"TableName": tableName
				}, {
					"TableName": tableName
				}]);
			});

			// TODO: this fails in Jest since it mocks the `process` object. We should change this anyways to throw errors when making the request (ie. get, scan, etc).
			it.skip("Should timeout according to waitForActive timeout rules", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"TableStatus": "CREATING"
					}
				});
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				const errorHandler = utils.empty_function;
				process.on("unhandledRejection", errorHandler);
				await utils.timeout(15);
				expectChai(describeTableParams.length).to.be.above(5);
				process.removeListener("unhandledRejection", errorHandler);
			});

			// TODO: this fails in Jest since it mocks the `process` object. We should change this anyways to throw errors when making the request (ie. get, scan, etc).
			it.skip("Should throw error if AWS throws error", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.reject({"error": "ERROR"});

				let error;
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model]);
				const errorHandler = (err) => error = err;
				process.on("unhandledRejection", errorHandler);
				await utils.timeout(15);
				expectChai(error).to.eql({"error": "ERROR"});
				process.removeListener("unhandledRejection", errorHandler);
			});

			it("Should not call describeTable if table already created and already attempted to createTable again", async () => {
				const tableName = "Cat";
				describeTableFunction = () => {
					return Promise.resolve({"Table": {"TableStatus": "ACTIVE"}});
				};

				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"create": true});
				await utils.timeout(5);
				expectChai(describeTableParams).to.eql([{
					"TableName": tableName
				}]);
			});

			it("Should call updateTable even if table is still being created when waitForActive is set to false", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"ProvisionedThroughput": {
							"ReadCapacityUnits": 2,
							"WriteCapacityUnits": 2
						},
						"TableStatus": "CREATING"
					}
				});
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"throughput": {"read": 1, "write": 2}, "update": true, "waitForActive": false});
				await utils.set_immediate_promise();
				expectChai(updateTableParams).to.eql([{
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 1,
						"WriteCapacityUnits": 2
					},
					"TableName": tableName
				}]);
			});

			it("Should not call updateTable when table is still being created when waitForActive is set to true", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"ProvisionedThroughput": {
							"ReadCapacityUnits": 2,
							"WriteCapacityUnits": 2
						},
						"TableStatus": "CREATING"
					}
				});
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"throughput": {"read": 1, "write": 2}, "update": true, "waitForActive": true});
				await utils.set_immediate_promise();
				expectChai(updateTableParams).to.eql([]);
			});
		});

		describe("Update", () => {
			let describeTableFunction, listTagsOfResourceFunction, updateTableParams = [], tagResourceParams = [], untagResourceParams = [];
			beforeEach(() => {
				dynamoose.Table.defaults.set({
					"create": false,
					"update": true
				});
			});
			beforeEach(() => {
				updateTableParams = [];
				tagResourceParams = [];
				untagResourceParams = [];
				listTagsOfResourceFunction = () => Promise.resolve({
					"Tags": []
				});
				dynamoose.aws.ddb.set({
					"describeTable": () => describeTableFunction(),
					"updateTable": (params) => {
						updateTableParams.push(params);
						return Promise.resolve();
					},
					"listTagsOfResource": (params) => listTagsOfResourceFunction(params),
					"tagResource": (params) => {
						tagResourceParams.push(params);
						return Promise.resolve();
					},
					"untagResource": (params) => {
						untagResourceParams.push(params);
						return Promise.resolve();
					}
				});
			});
			afterEach(() => {
				updateTableParams = [];
				tagResourceParams = [];
				untagResourceParams = [];
				describeTableFunction = null;
				listTagsOfResourceFunction = null;
				dynamoose.aws.ddb.revert();
			});

			describe("Throughput", () => {
				const updateOptions = [
					true,
					["throughput"]
				];
				updateOptions.forEach((updateOption) => {
					describe(`{"update": ${JSON.stringify(updateOption)}}`, () => {
						it("Should not call updateTable if throughput matches", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 2
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"throughput": {"read": 1, "write": 2}, "update": updateOption});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([]);
						});

						it("Should call updateTable with correct parameters if throughput doesn't match", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 2,
										"WriteCapacityUnits": 2
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"throughput": {"read": 1, "write": 2}, "update": updateOption});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"ProvisionedThroughput": {
									"ReadCapacityUnits": 1,
									"WriteCapacityUnits": 2
								},
								"TableName": tableName
							}]);
						});

						it("Should call updateTable with correct parameters if switching from provisioned to on demand", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 2,
										"WriteCapacityUnits": 2
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"throughput": "ON_DEMAND", "update": updateOption});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"BillingMode": "PAY_PER_REQUEST",
								"TableName": tableName
							}]);
						});

						it("Should call updateTable with correct parameters if switching from on demand to provisioned", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"BillingMode": "PAY_PER_REQUEST",
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"throughput": 5, "update": updateOption});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"ProvisionedThroughput": {
									"ReadCapacityUnits": 5,
									"WriteCapacityUnits": 5
								},
								"TableName": tableName
							}]);
						});
					});
				});
			});

			describe("Indexes", () => {
				const updateOptions = [
					true,
					["indexes"]
				];
				updateOptions.forEach((updateOption) => {
					describe(`{"update": ${JSON.stringify(updateOption)}}`, () => {
						it("Should call updateTable to add index", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String, "name": {"type": String, "index": {"type": "global"}}});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([
								{
									"AttributeDefinitions": [
										{
											"AttributeName": "id",
											"AttributeType": "S"
										},
										{
											"AttributeName": "name",
											"AttributeType": "S"
										}
									],
									"GlobalSecondaryIndexUpdates": [
										{
											"Create": {
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
										}
									],
									"TableName": "Cat"
								}
							]);
						});

						it("Should call updateTable to delete index", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"AttributeDefinitions": [
										{
											"AttributeName": "id",
											"AttributeType": "S"
										},
										{
											"AttributeName": "name",
											"AttributeType": "S"
										}
									],
									"GlobalSecondaryIndexes": [
										{
											"IndexName": "nameGlobalIndex",
											"IndexStatus": "ACTIVE",
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
									]
								}
							});
							const model = dynamoose.model(tableName, {"id": String, "name": {"type": String}});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([
								{
									"GlobalSecondaryIndexUpdates": [
										{
											"Delete": {
												"IndexName": "nameGlobalIndex"
											}
										}
									],
									"TableName": "Cat"
								}
							]);
						});

						it("Should call updateTable to add multiple indexes correctly", async () => {
							const tableName = "Cat";
							let describeTableFunctionCalledTimes = 0;
							let testUpdateTableParams = {};
							describeTableFunction = () => {
								++describeTableFunctionCalledTimes;
								let obj;
								if (describeTableFunctionCalledTimes === 1) {
									obj = {
										"Table": {
											"ProvisionedThroughput": {
												"ReadCapacityUnits": 1,
												"WriteCapacityUnits": 1
											},
											"TableStatus": "ACTIVE"
										}
									};
								} else if (describeTableFunctionCalledTimes === 2) {
									testUpdateTableParams["0"] = [...updateTableParams];
									obj = {
										"Table": {
											"ProvisionedThroughput": {
												"ReadCapacityUnits": 1,
												"WriteCapacityUnits": 1
											},
											"TableStatus": "ACTIVE",
											"GlobalSecondaryIndexes": [
												{
													"IndexName": "nameGlobalIndex",
													"IndexStatus": "CREATING",
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
											]
										}
									};
								} else if (describeTableFunctionCalledTimes === 3) {
									obj = {
										"Table": {
											"ProvisionedThroughput": {
												"ReadCapacityUnits": 1,
												"WriteCapacityUnits": 1
											},
											"TableStatus": "ACTIVE",
											"GlobalSecondaryIndexes": [
												{
													"IndexName": "nameGlobalIndex",
													"IndexStatus": "ACTIVE",
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
											]
										}
									};
								} else if (describeTableFunctionCalledTimes === 4) {
									testUpdateTableParams["1"] = [...updateTableParams];
									obj = {
										"Table": {
											"ProvisionedThroughput": {
												"ReadCapacityUnits": 1,
												"WriteCapacityUnits": 1
											},
											"TableStatus": "ACTIVE",
											"GlobalSecondaryIndexes": [
												{
													"IndexName": "nameGlobalIndex",
													"IndexStatus": "ACTIVE",
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
												{
													"IndexName": "statusGlobalIndex",
													"IndexStatus": "CREATING",
													"KeySchema": [
														{
															"AttributeName": "status",
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
											]
										}
									};
								} else if (describeTableFunctionCalledTimes >= 4) {
									obj = {
										"Table": {
											"ProvisionedThroughput": {
												"ReadCapacityUnits": 1,
												"WriteCapacityUnits": 1
											},
											"TableStatus": "ACTIVE",
											"GlobalSecondaryIndexes": [
												{
													"IndexName": "nameGlobalIndex",
													"IndexStatus": "ACTIVE",
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
												{
													"IndexName": "statusGlobalIndex",
													"IndexStatus": "ACTIVE",
													"KeySchema": [
														{
															"AttributeName": "status",
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
											]
										}
									};
								}
								return Promise.resolve(obj);
							};
							const model = dynamoose.model(tableName, {"id": String, "name": {"type": String, "index": {"type": "global"}}, "status": {"type": String, "index": {"type": "global"}}});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
							await utils.set_immediate_promise();
							expectChai(describeTableFunctionCalledTimes).to.eql(5);
							expectChai(utils.array_flatten(testUpdateTableParams["0"].map((a) => a.GlobalSecondaryIndexUpdates))).to.eql([{
								"Create": {
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
							}]);
							expectChai(utils.array_flatten(testUpdateTableParams["1"].map((a) => a.GlobalSecondaryIndexUpdates))).to.eql([
								...testUpdateTableParams["0"][0].GlobalSecondaryIndexUpdates,
								{
									"Create": {
										"IndexName": "statusGlobalIndex",
										"KeySchema": [
											{
												"AttributeName": "status",
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
								}
							]);
						});
					});
				});
			});

			describe("Tags", () => {
				beforeEach(() => {
					describeTableFunction = () => Promise.resolve({
						"Table": {
							"ProvisionedThroughput": {
								"ReadCapacityUnits": 1,
								"WriteCapacityUnits": 1
							},
							"TableStatus": "ACTIVE",
							"TableArn": "arn"
						}
					});
				});
				it("Should not call listTagsOfResource if \"tags\" not included in update array", async () => {
					const tableName = "Cat";
					let didCall = false;
					listTagsOfResourceFunction = () => {
						didCall = true;
						return Promise.resolve({
							"Tags": [
								{
									"Key": "hello",
									"Value": "world"
								}
							]
						});
					};
					const model = dynamoose.model(tableName, {"id": String});
					new dynamoose.Table(tableName, [model], {"update": ["indexes"]});
					await utils.set_immediate_promise();
					expect(didCall).toEqual(false);
				});

				const updateOptions = [
					true,
					["tags"]
				];
				updateOptions.forEach((updateOption) => {
					describe(`{"update": ${JSON.stringify(updateOption)}}`, () => {
						it("Should remove existing tags if no tags passed into table object", async () => {
							const tableName = "Cat";
							listTagsOfResourceFunction = () => Promise.resolve({
								"Tags": [
									{
										"Key": "hello",
										"Value": "world"
									}
								]
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await utils.set_immediate_promise();
							expect(tagResourceParams).toEqual([]);
							expect(untagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"TagKeys": ["hello"]
								}
							]);
						});

						it("Should remove multiple existing tags if no tags passed into table object", async () => {
							const tableName = "Cat";
							listTagsOfResourceFunction = () => Promise.resolve({
								"Tags": [
									{
										"Key": "hello",
										"Value": "world"
									},
									{
										"Key": "foo",
										"Value": "bar"
									}
								]
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await utils.set_immediate_promise();
							expect(tagResourceParams).toEqual([]);
							expect(untagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"TagKeys": ["hello", "foo"]
								}
							]);
						});

						it("Should remove multiple existing tags if pagination for listTagsOfResource exists if no tags passed into table object", async () => {
							const tableName = "Cat";
							let listTagsOfResourceFunctionParamsArray = [];
							listTagsOfResourceFunction = (params) => {
								listTagsOfResourceFunctionParamsArray.push(params);
								return Promise.resolve(listTagsOfResourceFunctionParamsArray.length === 1 ? {
									"Tags": [
										{
											"Key": "hello",
											"Value": "world"
										}
									],
									"NextToken": "next"
								} : {
									"Tags": [
										{
											"Key": "foo",
											"Value": "bar"
										}
									]
								});
							};
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption});
							await utils.set_immediate_promise();
							expect(listTagsOfResourceFunctionParamsArray).toEqual([
								{
									"ResourceArn": "arn"
								},
								{
									"ResourceArn": "arn",
									"NextToken": "next"
								}
							]);
							expect(tagResourceParams).toEqual([]);
							expect(untagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"TagKeys": ["hello", "foo"]
								}
							]);
						});

						it("Should not take any action if tags match", async () => {
							const tableName = "Cat";
							listTagsOfResourceFunction = () => Promise.resolve({
								"Tags": [
									{
										"Key": "hello",
										"Value": "world"
									}
								]
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption, "tags": {"hello": "world"}});
							await utils.set_immediate_promise();
							expect(tagResourceParams).toEqual([]);
							expect(untagResourceParams).toEqual([]);
						});

						it("Should delete and readd tags if values mismatch", async () => {
							const tableName = "Cat";
							listTagsOfResourceFunction = () => Promise.resolve({
								"Tags": [
									{
										"Key": "hello",
										"Value": "world"
									}
								]
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption, "tags": {"hello": "universe"}});
							await utils.set_immediate_promise();
							expect(tagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"Tags": [
										{
											"Key": "hello",
											"Value": "universe"
										}
									]
								}
							]);
							expect(untagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"TagKeys": ["hello"]
								}
							]);
						});

						it("Should add tags properly", async () => {
							const tableName = "Cat";
							listTagsOfResourceFunction = () => Promise.resolve({
								"Tags": []
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"update": updateOption, "tags": {"hello": "universe"}});
							await utils.set_immediate_promise();
							expect(tagResourceParams).toEqual([
								{
									"ResourceArn": "arn",
									"Tags": [
										{
											"Key": "hello",
											"Value": "universe"
										}
									]
								}
							]);
							expect(untagResourceParams).toEqual([]);
						});
					});
				});
			});

			describe("Table Class", () => {
				const updateOptions = [
					true,
					["tableClass"]
				];
				updateOptions.forEach((updateOption) => {
					describe(`{"update": ${JSON.stringify(updateOption)}}`, () => {
						it("Should not call updateTable if table class is standard and undefined in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"TableClassSummary": {
										"TableClass": "STANDARD"
									}
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([]);
						});

						it("Should not call updateTable if table class is standard and standard in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"TableClassSummary": {
										"TableClass": "STANDARD"
									}
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "standard"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([]);
						});

						it("Should not call updateTable if table class is infrequent access and infrequent access in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"TableClassSummary": {
										"TableClass": "STANDARD_INFREQUENT_ACCESS"
									}
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "infrequentAccess"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([]);
						});

						it("Should not call updateTable if table class is undefined and standard in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "standard"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([]);
						});

						it("Should call updateTable if table class is undefined and infrequent access in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE"
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "infrequentAccess"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"TableName": tableName,
								"TableClass": "STANDARD_INFREQUENT_ACCESS"
							}]);
						});

						it("Should call updateTable if table class is standard and infrequent access in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"TableClassSummary": {
										"TableClass": "STANDARD"
									}
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "infrequentAccess"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"TableName": tableName,
								"TableClass": "STANDARD_INFREQUENT_ACCESS"
							}]);
						});

						it("Should call updateTable if table class is infrequent access and standard in table initialization", async () => {
							const tableName = "Cat";
							describeTableFunction = () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 1,
										"WriteCapacityUnits": 1
									},
									"TableStatus": "ACTIVE",
									"TableClassSummary": {
										"TableClass": "STANDARD_INFREQUENT_ACCESS"
									}
								}
							});
							const model = dynamoose.model(tableName, {"id": String});
							new dynamoose.Table(tableName, [model], {"tableClass": "standard"});
							await utils.set_immediate_promise();
							expectChai(updateTableParams).to.eql([{
								"TableName": tableName,
								"TableClass": "STANDARD"
							}]);
						});
					});
				});
			});
		});

		describe("Time To Live", () => {
			let updateTTLParams = [], describeTTL, describeTTLFunction;
			beforeEach(() => {
				dynamoose.Table.defaults.set({
					"create": false,
					"update": true
				});
			});
			beforeEach(() => {
				updateTTLParams = [];
				dynamoose.aws.ddb.set({
					"describeTable": () => {
						return Promise.resolve({
							"Table": {
								"ProvisionedThroughput": {
									"ReadCapacityUnits": 1,
									"WriteCapacityUnits": 1
								},
								"TableStatus": "ACTIVE"
							}
						});
					},
					"updateTimeToLive": (params) => {
						updateTTLParams.push(params);
						return Promise.resolve();
					},
					"describeTimeToLive": () => {
						return describeTTLFunction ? describeTTLFunction() : Promise.resolve(describeTTL);
					},
					"listTagsOfResource": () => Promise.resolve({
						"Tags": []
					})
				});
			});
			afterEach(() => {
				updateTTLParams = [];
				describeTTL = null;
				describeTTLFunction = null;
				dynamoose.aws.ddb.revert();
			});

			it("Should call updateTimeToLive with correct parameters if TTL is disabled", async () => {
				describeTTL = {"TimeToLiveDescription": {"TimeToLiveStatus": "DISABLED"}};
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"expires": 1000});
				await utils.set_immediate_promise();
				expectChai(updateTTLParams).to.eql([{
					"TableName": tableName,
					"TimeToLiveSpecification": {
						"Enabled": true,
						"AttributeName": "ttl"
					}
				}]);
			});

			it("Should not call updateTimeToLive with correct parameters if TTL is enabled", async () => {
				describeTTL = {"TimeToLiveDescription": {"TimeToLiveStatus": "ENABLED"}};
				const tableName = "Cat";
				dynamoose.model(tableName, {"id": String}, {"expires": 1000});
				await utils.set_immediate_promise();
				expectChai(updateTTLParams).to.eql([]);
			});

			it("Should not call updateTimeToLive with correct parameters if TTL is enabling", async () => {
				describeTTL = {"TimeToLiveDescription": {"TimeToLiveStatus": "ENABLING"}};
				const tableName = "Cat";
				dynamoose.model(tableName, {"id": String}, {"expires": 1000});
				await utils.set_immediate_promise();
				expectChai(updateTTLParams).to.eql([]);
			});

			it("Should call updateTimeToLive with correct parameters for custom attribute if TTL is disabling", async () => {
				const startTime = Date.now();
				let timesCalledDescribeTTL = 0;
				describeTTLFunction = () => {
					timesCalledDescribeTTL++;
					return Promise.resolve(timesCalledDescribeTTL < 2 ? {"TimeToLiveDescription": {"TimeToLiveStatus": "DISABLING"}} : {"TimeToLiveDescription": {"TimeToLiveStatus": "DISABLED"}});
				};
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"expires": {"ttl": 1000, "attribute": "expires"}});
				await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
				expectChai(updateTTLParams).to.eql([{
					"TableName": tableName,
					"TimeToLiveSpecification": {
						"Enabled": true,
						"AttributeName": "expires"
					}
				}]);
				expectChai(timesCalledDescribeTTL).to.eql(2);
				expectChai(Date.now() - startTime).to.be.at.least(1000);
			});

			it("Should call updateTimeToLive with correct parameters for custom attribute if TTL is disabled", async () => {
				describeTTL = {"TimeToLiveDescription": {"TimeToLiveStatus": "DISABLED"}};
				const tableName = "Cat";
				const model = dynamoose.model(tableName, {"id": String});
				new dynamoose.Table(tableName, [model], {"expires": {"ttl": 1000, "attribute": "expires"}});
				await utils.set_immediate_promise();
				expectChai(updateTTLParams).to.eql([{
					"TableName": tableName,
					"TimeToLiveSpecification": {
						"Enabled": true,
						"AttributeName": "expires"
					}
				}]);
			});

			it("Should not call updateTimeToLive if no expires", async () => {
				const tableName = "Cat";
				dynamoose.model(tableName, {"id": String});
				await utils.set_immediate_promise();
				expectChai(updateTTLParams).to.eql([]);
			});
		});
	});

	describe("table.name", () => {
		const tests = [
			{"name": "No options", "options": {}, "input": "Table", "output": "Table"},
			{"name": "Prefix", "options": {"prefix": "MyApp_"}, "input": "Table", "output": "MyApp_Table"},
			{"name": "Suffix", "options": {"suffix": "_Table"}, "input": "User", "output": "User_Table"}
		];

		tests.forEach((test) => {
			describe(test.name, () => {
				it("Should return correct value", () => {
					const table = new dynamoose.Table(test.input, [dynamoose.model("Cat", {"id": String})], test.options);
					expectChai(table.name).to.eql(test.output);
				});
			});
		});

		it("Should not be able to set", () => {
			const table = new dynamoose.Table("Table", [dynamoose.model("Cat", {"id": String})]);
			table.name = "RandomString";
			expectChai(table.name).to.eql("Table");
		});
	});

	describe("table.hashKey", () => {
		it("Should return correct value", () => {
			const model = dynamoose.model("User", {"id": String});
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.hashKey).to.eql("id");
		});
	});

	describe("table.rangeKey", () => {
		it("Should return undefined if doesn't exist", () => {
			const model = dynamoose.model("User", {"id": String});
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.rangeKey).to.be.undefined;
		});

		it("Should return correct value", () => {
			const model = dynamoose.model("User", {"id": String, "data": {"type": String, "rangeKey": true}});
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.rangeKey).to.eql("data");
		});
	});

	describe("table.create()", () => {
		it("Should be a function", () => {
			const model = dynamoose.model("User", {"id": String});
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.create).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (table) => table.create},
			{"name": "Callback", "func": (table) => util.promisify(table.create)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					const model = dynamoose.model("User", {"id": String});
					const table = new dynamoose.Table("User", [model]);
					expectChai(await callType.func(table).bind(table)({"return": "request"})).to.eql({
						"TableName": "User",
						"ProvisionedThroughput": {
							"ReadCapacityUnits": 1,
							"WriteCapacityUnits": 1
						},
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
					});
				});

				it("Should return correct result with no settings passed in", async () => {
					const model = dynamoose.model("User", {"id": String});
					const table = new dynamoose.Table("User", [model]);

					let createTableParams;
					dynamoose.aws.ddb.set({
						"createTable": (params) => {
							createTableParams = params;
							return params;
						}
					});
					await callType.func(table).bind(table)();
					expectChai(createTableParams).to.eql({
						"TableName": "User",
						"ProvisionedThroughput": {
							"ReadCapacityUnits": 1,
							"WriteCapacityUnits": 1
						},
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
					});
				});

				it("Should reject if has multiple types for hashKey", () => {
					expect.assertions(1);
					const model = dynamoose.model("User", {"id": [String, Number]});
					const table = new dynamoose.Table("User", [model]);

					return expect(callType.func(table).bind(table)({"return": "request"})).rejects.toEqual(new CustomError.InvalidParameter("You can not have multiple types for attribute definition: id."));
				});

				it("Should reject if has multiple types for rangeKey", () => {
					expect.assertions(1);
					const model = dynamoose.model("User", {"id": String, "rangeKey": {"type": [String, Number], "rangeKey": true}});
					const table = new dynamoose.Table("User", [model]);

					return expect(callType.func(table).bind(table)({"return": "request"})).rejects.toEqual(new CustomError.InvalidParameter("You can not have multiple types for attribute definition: rangeKey."));
				});
			});
		});
	});

	describe("modelForObject", () => {
		it("Should return correct model", async () => {
			const model = dynamoose.model("User", {"id": String, "name": String});
			const model2 = dynamoose.model("User2", {"id": String, "data": String});
			const table = new dynamoose.Table("Table", [model, model2]);

			expectChai(await table.getInternalProperties(internalProperties).modelForObject({"id": "1", "name": "John"})).to.eql(model);
			expectChai(await table.getInternalProperties(internalProperties).modelForObject({"id": "1", "data": "John"})).to.eql(model2);
		});

		it("Should return correct model for sub-schemas", async () => {
			const model = dynamoose.model("User", [{"id": String, "name": String}, {"id": String, "data": String, "item": String}]);
			const model2 = dynamoose.model("User2", {"id": String, "data": String});
			const table = new dynamoose.Table("Table", [model, model2]);

			expectChai(await table.getInternalProperties(internalProperties).modelForObject({"id": "1", "name": "John"})).to.eql(model);
			expectChai(await table.getInternalProperties(internalProperties).modelForObject({"id": "1", "data": "John"})).to.eql(model);
			expectChai(await table.getInternalProperties(internalProperties).modelForObject({"id": "1", "data": "John", "item": "Smith"})).to.eql(model);
		});
	});

	describe("getIndexes", () => {
		it("Should return only 1 index if duplicates exist across models", async () => {
			const model = dynamoose.model("User", {"id": String, "data": {"type": String, "index": {"type": "global"}}});
			const model2 = dynamoose.model("User2", {"id": String, "data": {"type": String, "index": {"type": "global"}}});
			const table = new dynamoose.Table("User", [model, model2]);

			expectChai(await table.getInternalProperties(internalProperties).getIndexes()).to.eql({
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "dataGlobalIndex",
						"KeySchema": [
							{
								"AttributeName": "data",
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
				],
				"TableIndex": {
					"KeySchema": [
						{
							"AttributeName": "id",
							"KeyType": "HASH"
						}
					]
				}
			});
			expectChai(await table.getInternalProperties(internalProperties).getIndexes()).to.eql(await model.Model.getInternalProperties(internalProperties).getIndexes());
			expectChai(await table.getInternalProperties(internalProperties).getIndexes()).to.eql(await model2.Model.getInternalProperties(internalProperties).getIndexes());
		});

		it("Should return all indexes from all models", async () => {
			const model = dynamoose.model("User", {"id": String, "data": {"type": String, "index": {"type": "global"}}});
			const model2 = dynamoose.model("User2", {"id": String, "data2": {"type": String, "index": {"type": "global"}}});
			const table = new dynamoose.Table("User", [model, model2]);

			expectChai(await table.getInternalProperties(internalProperties).getIndexes()).to.eql({
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "dataGlobalIndex",
						"KeySchema": [
							{
								"AttributeName": "data",
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
					{
						"IndexName": "data2GlobalIndex",
						"KeySchema": [
							{
								"AttributeName": "data2",
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
				],
				"TableIndex": {
					"KeySchema": [
						{
							"AttributeName": "id",
							"KeyType": "HASH"
						}
					]
				}
			});
		});
	});

	describe("getHashKey", () => {
		it("Should return first attribute if no hash key defined", () => {
			const model = dynamoose.model("User", new dynamoose.Schema({"id": String, "age": Number}));
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.getInternalProperties(internalProperties).getHashKey()).to.eql("id");
		});

		it("Should return hash key if set to true", () => {
			const model = dynamoose.model("User", new dynamoose.Schema({"id": String, "age": {"type": Number, "hashKey": true}}));
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.getInternalProperties(internalProperties).getHashKey()).to.eql("age");
		});
	});

	describe("getRangeKey", () => {
		it("Should return undefined if no range key defined", () => {
			const model = dynamoose.model("User", new dynamoose.Schema({"id": String, "age": Number}));
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.getInternalProperties(internalProperties).getRangeKey()).to.eql(undefined);
		});

		it("Should return range key if set to true", () => {
			const model = dynamoose.model("User", new dynamoose.Schema({"id": String, "age": {"type": Number, "rangeKey": true}}));
			const table = new dynamoose.Table("User", [model]);
			expectChai(table.getInternalProperties(internalProperties).getRangeKey()).to.eql("age");
		});
	});
});
