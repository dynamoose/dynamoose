const {expect} = require("chai");
const dynamoose = require("../lib");
const Error = require("../lib/Error");
const utils = require("../lib/utils");

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
					expect(Cat.Model.schema instanceof dynamoose.Schema).to.be.true;
				});

				it("Should use schema instance if passed in", () => {
					const schema = new dynamoose.Schema({"name": String});
					const Cat = option.func("Cat", schema);
					expect(Cat.Model.schema).to.eql(schema);
					expect(Cat.Model.schema instanceof dynamoose.Schema).to.be.true;
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
					let describeTableParams = [], describeTableResult;
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
									"promise": () => Promise.resolve(typeof describeTableResult === "function" ? describeTableResult() : describeTableResult)
								};
							}
						});
					});
					afterEach(() => {
						describeTableParams = [];
						describeTableResult = null;
						dynamoose.aws.ddb.revert();
					});

					it("Should call describeTable with correct parameters", async () => {
						const tableName = "Cat";
						describeTableResult = {
							"Table": {
								"TableStatus": "ACTIVE"
							}
						};
						option.func(tableName, {"id": String});
						await setImmediatePromise();
						expect(describeTableParams).to.eql([{
							"TableName": tableName
						}]);
					});

					it("Should call describeTable with correct parameters multiple times", async () => {
						const tableName = "Cat";
						describeTableResult = () => ({
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
						describeTableResult = () => ({
							"Table": {
								"TableStatus": "CREATING"
							}
						});
						const model = option.func(tableName, {"id": String});
						const errorHandler = () => {};
						process.on("unhandledRejection", errorHandler);
						await utils.timeout(15);
						expect(describeTableParams.length).to.be.above(5);
						process.removeListener("unhandledRejection", errorHandler);
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
