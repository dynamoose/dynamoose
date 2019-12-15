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
					expect(new User(test.input).toDynamo()).to.eql(test.output);
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
					expect(new User(test.input).fromDynamo()).to.eql(test.output);
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
			});
		});
	});
});
