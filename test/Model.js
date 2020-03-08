const {expect} = require("chai");
const dynamoose = require("../lib");
const Error = require("../lib/Error");
const utils = require("../lib/utils");
const util = require("util");

describe("Model", () => {
	beforeEach(() => {
		dynamoose.Model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.Model.defaults = {};
	});

	it("Should have a model proprety on the dynamoose object", () => {
		expect(dynamoose.Model).to.exist;
	});

	it("Should resolve to correct file for dynamoose object", () => {
		expect(dynamoose.Model).to.eql(require("../lib/Model"));
	});

	it("Should be a function", () => {
		expect(dynamoose.Model).to.be.a("function");
	});

	describe("Initialization", () => {
		it("Should throw an error if not using `new` keyword", () => {
			expect(() => dynamoose.Model()).to.throw("Class constructor Model cannot be invoked without 'new'");
		});

		it("Should throw an error if no schema is passed in", () => {
			expect(() => new dynamoose.Model("Cat")).to.throw(Error.MissingSchemaError);
		});

		it("Should throw same error as no schema if nothing passed in", () => {
			expect(() => new dynamoose.Model()).to.throw(Error.MissingSchemaError);
		});

		it("Should create a schema if not passing in schema instance", () => {
			const schema = {"name": String};
			const Cat = new dynamoose.Model("Cat", schema);
			expect(Cat.Model.schema).to.not.eql(schema);
			expect(Cat.Model.schema).to.be.an.instanceof(dynamoose.Schema);
		});

		it("Should use schema instance if passed in", () => {
			const schema = new dynamoose.Schema({"name": String});
			const Cat = new dynamoose.Model("Cat", schema);
			expect(Cat.Model.schema).to.eql(schema);
			expect(Cat.Model.schema).to.be.an.instanceof(dynamoose.Schema);
		});

		// Prefixes & Suffixes
		const optionsB = [
			{"name": "Prefix", "value": "prefix", "check": (val, result) => expect(result).to.match(new RegExp(`^${val}`))},
			{"name": "Suffix", "value": "suffix", "check": (val, result) => expect(result).to.match(new RegExp(`${val}$`))}
		];
		const optionsC = [
			{"name": "Defaults", "func": (type, value, ...args) => {
				dynamoose.Model.defaults = {...dynamoose.Model.defaults, [type]: value};
				return new dynamoose.Model(...args);
			}},
			{"name": "Options", "func": (type, value, ...args) => new dynamoose.Model(...args, {[type]: value})}
		];
		optionsB.forEach((optionB) => {
			describe(optionB.name, () => {
				optionsC.forEach((optionC) => {
					describe(optionC.name, () => {
						it("Should result in correct model name", () => {
							const extension = "MyApp";
							const tableName = "Users";
							const model = optionC.func(optionB.value, extension, tableName, {"id": String});
							expect(model.Model.name).to.include(extension);
							expect(model.Model.name).to.not.eql(tableName);
						});
					});
				});
			});
		});

		describe("Model.ready", () => {
			it("Should not be ready to start", () => {
				expect(new dynamoose.Model("Cat", {"id": String}, {"create": false}).Model.ready).to.be.false;
			});

			it("Should set ready after setup flow", async () => {
				const model = new dynamoose.Model("Cat", {"id": String}, {"create": false});
				await utils.set_immediate_promise();
				expect(model.Model.ready).to.be.true;
			});

			it("Should resolve pendingTaskPromises after model is ready", async () => {
				let describeTableResponse = {
					"Table": {"TableStatus": "CREATING"}
				};
				dynamoose.aws.ddb.set({
					"describeTable": () => ({
						"promise": () => Promise.resolve(describeTableResponse)
					})
				});
				const model = new dynamoose.Model("Cat", {"id": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0}}});
				await utils.set_immediate_promise();

				let pendingTaskPromiseResolved = false;
				model.Model.pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

				await utils.set_immediate_promise();
				expect(pendingTaskPromiseResolved).to.be.false;

				describeTableResponse = {
					"Table": {"TableStatus": "ACTIVE"}
				};
				await utils.set_immediate_promise();
				expect(pendingTaskPromiseResolved).to.be.true;
				expect(model.Model.pendingTasks).to.eql([]);
			});

			it("Should immediately resolve pendingTaskPromises promise if table is already ready", async () => {
				const model = new dynamoose.Model("Cat", {"id": String}, {"create": false});
				await utils.set_immediate_promise();

				let pendingTaskPromiseResolved = false;
				model.Model.pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

				await utils.set_immediate_promise();

				expect(pendingTaskPromiseResolved).to.be.true;
			});
		});

		describe("Creation", () => {
			let createTableParams = null;
			beforeEach(() => {
				dynamoose.Model.defaults = {
					"waitForActive": false
				};
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
				new dynamoose.Model(tableName, {"id": String});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql({
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
						"ReadCapacityUnits": 5,
						"WriteCapacityUnits": 5
					},
					"TableName": tableName
				});
			});

			it("Should call createTable with correct parameters with capacity as number", async () => {
				const tableName = "Cat";
				new dynamoose.Model(tableName, {"id": String}, {"throughput": 1});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql({
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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": {"read": 2, "write": 3}});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql({
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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": "ON_DEMAND"});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql({
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

			it("Shouldn't call createTable if table already exists", async () => {
				dynamoose.aws.ddb.set({
					"createTable": (params) => {
						createTableParams = params;
						return {
							"promise": () => Promise.resolve()
						};
					},
					"describeTable": () => ({"promise": () => Promise.resolve({"Table": {"TableStatus": "ACTIVE"}})})
				});

				const tableName = "Cat";
				new dynamoose.Model(tableName, {"id": String});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql(null);
			});

			it("Should not call createTable if create option set to false", async () => {
				new dynamoose.Model("Cat", {"id": String}, {"create": false});
				await utils.set_immediate_promise();
				expect(createTableParams).to.eql(null);
			});

			it("Should bind request to function being called", async () => {
				let self;
				dynamoose.aws.ddb.set({
					"createTable": (params) => {
						createTableParams = params;
						return {
							"promise": function() {
								self = this;
								return Promise.resolve();
							}
						};
					},
					"describeTable": () => ({"promise": () => Promise.resolve()})
				});

				new dynamoose.Model("Cat", {"id": String});
				await utils.set_immediate_promise();
				expect(self).to.be.an("object");
				expect(Object.keys(self)).to.eql(["promise"]);
				expect(self.promise).to.exist;
			});
		});

		describe("Wait For Active", () => {
			let describeTableParams = [], describeTableFunction;
			beforeEach(() => {
				dynamoose.Model.defaults = {
					"create": false,
					"waitForActive": {
						"enabled": true,
						"check": {
							"timeout": 10,
							"frequency": 1
						}
					}
				};
			});
			beforeEach(() => {
				describeTableParams = [];
				dynamoose.aws.ddb.set({
					"describeTable": (params) => {
						describeTableParams.push(params);
						return {
							"promise": describeTableFunction
						};
					}
				});
			});
			afterEach(() => {
				describeTableParams = [];
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
				new dynamoose.Model(tableName, {"id": String});
				await utils.set_immediate_promise();
				expect(describeTableParams).to.eql([{
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
				new dynamoose.Model(tableName, {"id": String});
				await utils.timeout(5);
				expect(describeTableParams).to.eql([{
					"TableName": tableName
				}, {
					"TableName": tableName
				}]);
			});

			it("Should timeout according to waitForActive timeout rules", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.resolve({
					"Table": {
						"TableStatus": "CREATING"
					}
				});
				new dynamoose.Model(tableName, {"id": String});
				const errorHandler = () => {};
				process.on("unhandledRejection", errorHandler);
				await utils.timeout(15);
				expect(describeTableParams.length).to.be.above(5);
				process.removeListener("unhandledRejection", errorHandler);
			});

			it("Should throw error if AWS throws error", async () => {
				const tableName = "Cat";
				describeTableFunction = () => Promise.reject({"error": "ERROR"});

				let error;
				new dynamoose.Model(tableName, {"id": String});
				const errorHandler = (err) => error = err;
				process.on("unhandledRejection", errorHandler);
				await utils.timeout(15);
				expect(error).to.eql({"error": "ERROR"});
				process.removeListener("unhandledRejection", errorHandler);
			});

			it("Should not call describeTable if table already created and already attempted to createTable again", async () => {
				const tableName = "Cat";
				describeTableFunction = () => {
					return Promise.resolve({"Table": {"TableStatus": "ACTIVE"}});
				};

				new dynamoose.Model(tableName, {"id": String}, {"create": true});
				await utils.timeout(5);
				expect(describeTableParams).to.eql([{
					"TableName": tableName
				}]);
			});
		});

		describe("Update", () => {
			let describeTableFunction, updateTableParams = [];
			beforeEach(() => {
				dynamoose.Model.defaults = {
					"create": false,
					"update": true
				};
			});
			beforeEach(() => {
				updateTableParams = [];
				dynamoose.aws.ddb.set({
					"describeTable": () => {
						return {
							"promise": describeTableFunction
						};
					},
					"updateTable": (params) => {
						updateTableParams.push(params);
						return {
							"promise": Promise.resolve()
						};
					}
				});
			});
			afterEach(() => {
				updateTableParams = [];
				describeTableFunction = null;
				dynamoose.aws.ddb.revert();
			});

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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": {"read": 1, "write": 2}});
				await utils.set_immediate_promise();
				expect(updateTableParams).to.eql([]);
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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": {"read": 1, "write": 2}});
				await utils.set_immediate_promise();
				expect(updateTableParams).to.eql([{
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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": "ON_DEMAND"});
				await utils.set_immediate_promise();
				expect(updateTableParams).to.eql([{
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
				new dynamoose.Model(tableName, {"id": String}, {"throughput": 5});
				await utils.set_immediate_promise();
				expect(updateTableParams).to.eql([{
					"ProvisionedThroughput": {
						"ReadCapacityUnits": 5,
						"WriteCapacityUnits": 5
					},
					"TableName": tableName
				}]);
			});
		});

		describe("Time To Live", () => {
			let updateTTLParams = [];
			beforeEach(() => {
				dynamoose.Model.defaults = {
					"create": false,
					"update": true
				};
			});
			beforeEach(() => {
				updateTTLParams = [];
				dynamoose.aws.ddb.set({
					"describeTable": () => {
						return {
							"promise": () => Promise.resolve({
								"Table": {
									"ProvisionedThroughput": {
										"ReadCapacityUnits": 5,
										"WriteCapacityUnits": 5
									},
									"TableStatus": "ACTIVE"
								}
							})
						};
					},
					"updateTimeToLive": (params) => {
						updateTTLParams.push(params);
						return {
							"promise": Promise.resolve()
						};
					}
				});
			});
			afterEach(() => {
				updateTTLParams = [];
				dynamoose.aws.ddb.revert();
			});

			it("Should call updateTimeToLive with correct parameters", async () => {
				const tableName = "Cat";
				new dynamoose.Model(tableName, {"id": String}, {"expires": 1000});
				await utils.set_immediate_promise();
				expect(updateTTLParams).to.eql([{
					"TableName": tableName,
					"TimeToLiveSpecification": {
						"Enabled": true,
						"AttributeName": "ttl"
					}
				}]);
			});

			it("Should call updateTimeToLive with correct parameters for custom attribute", async () => {
				const tableName = "Cat";
				new dynamoose.Model(tableName, {"id": String}, {"expires": {"ttl": 1000, "attribute": "expires"}});
				await utils.set_immediate_promise();
				expect(updateTTLParams).to.eql([{
					"TableName": tableName,
					"TimeToLiveSpecification": {
						"Enabled": true,
						"AttributeName": "expires"
					}
				}]);
			});

			it("Should not call updateTimeToLive if no expires", async () => {
				const tableName = "Cat";
				new dynamoose.Model(tableName, {"id": String});
				await utils.set_immediate_promise();
				expect(updateTTLParams).to.eql([]);
			});
		});
	});

	describe("Model.get", () => {
		let User, getItemParams, getItemFunction;
		beforeEach(() => {
			User = new dynamoose.Model("User", {"id": Number, "name": String});
			getItemParams = null;
			getItemFunction = null;
			dynamoose.aws.ddb.set({
				"getItem": (params) => {
					getItemParams = params;
					return {"promise": getItemFunction};
				}
			});
		});
		afterEach(() => {
			User = null;
			getItemParams = null;
			getItemFunction = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expect(User.get).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.get},
			{"name": "Callback", "func": (Model) => util.promisify(Model.get)}
		];

		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should send correct params to getItem", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)(1);
					expect(getItemParams).to.be.an("object");
					expect(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to getItem if we pass in an object", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(getItemParams).to.be.an("object");
					expect(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie"
							}
						},
						"TableName": "User"
					});
				});

				it("Should return object with correct values", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
				});

				it("Should return object that is an instance of Document", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an.instanceof(User);
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request"});
					expect(getItemParams).to.not.exist;
					expect(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					});
				});

				it("Should return null for expired object", async () => {
					User = new dynamoose.Model("User", {"id": Number}, {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "ttl": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.eql(null);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					User = new dynamoose.Model("User", {"id": Number}, {"expires": 1000});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "ttl": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "ttl"]);
					expect(user.id).to.eql(1);
					expect(user.ttl).to.eql(new Date(1000));
				});

				it("Should return object with correct values with saveUnknown", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "hello": {"S": "world"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "hello"]);
					expect(user.id).to.eql(1);
					expect(user.hello).to.eql("world");
				});

				it("Should return object with correct values for string set", async () => {
					User = new dynamoose.Model("User", {"id": Number, "friends": [String]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for string set with saveUnknown", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for number set", async () => {
					User = new dynamoose.Model("User", {"id": Number, "numbers": [Number]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "numbers"]);
					expect(user.id).to.eql(1);
					expect(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for number set with saveUnknown", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "numbers"]);
					expect(user.id).to.eql(1);
					expect(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for date set", async () => {
					User = new dynamoose.Model("User", {"id": Number, "times": [Date]});
					const time = new Date();
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "times": {"NS": [time.getTime(), 0]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "times"]);
					expect(user.id).to.eql(1);
					expect(user.times).to.eql(new Set([time, new Date(0)]));
				});

				it("Should return object with correct values for buffer", async () => {
					User = new dynamoose.Model("User", {"id": Number, "data": Buffer});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(Buffer.from("testdata"));
				});

				it("Should return object with correct values for buffer set", async () => {
					User = new dynamoose.Model("User", {"id": Number, "data": [Buffer]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values for buffer set", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values if using custom types", async () => {
					User = new dynamoose.Model("User", {"id": Number, "name": String, "birthday": Date});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name", "birthday"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
					expect(user.birthday).to.eql(new Date(1));
				});

				it("Should return object with correct values if using custom types but value doesn't exist", async () => {
					User = new dynamoose.Model("User", {"id": Number, "name": String, "birthday": Date});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
					expect(user.birthday).to.not.exist;
				});

				it("Should throw type mismatch error if passing in wrong type with custom type", async () => {
					User = new dynamoose.Model("User", {"id": Number, "name": String, "birthday": Date});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"S": "Hello World"}}});
					let result, error;
					try {
						result = await callType.func(User).bind(User)(1);
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected birthday to be of type number, instead found type string."));
				});

				it("Should return object with correct values with object property", async () => {
					User = new dynamoose.Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"street": "hello", "country": "world"});
				});

				it("Should return object with correct values with object property with elements that don't exist in schema", async () => {
					User = new dynamoose.Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"country": "world"});
				});

				it("Should throw type mismatch error if passing in wrong type with custom type for object", async () => {
					User = new dynamoose.Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"S": "test"}}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)(1);
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected address to be of type object, instead found type string."));
				});

				it("Should throw type mismatch error if passing in wrong type for nested object attribute", async () => {
					User = new dynamoose.Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"BOOL": true}}}}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)(1);
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected address.country to be of type string, instead found type boolean."));
				});

				it("Should return object with correct values with object property and saveUnknown set to true", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"country": "world", "zip": 12345});
				});

				it("Should return object with correct values with multiple nested object properties and saveUnknown set to true", async () => {
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"data": {"country": "world"}, "name": "Home"});
				});

				it("Should return object with correct values with multiple nested object properties", async () => {
					User = new dynamoose.Model("User", {"id": Number, "address": {"type": Object, "schema": {"data": {"type": Object, "schema": {"country": String}}, "name": String}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"data": {"country": "world"}, "name": "Home"});
				});

				it("Should return correct object for array properties", async () => {
					User = new dynamoose.Model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql(["Tim", "Bob"]);
				});

				it("Should return correct object with array and objects within array", async () => {
					User = new dynamoose.Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "id": {"N": "1"}}}, {"M": {"name": {"S": "Bob"}, "id": {"N": "2"}}}]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql([{"name": "Tim", "id": 1}, {"name": "Bob", "id": 2}]);
				});

				it("Should throw error if DynamoDB responds with error", async () => {
					getItemFunction = () => Promise.reject({"error": "Error"});
					let result, error;
					try {
						result = await callType.func(User).bind(User)(1);
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql({"error": "Error"});
				});

				it("Should return undefined if no object exists in DynamoDB", async () => {
					getItemFunction = () => Promise.resolve({});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.eql(undefined);
				});

				it("Should return object with correct values if Dynamo object consists properties that don't exist in schema", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "hello": {"S": "world"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
				});

				it("Should throw error if Dynamo object contains properties that have type mismatch with schema", async () => {
					User = new dynamoose.Model("User", {"id": Number, "name": String, "age": Number});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"S": "Hello World"}}});
					let result, error;
					try {
						result = await callType.func(User).bind(User)(1);
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected age to be of type number, instead found type string."));
				});

				it("Should wait for model to be ready prior to running DynamoDB API call", async () => {
					let calledGetItem = false;
					getItemFunction = () => {calledGetItem = true; return Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});};
					let describeTableResponse = {
						"Table": {"TableStatus": "CREATING"}
					};
					dynamoose.aws.ddb.set({
						"describeTable": () => ({
							"promise": () => Promise.resolve(describeTableResponse)
						}),
						"getItem": () => ({
							"promise": getItemFunction
						})
					});
					const model = new dynamoose.Model("User", {"id": Number, "name": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
					await utils.set_immediate_promise();

					let user;
					callType.func(model).bind(model)(1).then((item) => user = item);

					await utils.set_immediate_promise();
					expect(calledGetItem).to.be.false;
					expect(user).to.not.exist;
					expect(model.Model.pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await utils.set_immediate_promise();
					expect(calledGetItem).to.be.true;
					expect({...user}).to.eql({"id": 1, "name": "Charlie"});
				});
			});
		});
	});

	describe("Model.create", () => {
		let User, createItemParams, createItemFunction;
		beforeEach(() => {
			User = new dynamoose.Model("User", {"id": Number, "name": String});
			dynamoose.aws.ddb.set({
				"putItem": (params) => {
					createItemParams = params;
					return {"promise": createItemFunction};
				}
			});
		});
		afterEach(() => {
			User = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expect(User.create).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.create},
			{"name": "Callback", "func": (Model) => util.promisify(Model.create)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should send correct params to putItem", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(createItemParams).to.be.an("object");
					expect(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie"
							}
						},
						"TableName": "User"
					});
				});

				it("Should not include attributes that do not exist in schema", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "hello": "world"});
					expect(createItemParams.Item).to.eql({
						"id": {
							"N": "1"
						},
						"name": {
							"S": "Charlie"
						}
					});
				});

				it("Should overwrite if passed into options", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"}, {"overwrite": true});
					expect(createItemParams).to.be.an("object");
					expect(createItemParams).to.eql({
						"Item": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie"
							}
						},
						"TableName": "User"
					});
				});
			});
		});
	});

	describe("Model.update", () => {
		let User, updateItemParams, updateItemFunction;
		beforeEach(() => {
			User = new dynamoose.Model("User", {"id": Number, "name": String, "age": Number});
			dynamoose.aws.ddb.set({
				"updateItem": (params) => {
					updateItemParams = params;
					return {"promise": updateItemFunction};
				}
			});
		});
		afterEach(() => {
			User = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expect(User.update).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.update},
			{"name": "Callback", "func": (Model) => util.promisify(Model.update)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return request if settings passed in", async () => {
					updateItemFunction = () => Promise.resolve({});
					const response = await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"}, {"return": "request"});
					expect(response).to.be.an("object");
					expect(response).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem for single object update", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem for single object update with multiple updates", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "age": 5});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "age"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"N": "5"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with seperate key and update objects", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with seperate key and update objects and multiple updates", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie", "age": 5});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "age"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"N": "5"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $SET update expression", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": "Tim"}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Tim"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $SET update expression for list", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}});
					await callType.func(User).bind(User)({"id": 1}, {"friends": ["Bob"]});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "friends"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"L": [
									{"S": "Bob"}
								]
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD update expression", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "5"
							}
						},
						"UpdateExpression": "ADD #a0 :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD and $SET update expression", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}, "$SET": {"name": "Bob"}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "5"
							},
							":v1": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "ADD #a0 :v0 SET #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD and $SET update expression but $SET expression not as object", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}, "name": "Bob"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "5"
							},
							":v1": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "ADD #a0 :v0 SET #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD with one item for list append", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": "Tim"}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "friends"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"L": [{"S": "Tim"}]
							}
						},
						"UpdateExpression": "SET #a0 = list_append(#a0, :v0)",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD with multiple items for list append", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim", "Charlie"]}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "friends"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"L": [{"S": "Tim"}, {"S": "Charlie"}]
							}
						},
						"UpdateExpression": "SET #a0 = list_append(#a0, :v0)",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $REMOVE", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": {"age": null}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age",
						},
						"ExpressionAttributeValues": {},
						"UpdateExpression": "REMOVE #a0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $REMOVE as array", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["age"]});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age",
						},
						"ExpressionAttributeValues": {},
						"UpdateExpression": "REMOVE #a0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $SET date", async () => {
					updateItemFunction = () => Promise.resolve({});
					const date = new Date();
					User = new dynamoose.Model("User", {"id": Number, "birthday": Date});
					await callType.func(User).bind(User)({"id": 1}, {"birthday": date});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "birthday"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": `${date.getTime()}`
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $SET date as number", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "birthday": Date});
					await callType.func(User).bind(User)({"id": 1}, {"birthday": 0});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "birthday"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "0"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with $ADD date as number", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "birthday": Date});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"birthday": 1000}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "birthday"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "1000"
							}
						},
						"UpdateExpression": "ADD #a0 :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem for timestamps with updateAt", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", new dynamoose.Schema({"id": Number, "name": String}, {"timestamps": true}));
					const date = Date.now();
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "updatedAt",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": updateItemParams.ExpressionAttributeValues[":v0"].N
							},
							":v1": {
								"S": "Charlie"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
					expect(parseInt(updateItemParams.ExpressionAttributeValues[":v0"].N)).to.be.within(date - 10, date + 10);
				});

				it("Should return updated document upon success", async () => {
					updateItemFunction = () => Promise.resolve({"Attributes": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const result = await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(result.constructor.name).to.eql("Document");
					expect({...result}).to.eql({
						"id": 1,
						"name": "Charlie"
					});
				});

				it("Should not throw error if validation passes", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "myNumber": {"type": Number, "validate": (val) => val > 10}});

					let error;
					try {
						await callType.func(User).bind(User)({"id": 1}, {"myNumber": 11});
					} catch (e) {
						error = e;
					}
					expect(error).to.not.exist;
				});

				it("Should not throw error if validation doesn't pass when using $ADD", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "myNumber": {"type": Number, "validate": (val) => val > 10}});

					let error;
					try {
						await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"myNumber": 5}});
					} catch (e) {
						error = e;
					}
					expect(error).to.not.exist;
				});

				it("Should throw error if validation doesn't pass", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "validate": (val) => val.length > 10}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"name": "Bob"});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name with a value of Bob had a validation error when trying to save the document"));
				});

				it("Should throw error if value not in enum", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "enum": ["Bob", "Tim"]}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"name": "Todd"});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name must equal [\"Bob\",\"Tim\"], but is set to Todd"));
				});

				it("Should not throw error if value is in enum", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "enum": ["Bob", "Tim"]}});

					let error;
					try {
						await callType.func(User).bind(User)({"id": 1}, {"name": "Bob"});
					} catch (e) {
						error = e;
					}
					expect(error).to.not.exist;
				});

				it("Should throw error for type mismatch for set", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"name": false});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected name to be of type string, instead found type boolean."));
				});

				it("Should throw error for type mismatch for add", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "myNumber": Number});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"myNumber": false}});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected myNumber to be of type number, instead found type boolean."));
				});

				it("Should throw error for one item list append type mismatch", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": false}});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected friends.0 to be of type string, instead found type boolean."));
				});

				it("Should throw error for multiple item list append type mismatch", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": [1, 5]}});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected friends.0 to be of type string, instead found type number."));
				});

				it("Should throw error if trying to remove required property", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "required": true}});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name is a required property but has no value when trying to save document"));
				});

				it("Should not throw error if trying to modify required property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "required": true}});

					let error;
					try {
						await callType.func(User).bind(User)({"id": 1}, {"name": "Bob"});
					} catch (e) {
						error = e;
					}
					expect(error).to.not.exist;
				});

				it("Should not throw error if not modifying required property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "required": true}, "friends": [String]});

					let error;
					try {
						await callType.func(User).bind(User)({"id": 1}, {"friends": ["Bob"]});
					} catch (e) {
						error = e;
					}
					expect(error).to.not.exist;
				});

				it("Should use default value if deleting property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob"}});
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Shouldn't use default value if modifying property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob"}});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Tim"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Tim"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Shouldn't use default value if modifying different property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob"}, "data": String});
					await callType.func(User).bind(User)({"id": 1}, {"data": "test"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "test"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should use forceDefault value if deleting property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}});
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should use forceDefault value if modifying property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Tim"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should use forceDefault value if adding to property that is a string set", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "friends": {"type": [String], "default": ["Bob"], "forceDefault": true}});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim"]}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "friends"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["Bob"]
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should use forceDefault value if adding to property that is a string list", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "friends": {"type": Array, "schema": [String], "default": ["Bob"], "forceDefault": true}});
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim"]}});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "friends"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"L": [
									{"S": "Bob"}
								]
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should use forceDefault value if modifying different property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.Model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}, "data": String});
					await callType.func(User).bind(User)({"id": 1}, {"data": "test"});
					expect(updateItemParams).to.be.an("object");
					expect(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "test"
							},
							":v1": {
								"S": "Bob"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should throw error if AWS throws error", async () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});

					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}, "name": "Bob"});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql({"error": "ERROR"});
				});
			});
		});
	});

	describe("Model.delete", () => {
		let User, deleteItemParams, deleteItemFunction;
		beforeEach(() => {
			User = new dynamoose.Model("User", {"id": Number, "name": String});
			dynamoose.aws.ddb.set({
				"deleteItem": (params) => {
					deleteItemParams = params;
					return {"promise": deleteItemFunction};
				}
			});
		});
		afterEach(() => {
			User = null;
			deleteItemParams = null;
			deleteItemFunction = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expect(User.delete).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.delete},
			{"name": "Callback", "func": (Model) => util.promisify(Model.delete)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should should send correct parameters to deleteItem", async () => {
					deleteItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)(1);
					expect(deleteItemParams).to.be.an("object");
					expect(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to deleteItem if we pass in an object", async () => {
					deleteItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(deleteItemParams).to.be.an("object");
					expect(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie"
							}
						},
						"TableName": "User"
					});
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request"});
					expect(deleteItemParams).to.not.exist;
					expect(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					});
				});

				it("Should throw error if error is returned from DynamoDB", async () => {
					deleteItemFunction = () => Promise.reject({"error": "ERROR"});
					let result, error;
					try {
						result = await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql({
						"error": "ERROR"
					});
				});
			});
		});
	});

	describe("Model.table.create.request", () => {
		it("Should be a function", () => {
			expect(new dynamoose.Model("User", {"id": String}).table.create.request).to.be.a("function");
		});

		it("Should return correct result", async () => {
			expect(await new dynamoose.Model("User", {"id": String}).table.create.request()).to.eql({
				"TableName": "User",
				"ProvisionedThroughput": {
					"ReadCapacityUnits": 5,
					"WriteCapacityUnits": 5
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
	});

	describe("Model.transaction", () => {
		let User;
		beforeEach(() => {
			User = new dynamoose.Model("User", {"id": Number, "name": String});
		});
		afterEach(() => {
			User = null;
		});

		it("Should be an object", () => {
			expect(User.transaction).to.be.an("object");
		});

		describe("Model.transaction.get", () => {
			it("Should be a function", () => {
				expect(User.transaction.get).to.be.a("function");
			});

			it("Should return an object", async () => {
				expect(await User.transaction.get(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expect(await User.transaction.get(1)).to.eql({
					"Get": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", async () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.get(1, () => {});

				expect(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.create", () => {
			it("Should be a function", () => {
				expect(User.transaction.create).to.be.a("function");
			});

			it("Should return an object", async () => {
				expect(await User.transaction.create({"id": 1})).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expect(await User.transaction.create({"id": 1})).to.eql({
					"Put": {
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should return correct result with overwrite set to false", async () => {
				expect(await User.transaction.create({"id": 1}, {"overwrite": false})).to.eql({
					"Put": {
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", async () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.create({"id": 1}, {"overwrite": false}, () => {});

				expect(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.delete", () => {
			it("Should be a function", () => {
				expect(User.transaction.delete).to.be.a("function");
			});

			it("Should return an object", async () => {
				expect(await User.transaction.delete(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expect(await User.transaction.delete(1)).to.eql({
					"Delete": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", async () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.delete(1, () => {});

				expect(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.update", () => {
			it("Should be a function", () => {
				expect(User.transaction.update).to.be.a("function");
			});

			it("Should return an object", async () => {
				expect(await User.transaction.update({"id": 1, "name": "Bob"})).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expect(await User.transaction.update({"id": 1, "name": "Bob"})).to.eql({
					"Update": {
						"Key": {"id": {"N": "1"}},
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "Bob"}
						},
						"ReturnValues": "ALL_NEW",
						"UpdateExpression": "SET #a0 = :v0",
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", async () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.update({"id": 1, "name": "Bob"}, () => {});

				expect(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.condition", () => {
			it("Should be a function", () => {
				expect(User.transaction.condition).to.be.a("function");
			});

			it("Should return an object", async () => {
				expect(await User.transaction.condition(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expect(await User.transaction.condition(1)).to.eql({
					"ConditionCheck": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should return correct result with options", async () => {
				expect(await User.transaction.condition(1, {"hello": "world"})).to.eql({
					"ConditionCheck": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User",
						"hello": "world"
					}
				});
			});

			it("Should print warning if passing callback", async () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.condition(1, () => {});

				expect(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});
	});
});

describe("model", () => {
	beforeEach(() => {
		dynamoose.Model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.Model.defaults = {};
	});

	let Cat;
	beforeEach(() => {
		const schema = new dynamoose.Schema({"name": String});
		Cat = new dynamoose.Model("Cat", schema);
	});

	it("Should allow creating instance of Model", () => {
		expect(() => new Cat({"name": "Bob"})).to.not.throw();
	});
});
