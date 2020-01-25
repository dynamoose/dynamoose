const {expect} = require("chai");
const dynamoose = require("../lib");
const Error = require("../lib/Error");
const utils = require("../lib/utils");
const util = require("util");

describe("Model", () => {
	beforeEach(() => {
		dynamoose.model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.model.defaults = {};
	});

	it("Should have a model proprety on the dynamoose object", () => {
		expect(dynamoose.model).to.exist;
	});

	it("Should resolve to correct file for dynamoose object", () => {
		expect(dynamoose.model).to.eql(require("../lib/Model"));
	});

	it("Should be a function", () => {
		expect(dynamoose.model).to.be.a("function");
	});

	describe("Initialization", () => {
		const options = [
			{"name": "Using new keyword", "func": (...args) => new dynamoose.model(...args)},
			{"name": "Without new keyword", "func": (...args) => dynamoose.model(...args)}
		];

		options.forEach((option) => {
			describe(option.name, () => {
				it("Should throw an error if no schema is passed in", () => {
					expect(() => option.func("Cat")).to.throw(Error.MissingSchemaError);
				});

				it("Should throw same error as no schema if nothing passed in", () => {
					expect(() => option.func()).to.throw(Error.MissingSchemaError);
				});

				it("Should create a schema if not passing in schema instance", () => {
					const schema = {"name": String};
					const Cat = option.func("Cat", schema);
					expect(Cat.Model.schema).to.not.eql(schema);
					expect(Cat.Model.schema).to.be.an.instanceof(dynamoose.Schema);
				});

				it("Should use schema instance if passed in", () => {
					const schema = new dynamoose.Schema({"name": String});
					const Cat = option.func("Cat", schema);
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
						dynamoose.model.defaults = {...dynamoose.model.defaults, [type]: value};
						return option.func(...args);
					}},
					{"name": "Options", "func": (type, value, ...args) => option.func(...args, {[type]: value})}
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
						expect(option.func("Cat", {"id": String}, {"create": false}).Model.ready).to.be.false;
					});

					it("Should set ready after setup flow", async () => {
						const model = option.func("Cat", {"id": String}, {"create": false});
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
						const model = option.func("Cat", {"id": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0}}});
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
						const model = option.func("Cat", {"id": String}, {"create": false});
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
						dynamoose.model.defaults = {
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
						option.func(tableName, {"id": String});
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
						option.func(tableName, {"id": String});
						await utils.set_immediate_promise();
						expect(createTableParams).to.eql(null);
					});

					it("Should not call createTable if create option set to false", async () => {
						option.func("Cat", {"id": String}, {"create": false});
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

						option.func("Cat", {"id": String});
						await utils.set_immediate_promise();
						expect(self).to.be.an("object");
						expect(Object.keys(self)).to.eql(["promise"]);
						expect(self.promise).to.exist;
					});
				});

				describe("Wait For Active", () => {
					let describeTableParams = [], describeTableFunction;
					beforeEach(() => {
						dynamoose.model.defaults = {
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
						option.func(tableName, {"id": String});
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
						option.func(tableName, {"id": String});
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
						option.func(tableName, {"id": String});
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
						option.func(tableName, {"id": String});
						const errorHandler = (err) => error = err;
						process.on("unhandledRejection", errorHandler);
						await utils.timeout(15);
						expect(error).to.eql({"error": "ERROR"});
						process.removeListener("unhandledRejection", errorHandler);
					});

					it("Should not call describeTable if table already created and already attempted to createTable again", async () => {
						const tableName = "Cat";
						let count = 0;
						describeTableFunction = () => {
							count++;
							return Promise.resolve({"Table": {"TableStatus": "ACTIVE"}});
						};

						let error;
						option.func(tableName, {"id": String}, {"create": true});
						await utils.timeout(5);
						expect(describeTableParams).to.eql([{
							"TableName": tableName
						}]);
					});
				});
			});
		});
	});

	describe("Model.get", () => {
		let User, getItemParams, getItemFunction;
		beforeEach(() => {
			User = new dynamoose.model("User", {"id": Number, "name": String});
			dynamoose.aws.ddb.set({
				"getItem": (params) => {
					getItemParams = params;
					return {"promise": getItemFunction};
				}
			});
		});
		afterEach(() => {
			User = null;
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

				it("Should return object with correct values with saveUnknown", async () => {
					User = new dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "hello": {"S": "world"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "hello"]);
					expect(user.id).to.eql(1);
					expect(user.hello).to.eql("world");
				});

				it("Should return object with correct values for string set", async () => {
					User = new dynamoose.model("User", {"id": Number, "friends": [String]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for string set with saveUnknown", async () => {
					User = new dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "friends"]);
					expect(user.id).to.eql(1);
					expect(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for number set", async () => {
					User = new dynamoose.model("User", {"id": Number, "numbers": [Number]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "numbers"]);
					expect(user.id).to.eql(1);
					expect(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for number set with saveUnknown", async () => {
					User = new dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "numbers"]);
					expect(user.id).to.eql(1);
					expect(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for buffer", async () => {
					User = new dynamoose.model("User", {"id": Number, "data": Buffer});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(Buffer.from("testdata"));
				});

				it("Should return object with correct values for buffer set", async () => {
					User = new dynamoose.model("User", {"id": Number, "data": [Buffer]});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values for buffer set", async () => {
					User = new dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "data"]);
					expect(user.id).to.eql(1);
					expect(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values if using custom types", async () => {
					User = new dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name", "birthday"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
					expect(user.birthday).to.eql(new Date(1));
				});

				it("Should return object with correct values if using custom types but value doesn't exist", async () => {
					User = new dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "name"]);
					expect(user.id).to.eql(1);
					expect(user.name).to.eql("Charlie");
					expect(user.birthday).to.not.exist;
				});

				it("Should throw type mismatch error if passing in wrong type with custom type", async () => {
					User = new dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
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
					User = new dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"street": "hello", "country": "world"});
				});

				it("Should return object with correct values with object property with elements that don't exist in schema", async () => {
					User = new dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"country": "world"});
				});

				it("Should throw type mismatch error if passing in wrong type with custom type for object", async () => {
					User = new dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
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
					User = new dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
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
					User = new dynamoose.model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expect(user).to.be.an("object");
					expect(Object.keys(user)).to.eql(["id", "address"]);
					expect(Object.keys(user.address)).to.eql(["zip", "country"]);
					expect(user.id).to.eql(1);
					expect(user.address).to.eql({"country": "world", "zip": 12345});
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
					User = new dynamoose.model("User", {"id": Number, "name": String, "age": Number});
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
					const model = new dynamoose.model("User", {"id": Number, "name": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
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
			User = new dynamoose.model("User", {"id": Number, "name": String});
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
			User = new dynamoose.model("User", {"id": Number, "name": String, "age": Number});
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
					User = new dynamoose.model("User", {"id": Number, "name": String, "friends": Array});
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

				it("Should send correct params to updateItem with $ADD with one item for list append", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = new dynamoose.model("User", {"id": Number, "name": String, "friends": Array});
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

				it("Should return updated document upon success", async () => {
					updateItemFunction = () => Promise.resolve({"Attributes": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const result = await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expect(result.constructor.name).to.eql("Document");
					expect({...result}).to.eql({
						"id": 1,
						"name": "Charlie"
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
});

describe("model", () => {
	beforeEach(() => {
		dynamoose.model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.model.defaults = {};
	});

	let Cat;
	beforeEach(() => {
		const schema = new dynamoose.Schema({"name": String});
		Cat = dynamoose.model("Cat", schema);
	});

	it("Should allow creating instance of Model", () => {
		expect(() => new Cat({"name": "Bob"})).to.not.throw();
	});
});
