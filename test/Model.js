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
						await setImmediatePromise();
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
						await setImmediatePromise();

						let pendingTaskPromiseResolved = false;
						model.Model.pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

						await setImmediatePromise();
						expect(pendingTaskPromiseResolved).to.be.false;

						describeTableResponse = {
							"Table": {"TableStatus": "ACTIVE"}
						};
						await setImmediatePromise();
						expect(pendingTaskPromiseResolved).to.be.true;
						expect(model.Model.pendingTasks).to.eql([]);
					});

					it("Should immediately resolve pendingTaskPromises promise if table is already ready", async () => {
						const model = option.func("Cat", {"id": String}, {"create": false});
						await setImmediatePromise();

						let pendingTaskPromiseResolved = false;
						model.Model.pendingTaskPromise().then(() => pendingTaskPromiseResolved = true);

						await setImmediatePromise();

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
							}
						});
					});
					afterEach(() => {
						createTableParams = null;
						dynamoose.aws.ddb.revert();
					});

					it("Should call createTable with correct parameters", async () => {
						const tableName = "Cat";
						option.func(tableName, {"id": String});
						await setImmediatePromise();
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
							"GlobalSecondaryIndexes": [],
							"LocalSecondaryIndexes": [],
							"TableName": tableName
						});
					});

					it("Should not call createTable if create option set to false", async () => {
						option.func("Cat", {"id": String}, {"create": false});
						await setImmediatePromise();
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
							}
						});

						option.func("Cat", {"id": String});
						await setImmediatePromise();
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
						await setImmediatePromise();
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

				// TODO: add test for `Should throw error if Dynamo object consists properties that have type mismatch with schema`

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
					await setImmediatePromise();

					let user;
					callType.func(model).bind(model)(1).then((item) => user = item);

					await setImmediatePromise();
					expect(calledGetItem).to.be.false;
					expect(user).to.not.exist;
					expect(model.Model.pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await setImmediatePromise();
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

// TODO: move the following function into a utils file
// This function is used to turn `setImmediate` into a promise. This is espescially useful if you want to wait for pending promises to fire and complete before running the asserts on a test.
function setImmediatePromise() {
	return new Promise((resolve) => setImmediate(resolve));
}
