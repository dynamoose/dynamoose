const {expect} = require("chai");
const Document = require("../lib/Document");
const Model = require("../lib/Model");
const aws = require("../lib/aws");
const util = require("util");

describe("Document", () => {
	it("Should be a function", () => {
		expect(Document).to.be.an("function");
	});

	describe("DynamoDB Conversation Methods", () => {
		let User;
		beforeEach(() => {
			User = new Model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
		});
		afterEach(() => {
			User = null;
		});

		describe("toDynamo", () => {
			const tests = [
				{
					"input": {},
					"output": {}
				},
				{
					"input": {"id": 1, "name": "Charlie"},
					"output": {"id": {"N": "1"}, "name": {"S": "Charlie"}}
				}
			];

			tests.forEach((test) => {
				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
					expect(User.toDynamo(test.input)).to.eql(test.output);
				});
			});
		});

		describe("fromDynamo", () => {
			const tests = [
				{
					"input": {},
					"output": {}
				},
				{
					"input": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
					"output": {"id": 1, "name": "Charlie"}
				}
			];

			tests.forEach((test) => {
				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
					expect(User.fromDynamo(test.input)).to.eql(test.output);
				});
			});
		});
	});

	describe("save", () => {
		let User, user, putParams = [], putItemFunction;
		beforeEach(() => {
			Model.defaults = {
				"create": false,
				"waitForActive": false
			};
			aws.ddb.set({
				"putItem": (params) => {
					putParams.push(params);
					return {"promise": putItemFunction};
				}
			});
			User = new Model("User", {"id": Number, "name": String});
			user = new User({"id": 1, "name": "Charlie"});
		});
		afterEach(() => {
			Model.defaults = {};
			aws.ddb.revert();
			User = null;
			user = null;
			putItemFunction = null;
			putParams = [];
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (document) => document.save},
			{"name": "Callback", "func": (document) => util.promisify(document.save)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should save with correct parameters", async () => {
					putItemFunction = () => Promise.resolve();
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					}]);
				});

				it("Should save to correct table with multiple models", async () => {
					const date = Date.now();
					const Robot = new Model("Robot", {"id": Number, "built": Date});
					const robot = new Robot({"id": 2, "built": date});

					putItemFunction = () => Promise.resolve();
					const resultA = await callType.func(user).bind(user)();
					const resultB = await callType.func(robot).bind(robot)();
					expect(resultA).to.eql(user);
					expect(resultB).to.eql(robot);
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					}, {
						"Item": {"id": {"N": "2"}, "built": {"N": `${date}`}},
						"TableName": "Robot"
					}]);
				});

				it("Should return correct result after saving", async () => {
					putItemFunction = () => Promise.resolve();
					const result = await callType.func(user).bind(user)();
					expect(result).to.eql(user);
				});

				it("Should throw error if DynamoDB API returns an error", async () => {
					putItemFunction = () => Promise.reject({"error": "Error"});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					}]);
					expect(result).to.not.exist;
					expect(error).to.eql({"error": "Error"});
				});

				it("Should wait for model to be ready prior to running DynamoDB API call", async () => {
					putItemFunction = () => Promise.resolve();
					let describeTableResponse = {
						"Table": {"TableStatus": "CREATING"}
					};
					aws.ddb.set({
						"describeTable": () => ({
							"promise": () => Promise.resolve(describeTableResponse)
						}),
						"putItem": (params) => {
							putParams.push(params);
							return {"promise": putItemFunction};
						}
					});
					const model = new Model("User2", {"id": Number, "name": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
					const document = new model({"id": 1, "name": "Charlie"});
					await setImmediatePromise();

					let finishedSavingUser = false;
					callType.func(document).bind(document)().then(() => finishedSavingUser = true);

					await setImmediatePromise();
					expect(putParams).to.eql([]);
					expect(finishedSavingUser).to.be.false;
					expect(model.Model.pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await setImmediatePromise();
					expect(putParams).to.eql([{
						"Item": {
							"id": {"N": "1"},
							"name": {"S": "Charlie"}
						},
						"TableName": "User2"
					}]);
					expect(finishedSavingUser).to.be.true;
				});
			});
		});
	});

	describe("Document.isDynamoObject", () => {
		let User;
		beforeEach(() => {
			User = new Model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
		});
		afterEach(() => {
			User = null;
		});

		it("Should be a function", () => {
			expect(User.isDynamoObject).to.be.a("function");
		});

		const tests = [
			{
				"input": {},
				"output": null
			},
			{
				"input": {"N": "1"},
				"output": false
			},
			{
				"input": {"S": "Hello"},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
				"output": true
			},
			{
				"input": {"id": 1, "name": "Charlie"},
				"output": false
			},
			{
				"input": {"id": {"test": "1"}, "name": {"S": "Charlie"}},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "map": {"M": {"test": {"N": "1"}}}},
				"output": true
			},
			{
				"input": {"id": {"N": "1"}, "map": {"M": {"test": {"other": "1"}}}},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "map": {"L": [{"S": "hello"},{"S": "world"}]}},
				"output": true
			},
			{
				"input": {"id": {"N": "1"}, "map": {"L": ["hello", "world"]}},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "map": {"L": [{"hello": {"S": "world"}}, {"test": {"N": "1"}}]}},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "map": {"L": [{"M": {"hello": {"S": "world"}}}, {"M": {"test": {"N": "1"}}}]}},
				"output": true
			},
			{
				"input": {"id": {"N": "1"}, "map": {"L": [{"hello": "world"}, {"test": 1}]}},
				"output": false
			}
		];

		tests.forEach((test) => {
			it(`Should return ${test.output} for ${JSON.stringify(test.input)}`, () => {
				expect(User.isDynamoObject(test.input)).to.eql(test.output);
			});
		});
	});
});

// TODO: move the following function into a utils file
// This function is used to turn `setImmediate` into a promise. This is espescially useful if you want to wait for pending promises to fire and complete before running the asserts on a test.
function setImmediatePromise() {
	return new Promise((resolve) => setImmediate(resolve));
}
