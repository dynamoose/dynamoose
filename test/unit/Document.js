const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const {expect} = chai;
const dynamoose = require("../../dist");
const {Schema, aws} = dynamoose;
const {Document} = require("../../dist/Document");
const util = require("util");
const Error = require("../../dist/Error");
const utils = require("../../dist/utils");
const Internal = require("../../dist/Internal");

describe("Document", () => {
	it("Should be a function", () => {
		expect(Document).to.be.a("function");
	});

	it("Should not have internalProperties if use spread operator on object", () => {
		const User = dynamoose.model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
		const user = new User({"id": 1, "name": "Bob"});
		expect(user[Internal.General.internalProperties]).to.exist;
		expect({...user}[Internal.General.internalProperties]).to.not.exist;
	});

	describe("DynamoDB Conversation Methods", () => {
		let User;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
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
					expect(User.objectToDynamo(test.input)).to.eql(test.output);
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

		describe("Document.prototype.toDynamo", () => {
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
				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)} with settings ${JSON.stringify(test.settings)}`, async () => {
					expect(await new User(test.input).toDynamo(test.settings)).to.eql(test.output);
				});
			});
		});
	});

	describe("document.save", () => {
		let User, user, putParams = [], putItemFunction;
		beforeEach(() => {
			dynamoose.model.defaults.set({
				"create": false,
				"waitForActive": false
			});
			aws.ddb.set({
				"putItem": (params) => {
					putParams.push(params);
					return {"promise": putItemFunction};
				}
			});
			User = dynamoose.model("User", {"id": Number, "name": String});
			user = new User({"id": 1, "name": "Charlie"});
		});
		afterEach(() => {
			dynamoose.model.defaults.set({});
			aws.ddb.revert();
			User = null;
			user = null;
			putItemFunction = null;
			putParams = [];
		});

		it("Should be a function", () => {
			expect(user.save).to.be.a("function");
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
					const Robot = dynamoose.model("Robot", {"id": Number, "built": Number});
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

				it("Should not use default if dynamoose.UNDEFINED used as value for that property", async () => {
					const Robot = dynamoose.model("Robot", {"id": Number, "age": {"type": Number, "default": 1}});
					const robot = new Robot({"id": 2, "age": dynamoose.UNDEFINED});

					putItemFunction = () => Promise.resolve();
					await callType.func(robot).bind(robot)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "2"}},
						"TableName": "Robot"
					}]);
				});

				it("Should return correct result after saving", async () => {
					putItemFunction = () => Promise.resolve();
					const result = await callType.func(user).bind(user)();
					expect(result).to.eql(user);
				});

				it("Should return request if return request is set as setting", async () => {
					const result = await callType.func(user).bind(user)({"return": "request"});
					expect(putParams).to.eql([]);
					expect(result).to.eql({
						"Item": {
							"id": {"N": "1"},
							"name": {"S": "Charlie"}
						},
						"TableName": "User"
					});
				});

				it("Should save with correct object with undefined as value without required or default as first property", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}));
					user = new User({"name": undefined, "id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with undefined as value without required or default as second property", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}));
					user = new User({"id": 1, "name": undefined});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with string set", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Set, "schema": [String]}});
					user = new User({"id": 1, "friends": ["Charlie", "Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Tim", "Bob"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with string set and saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": true}));
					user = new User({"id": 1, "friends": new Set(["Charlie", "Tim", "Bob"])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Tim", "Bob"]}},
						"TableName": "User"
					}]);
				});

				// TODO: reenable this test
				it.skip("Should save with correct object with string set and saveUnknown with specific values", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": ["friends", "friends.1"]}));
					user = new User({"id": 1, "friends": new Set(["Charlie", "Tim", "Bob"])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"SS": ["Tim"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with number set", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "numbers": {"type": Set, "schema": [Number]}});
					user = new User({"id": 1, "numbers": [5, 7]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with number set using saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": true}));
					user = new User({"id": 1, "numbers": new Set([5, 7])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with date set", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "times": {"type": Set, "schema": [Date]}});
					const time = new Date();
					user = new User({"id": 1, "times": [time, new Date(0)]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "times": {"NS": [`${time.getTime()}`, "0"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with buffer", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "data": Buffer});
					user = new User({"id": 1, "data": Buffer.from("testdata")});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with buffer set", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "data": {"type": Set, "schema": [Buffer]}});
					user = new User({"id": 1, "data": [Buffer.from("testdata"), Buffer.from("testdata2")]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with buffer set using saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": true}));
					user = new User({"id": 1, "data": new Set([Buffer.from("testdata"), Buffer.from("testdata2")])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with overwrite set to false", async () => {
					putItemFunction = () => Promise.resolve();
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)({"overwrite": false});
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User",
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						}
					}]);
				});

				it("Should save with correct object with custom type", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date}, {"create": false, "waitForActive": false});
					const birthday = new Date();
					user = new User({"id": 1, "name": "Charlie", birthday});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": `${birthday.getTime()}`}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with custom type passed in as underlying type", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date}, {"create": false, "waitForActive": false});
					const birthday = new Date();
					user = new User({"id": 1, "name": "Charlie", "birthday": birthday.getTime()});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": `${birthday.getTime()}`}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with custom type passed in as underlying type mixed with custom type in array", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": {"type": Array, "schema": [Date]}}, {"create": false, "waitForActive": false});
					const birthday = new Date();
					user = new User({"id": 1, "name": "Charlie", "birthday": [birthday.getTime(), birthday]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"L": [{"N": `${birthday.getTime()}`}, {"N": `${birthday.getTime()}`}]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with object type in schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello", "country": "world"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with object type in schema with properties that don't exist in schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello", "country": "world", "random": "test"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should handle nested attributes inside object correctly for default value", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "default": "world"}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should handle nested attributes inside object correctly for default value with object not passed in", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "default": "world"}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if required property inside object doesn't exist", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello"}});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("address.country is a required property but has no value when trying to save document");
				});

				it("Should throw type mismatch error if passing in wrong type with custom type for object", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": "test"});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected address to be of type object, instead found type string.");
				});

				it("Should throw type mismatch error if passing in wrong type for nested object attribute", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": true}});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected address.country to be of type string, instead found type boolean.");
				});

				it("Should save correct object with nested objects and saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"data": {"country": "world"}, "name": "Home"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with nested objects", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"data": {"type": Object, "schema": {"country": String}}, "name": String}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"data": {"country": "world"}, "name": "Home"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": "world", "zip": 12345}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}, "zip": {"N": "12345"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to one level nested", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": ["address.*"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": "world", "zip": 12345, "metadata": {"name": "Home"}}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}, "zip": {"N": "12345"}, "metadata": {"M": {}}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to all level nested", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": ["address.**"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": "world", "zip": 12345, "metadata": {"name": "Home"}}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}, "zip": {"N": "12345"}, "metadata": {"M": {"name": {"S": "Home"}}}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to one level nested with parent as array", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": ["addresses.*"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "addresses": [{"country": "world", "zip": 12345, "metadata": [{"name": "Home"}]}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "addresses": {"L": [{"M": {}}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to all level nested with parent as array", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": ["addresses.**"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "addresses": [{"country": "world", "zip": 12345, "metadata": [{"name": "Home"}]}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "addresses": {"L": [{"M": {"country": {"S": "world"}, "zip": {"N": "12345"}, "metadata": {"L": [{"M": {"name": {"S": "Home"}}}]}}}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": ["Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array as object schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": String}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": ["Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array and objects within array", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Tim", "id": 1}, {"name": "Bob", "id": 2}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "id": {"N": "1"}}}, {"M": {"name": {"S": "Bob"}, "id": {"N": "2"}}}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with nested array's", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "data": {"type": Array, "schema": [String]}}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Tim", "data": ["hello", "world"]}, {"name": "Bob", "data": ["random", "data"]}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "data": {"L": [{"S": "hello"}, {"S": "world"}]}}}, {"M": {"name": {"S": "Bob"}, "data": {"L": [{"S": "random"}, {"S": "data"}]}}}]}},
						"TableName": "User"
					}]);
				});

				it("Should throw type mismatch error if passing in wrong type for nested array object", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [true]});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected friends.0 to be of type object, instead found type boolean.");
				});

				it("Should throw error if not passing in required property in array", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": {"type": Number, "required": true}, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob"}]});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("friends.0.id is a required property but has no value when trying to save document");
				});

				it("Should throw error if not passing in required property in array for second item", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": {"type": Number, "required": true}, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob", "id": 1}, {"name": "Tim"}]});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("friends.1.id is a required property but has no value when trying to save document");
				});

				it("Should throw error if not passing in required property in array for second item with multi nested objects", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}}}]}}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}]});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("friends.1.addresses.1.country is a required property but has no value when trying to save document");
				});

				it("Should save with correct object with expires set to a number", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}), {"create": false, "waitForActive": false, "expires": 10000});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					const expectedTTL = (Date.now() + 10000) / 1000;
					expect(parseInt(putParams[0].Item.ttl.N)).to.be.within(expectedTTL - 1000, expectedTTL + 1000);
				});

				it("Should store whole number for expires", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}), {"create": false, "waitForActive": false, "expires": 10000});
					user = new User({"id": 1, "name": "Charlie", "ttl": new Date(1002)});
					await callType.func(user).bind(user)();
					expect(parseFloat(putParams[0].Item.ttl.N) % 1).to.eql(0);
				});

				it("Should save with correct object with expires set to object", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}), {"create": false, "waitForActive": false, "expires": {"attribute": "expires", "ttl": 10000}});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					const expectedTTL = (Date.now() + 10000) / 1000;
					expect(parseInt(putParams[0].Item.expires.N)).to.be.within(expectedTTL - 1000, expectedTTL + 1000);
				});

				it("Should save with correct object with expires set to object with no attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}), {"create": false, "waitForActive": false, "expires": {"ttl": 10000}});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					const expectedTTL = (Date.now() + 10000) / 1000;
					expect(parseInt(putParams[0].Item.ttl.N)).to.be.within(expectedTTL - 1000, expectedTTL + 1000);
				});

				it("Should save with correct object with timestamps set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}, {"timestamps": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.createdAt).to.be.a("object");
					expect(putParams[0].Item.updatedAt).to.be.a("object");
					expect(putParams[0].Item.updatedAt.N).to.eql(putParams[0].Item.createdAt.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.createdAt).to.be.a("object");
					expect(putParams[1].Item.updatedAt).to.be.a("object");

					expect(putParams[1].Item.createdAt.N).to.eql(putParams[0].Item.createdAt.N);
					expect(parseInt(putParams[1].Item.updatedAt.N)).to.be.above(parseInt(putParams[0].Item.updatedAt.N));
				});

				it("Should save with correct object with custom timestamps attribute names", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.created).to.be.a("object");
					expect(putParams[0].Item.updated).to.be.a("object");
					expect(putParams[0].Item.updated.N).to.eql(putParams[0].Item.created.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.created).to.be.a("object");
					expect(putParams[1].Item.updated).to.be.a("object");

					expect(putParams[1].Item.created.N).to.eql(putParams[0].Item.created.N);
					expect(parseInt(putParams[1].Item.updated.N)).to.be.above(parseInt(putParams[0].Item.updated.N));
				});

				it("Should save with correct object with custom timestamps with multiple attribute names", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": ["a1", "a2"], "updatedAt": ["b1", "b2"]}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.a1).to.be.a("object");
					expect(putParams[0].Item.a2).to.be.a("object");
					expect(putParams[0].Item.b1).to.be.a("object");
					expect(putParams[0].Item.b2).to.be.a("object");
					expect(putParams[0].Item.a1.N).to.eql(putParams[0].Item.a2.N);
					expect(putParams[0].Item.b1.N).to.eql(putParams[0].Item.b2.N);
					expect(putParams[0].Item.a1.N).to.eql(putParams[0].Item.b1.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.a1).to.be.a("object");
					expect(putParams[1].Item.a2).to.be.a("object");
					expect(putParams[1].Item.b1).to.be.a("object");
					expect(putParams[1].Item.b2).to.be.a("object");

					expect(putParams[1].Item.a1.N).to.eql(putParams[1].Item.a2.N);
					expect(putParams[1].Item.b1.N).to.eql(putParams[1].Item.b2.N);
					expect(parseInt(putParams[1].Item.a1.N)).to.be.below(parseInt(putParams[1].Item.b1.N));
					expect(parseInt(putParams[1].Item.b1.N)).to.be.above(parseInt(putParams[0].Item.b1.N));
					expect(parseInt(putParams[1].Item.b2.N)).to.be.above(parseInt(putParams[0].Item.b2.N));
					expect(parseInt(putParams[1].Item.a1.N)).to.eql(parseInt(putParams[0].Item.a1.N));
					expect(parseInt(putParams[1].Item.a2.N)).to.eql(parseInt(putParams[0].Item.a2.N));
				});

				it("Should save with correct object with timestamps with nested schemas", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String, "friend": new Schema({"name": String}, {"timestamps": true})}, {"timestamps": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "friend": {"name": "Tim"}});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.an("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.friend).to.be.an("object");
					expect(putParams[0].Item.friend.M).to.be.an("object");
					expect(putParams[0].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[0].Item.createdAt).to.be.an("object");
					expect(putParams[0].Item.updatedAt).to.be.an("object");
					expect(putParams[0].Item.friend.M.createdAt).to.be.an("object");
					expect(putParams[0].Item.friend.M.updatedAt).to.be.an("object");
					expect(putParams[0].Item.friend.M.createdAt.N).to.eql(putParams[0].Item.createdAt.N);
					expect(putParams[0].Item.friend.M.updatedAt.N).to.eql(putParams[0].Item.updatedAt.N);
					expect(putParams[0].Item.friend.M.createdAt.N).to.eql(putParams[0].Item.friend.M.updatedAt.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.an("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.friend).to.be.an("object");
					expect(putParams[1].Item.friend.M).to.be.an("object");
					expect(putParams[1].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[1].Item.createdAt).to.be.an("object");
					expect(putParams[1].Item.updatedAt).to.be.an("object");
					expect(putParams[1].Item.friend.M.createdAt).to.be.an("object");
					expect(putParams[1].Item.friend.M.updatedAt).to.be.an("object");
					expect(putParams[1].Item.friend.M.createdAt.N).to.eql(putParams[1].Item.createdAt.N);
					expect(putParams[1].Item.friend.M.updatedAt.N).to.eql(putParams[1].Item.updatedAt.N);
					expect(parseInt(putParams[1].Item.friend.M.createdAt.N)).to.be.below(parseInt(putParams[1].Item.friend.M.updatedAt.N));
				});

				it("Should save with correct object with custom timestamp attributes with nested schemas", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String, "friend": new Schema({"name": String}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}})}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "friend": {"name": "Tim"}});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.an("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.friend).to.be.an("object");
					expect(putParams[0].Item.friend.M).to.be.an("object");
					expect(putParams[0].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[0].Item.created).to.be.an("object");
					expect(putParams[0].Item.updated).to.be.an("object");
					expect(putParams[0].Item.friend.M.created).to.be.an("object");
					expect(putParams[0].Item.friend.M.updated).to.be.an("object");
					expect(putParams[0].Item.friend.M.created.N).to.eql(putParams[0].Item.created.N);
					expect(putParams[0].Item.friend.M.updated.N).to.eql(putParams[0].Item.updated.N);
					expect(putParams[0].Item.friend.M.created.N).to.eql(putParams[0].Item.friend.M.updated.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.an("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.friend).to.be.an("object");
					expect(putParams[1].Item.friend.M).to.be.an("object");
					expect(putParams[1].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[1].Item.created).to.be.an("object");
					expect(putParams[1].Item.updated).to.be.an("object");
					expect(putParams[1].Item.friend.M.created).to.be.an("object");
					expect(putParams[1].Item.friend.M.updated).to.be.an("object");
					expect(putParams[1].Item.friend.M.created.N).to.eql(putParams[1].Item.created.N);
					expect(putParams[1].Item.friend.M.updated.N).to.eql(putParams[1].Item.updated.N);
					expect(parseInt(putParams[1].Item.friend.M.created.N)).to.be.below(parseInt(putParams[1].Item.friend.M.updated.N));
				});

				it("Should save with correct object with multiple custom timestamps attributes with nested schemas", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String, "friend": new Schema({"name": String}, {"timestamps": {"createdAt": ["createdC", "createdD"], "updatedAt": ["updatedC", "updatedD"]}})}, {"timestamps": {"createdAt": ["createdA", "createdB"], "updatedAt": ["updatedA", "updatedB"]}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "friend": {"name": "Tim"}});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.an("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.friend).to.be.an("object");
					expect(putParams[0].Item.friend.M).to.be.an("object");
					expect(putParams[0].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[0].Item.createdA).to.be.an("object");
					expect(putParams[0].Item.createdB).to.be.an("object");
					expect(putParams[0].Item.updatedA).to.be.an("object");
					expect(putParams[0].Item.updatedB).to.be.an("object");
					expect(putParams[0].Item.friend.M.createdC).to.be.an("object");
					expect(putParams[0].Item.friend.M.createdD).to.be.an("object");
					expect(putParams[0].Item.friend.M.updatedC).to.be.an("object");
					expect(putParams[0].Item.friend.M.updatedD).to.be.an("object");
					expect(putParams[0].Item.friend.M.createdC.N).to.eql(putParams[0].Item.createdA.N);
					expect(putParams[0].Item.friend.M.createdD.N).to.eql(putParams[0].Item.createdB.N);
					expect(putParams[0].Item.friend.M.updatedC.N).to.eql(putParams[0].Item.updatedA.N);
					expect(putParams[0].Item.friend.M.updatedD.N).to.eql(putParams[0].Item.updatedB.N);
					expect(putParams[0].Item.friend.M.createdC.N).to.eql(putParams[0].Item.friend.M.updatedC.N);
					expect(putParams[0].Item.friend.M.createdD.N).to.eql(putParams[0].Item.friend.M.updatedD.N);

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.an("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.friend).to.be.an("object");
					expect(putParams[1].Item.friend.M).to.be.an("object");
					expect(putParams[1].Item.friend.M.name).to.eql({"S": "Tim"});
					expect(putParams[1].Item.createdA).to.be.an("object");
					expect(putParams[1].Item.createdB).to.be.an("object");
					expect(putParams[1].Item.updatedA).to.be.an("object");
					expect(putParams[1].Item.updatedB).to.be.an("object");
					expect(putParams[1].Item.friend.M.createdC).to.be.an("object");
					expect(putParams[1].Item.friend.M.createdD).to.be.an("object");
					expect(putParams[1].Item.friend.M.updatedC).to.be.an("object");
					expect(putParams[1].Item.friend.M.updatedD).to.be.an("object");
					expect(putParams[1].Item.friend.M.createdC.N).to.eql(putParams[1].Item.createdA.N);
					expect(putParams[1].Item.friend.M.createdD.N).to.eql(putParams[1].Item.createdB.N);
					expect(putParams[1].Item.friend.M.updatedC.N).to.eql(putParams[1].Item.updatedA.N);
					expect(putParams[1].Item.friend.M.updatedD.N).to.eql(putParams[1].Item.updatedB.N);
					expect(parseInt(putParams[1].Item.friend.M.createdC.N)).to.be.below(parseInt(putParams[1].Item.friend.M.updatedC.N));
					expect(parseInt(putParams[1].Item.friend.M.createdD.N)).to.be.below(parseInt(putParams[1].Item.friend.M.updatedD.N));
				});

				it("Should save with correct object with timestamps but no createdAt timestamp", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": null, "updatedAt": "updatedAt"}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.createdAt).to.not.exist;
					expect(putParams[0].Item.updatedAt).to.be.a("object");

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.createdAt).to.not.exist;
					expect(putParams[1].Item.updatedAt).to.be.a("object");
					expect(parseInt(putParams[1].Item.updatedAt.N)).to.be.above(parseInt(putParams[0].Item.updatedAt.N));
				});

				it("Should save with correct object with timestamps but no updatedAt timestamp", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": "createdAt", "updatedAt": false}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.createdAt).to.be.a("object");
					expect(putParams[0].Item.updatedAt).to.not.exist;

					await utils.timeout(5);

					user.name = "Bob"; // eslint-disable-line require-atomic-updates
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.createdAt).to.be.a("object");
					expect(putParams[1].Item.updatedAt).to.not.exist;

					expect(putParams[1].Item.createdAt.N).to.eql(putParams[0].Item.createdAt.N);
				});

				it("Should throw type mismatch error if passing in wrong type with custom type", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "birthday": "test"});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected birthday to be of type date, instead found type string.");
				});

				it("Should save with correct object with more properties than in schema", async () => {
					putItemFunction = () => Promise.resolve();
					user = new User({"id": 1, "name": "Charlie", "hello": "world"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with undefined attributes in schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": Number}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default values", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "default": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default value as function", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "default": () => 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default value as async function", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "default": async () => 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should throw type mismatch error if passing in wrong type for default value", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "default": () => true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected age to be of type number, instead found type boolean.");
				});

				it("Should save with correct object with default value as custom type", async () => {
					putItemFunction = () => Promise.resolve();
					const date = new Date();
					User = dynamoose.model("User", {"id": Number, "timestamp": {"type": Date, "default": () => date}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "timestamp": {"N": `${date.getTime()}`}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with validation value", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 5});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation value", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("age with a value of 4 had a validation error when trying to save the document");
				});

				// This test is here since if you want to enforce that the property exists, you must use both `required` & `validate`, not just `validate`
				it("Should not run validation function if property doesn't exist", async () => {
					putItemFunction = () => Promise.resolve();
					let didRun = false;
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": () => {
						didRun = true; return true;
					}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(didRun).to.be.false;
				});

				it("Should run validation function if property is falsy", async () => {
					putItemFunction = () => Promise.resolve();
					let didRun = false;
					User = dynamoose.model("User", {"id": Number, "data": {"type": Boolean, "validate": () => {
						didRun = true; return true;
					}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "data": false});
					await callType.func(user).bind(user)();
					expect(didRun).to.be.true;
				});

				it("Should save with correct object with validation function", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 6});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "6"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation function", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("age with a value of 4 had a validation error when trying to save the document");
				});

				it("Should save with correct object with validation async function", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": async (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 6});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "6"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation async function", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "validate": async (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("age with a value of 4 had a validation error when trying to save the document");
				});

				it("Should save with correct object with validation RegExp", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "validate": /.../gu}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation RegExp", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "validate": /.../gu}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "a"});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("name with a value of a had a validation error when trying to save the document");
				});

				it("Should save with correct object with required property", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "required": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if required property not passed in", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "required": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("name is a required property but has no value when trying to save document");
				});

				it("Should save with correct object with enum property", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "enum": ["Tim", "Tom"]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if value does not match value in enum property", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "enum": ["Tim", "Tom"]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Bob"});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("name must equal [\"Tim\",\"Tom\"], but is set to Bob");
				});

				it("Should save with correct object with forceDefault property", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Tim", "forceDefault": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tim"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to an array with correct attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": ["name"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to false", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new Schema({"id": Number}, {"saveUnknown": false}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with set function for attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": (val) => `${val}-set`}});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie-set"}},
						"TableName": "User"
					}]);
				});

				it("Should pass in correct original variable into set function", async () => {
					let newVal, oldVal;
					aws.ddb.set({
						"putItem": (params) => {
							putParams.push(params);
							return {"promise": putItemFunction};
						},
						"getItem": () => ({
							"promise": () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie-set"}}})
						})
					});

					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": (newValA, oldValA) => {
						newVal = newValA;
						oldVal = oldValA;
						return oldValA;
					}}});
					user = await User.get("1");
					user.name = "Charlie";
					await callType.func(user).bind(user)();
					expect(newVal).to.eql("Charlie");
					expect(oldVal).to.eql("Charlie-set");
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie-set"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with async set function for attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": async (val) => `${val}-set`}});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie-set"}},
						"TableName": "User"
					}]);
				});

				it("Should work correctly if attributes added to document after initalization", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
					user = new User();
					user.id = 1;
					user.name = "Charlie";
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					}]);
				});

				describe("Populate", () => {
					let Game, game;
					beforeEach(() => {
						Game = dynamoose.model("Game", {"id": Number, "name": String, "user": User});
						game = new Game({"id": 2, "name": "Game 2", user});
					});
					afterEach(() => {
						Game = null;
						game = null;
					});

					it("Should save with correct object with document instance passed in", async () => {
						putItemFunction = () => Promise.resolve();
						await callType.func(game).bind(game)();
						expect(putParams).to.eql([{
							"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"N": "1"}},
							"TableName": "Game"
						}]);
					});

					it("Should save with correct object with id reference passed in", async () => {
						putItemFunction = () => Promise.resolve();
						game = new Game({"id": 2, "name": "Game 2", "user": user.id});
						await callType.func(game).bind(game)();
						expect(putParams).to.eql([{
							"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"N": "1"}},
							"TableName": "Game"
						}]);
					});

					describe("Set", () => {
						beforeEach(() => {
							Game = dynamoose.model("Game", {"id": Number, "name": String, "user": {"type": Set, "schema": [User]}});
							game = new Game({"id": 2, "name": "Game 2", "user": [user]});
						});

						it("Should save with correct object with document instance as set passed in", async () => {
							putItemFunction = () => Promise.resolve();
							await callType.func(game).bind(game)();
							expect(putParams).to.eql([{
								"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"NS": ["1"]}},
								"TableName": "Game"
							}]);
						});

						it("Should save with correct object with id reference as set passed in", async () => {
							putItemFunction = () => Promise.resolve();
							game = new Game({"id": 2, "name": "Game 2", "user": [user.id]});
							await callType.func(game).bind(game)();
							expect(putParams).to.eql([{
								"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"NS": ["1"]}},
								"TableName": "Game"
							}]);
						});
					});

					describe("rangeKey", () => {
						beforeEach(() => {
							User = dynamoose.model("User", {"pk": {"type": String, "hashKey": true}, "sk": {"type": String, "rangeKey": true}, "name": String});
							user = new User({"pk": "hello", "sk": "world", "name": "Charlie"});
							Game = dynamoose.model("Game", {"id": Number, "name": String, "user": User});
							game = new Game({"id": 2, "name": "Game 2", user});
						});

						it("Should save with correct object with document instance passed in", async () => {
							putItemFunction = () => Promise.resolve();
							await callType.func(game).bind(game)();
							expect(putParams).to.eql([{
								"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"M": {"pk": {"S": "hello"}, "sk": {"S": "world"}}}},
								"TableName": "Game"
							}]);
						});

						it("Should save with correct object with id reference passed in", async () => {
							putItemFunction = () => Promise.resolve();
							game = new Game({"id": 2, "name": "Game 2", "user": {"pk": user.pk, "sk": user.sk}});
							await callType.func(game).bind(game)();
							expect(putParams).to.eql([{
								"Item": {"id": {"N": "2"}, "name": {"S": "Game 2"}, "user": {"M": {"pk": {"S": "hello"}, "sk": {"S": "world"}}}},
								"TableName": "Game"
							}]);
						});

						it("Should throw error if passing object with one property in", () => {
							putItemFunction = () => Promise.resolve();
							game = new Game({"id": 2, "name": "Game 2", "user": {"pk": user.pk}});
							return expect(callType.func(game).bind(game)()).to.be.rejectedWith("Expected user to be of type User, instead found type object.");
						});

						it("Should throw error if passing object with one value passed in in", () => {
							putItemFunction = () => Promise.resolve();
							game = new Game({"id": 2, "name": "Game 2", "user": user.pk});
							return expect(callType.func(game).bind(game)()).to.be.rejectedWith("Expected user to be of type User, instead found type string.");
						});

						it("Should throw error if trying to create document with property type as set model", () => {
							const Game = dynamoose.model("Game", {"id": Number, "name": String, "user": {"type": Set, "schema": [User]}});
							return expect(Game.create({"id": 2, "name": "Game 2", "user": [1]})).to.be.rejectedWith("user with type: model is not allowed to be a set");
						});
					});

					it("Should throw error if passing random type in", () => {
						putItemFunction = () => Promise.resolve();
						game = new Game({"id": 2, "name": "Game 2", "user": "hello"});
						return expect(callType.func(game).bind(game)()).to.be.rejectedWith("Expected user to be of type User, instead found type string.");
					});
				});

				it("Should throw error if object contains properties that have type mismatch with schema", () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": String, "age": Number}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "age": "test"});

					return expect(callType.func(user).bind(user)()).to.be.rejectedWith("Expected age to be of type number, instead found type string.");
				});

				it("Should save with correct object with combine attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "data1": "hello", "data2": "world"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data1": {"S": "hello"}, "data2": {"S": "world"}, "combine": {"S": "hello,world"}},
						"TableName": "User"
					}]);
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
					const model = dynamoose.model("User2", {"id": Number, "name": String}, {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
					const document = new model({"id": 1, "name": "Charlie"});
					await utils.set_immediate_promise();

					let finishedSavingUser = false;
					callType.func(document).bind(document)().then(() => finishedSavingUser = true);

					await utils.set_immediate_promise();
					expect(putParams).to.eql([]);
					expect(finishedSavingUser).to.be.false;
					expect(model.Model.pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await model.Model.pendingTaskPromise();
					await utils.set_immediate_promise();
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

	describe("document.original", () => {
		let model;
		beforeEach(() => {
			model = dynamoose.model("User", {"id": Number}, {"create": false, "waitForActive": false});
		});
		afterEach(() => {
			model = null;
		});

		it("Should be a function", () => {
			expect(new model({}).original).to.be.a("function");
		});

		it("Should return null if not retrieving from database", () => {
			expect(new model({}).original()).to.eql(null);
		});

		it("Should return original object if retrieving from database", () => {
			expect(new model({"id": 1}, {"type": "fromDynamo"}).original()).to.eql({"id": 1});
		});

		it("Should return original object if retrieving from database even after modifying document", () => {
			const document = new model({"id": 1}, {"type": "fromDynamo"});
			document.id = 2;
			expect(document.original()).to.eql({"id": 1});
			expect({...document}).to.eql({"id": 2});
		});

		it("Shouldn't return DynamoDB object if retrieving from database", () => {
			expect(new model({"id": {"N": "1"}}, {"type": "fromDynamo"}).original()).to.eql({"id": 1});
		});

		it("Shouldn't return DynamoDB object if retrieving from database even after modifying document", () => {
			const document = new model({"id": {"N": "1"}}, {"type": "fromDynamo"});
			document.id = 2;
			expect(document.original()).to.eql({"id": 1});
			expect({...document}).to.eql({"id": 2});
		});

		it("Shouldn't modify inner array after modifying document", () => {
			const document = new model({"id": {"N": "1"}, "array": {"L": [{"S": "1"}]}}, {"type": "fromDynamo"});
			document.array.push("2");
			expect(document.original()).to.eql({"id": 1, "array": ["1"]});
			expect({...document}).to.eql({"id": 1, "array": ["1", "2"]});
		});

		it("Shouldn't modify inner object after modifying document", () => {
			const document = new model({"id": {"N": "1"}, "object": {"M": {"hello": {"S": "world"}}}}, {"type": "fromDynamo"});
			document.object.test = "item";
			expect(document.original()).to.eql({"id": 1, "object": {"hello": "world"}});
			expect({...document}).to.eql({"id": 1, "object": {"hello": "world", "test": "item"}});
		});
	});

	describe("document.toJSON", () => {
		let model;
		beforeEach(() => {
			model = dynamoose.model("User", {"id": Number}, {"create": false, "waitForActive": false});
		});
		afterEach(() => {
			model = null;
		});

		it("Should be a function", () => {
			expect(new model({}).toJSON).to.be.a("function");
		});

		it("Should set result constructor to Object", () => {
			expect(new model({}).toJSON().constructor).to.eql(Object);
			expect(new model({}).constructor).to.not.eql(Object);
		});

		it("Should return empty object if no properties in document", () => {
			expect(new model({}).toJSON()).to.eql({});
		});

		it("Should return JSON object", () => {
			expect(new model({"id": 1}).toJSON()).to.eql({"id": 1});
		});

		it("Should not return object that equals document", () => {
			const document = new model({"id": 1});
			expect(document.toJSON()).to.not.eql(document);
		});

		it("Should return JSON object even after modifying", () => {
			const document = new model({"id": 1});
			document.id = 2;
			expect(document.toJSON()).to.eql({"id": 2});
		});
	});

	describe("document.delete", () => {
		let User, user, deleteParams, deleteItemFunction;
		beforeEach(() => {
			dynamoose.model.defaults.set({
				"create": false,
				"waitForActive": false
			});
			aws.ddb.set({
				"deleteItem": (params) => {
					deleteParams = params;
					return {"promise": deleteItemFunction};
				}
			});
			User = dynamoose.model("User", {"id": Number, "name": String});
			user = new User({"id": 1, "name": "Charlie"});
		});
		afterEach(() => {
			dynamoose.model.defaults.set({});
			aws.ddb.revert();
			User = null;
			user = null;
			deleteParams = null;
			deleteItemFunction = null;
		});

		it("Should be a function", () => {
			expect(user.delete).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (document) => document.delete},
			{"name": "Callback", "func": (document) => util.promisify(document.delete)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should deleteItem with correct parameters", async () => {
					deleteItemFunction = () => Promise.resolve();
					await callType.func(user).bind(user)();
					expect(deleteParams).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					});
				});

				it("Should deleteItem with correct parameters with a range key", async () => {
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});
					user = new User({"id": 1, "name": "Charlie", "type": "admin"});

					deleteItemFunction = () => Promise.resolve();
					const func = (document) => util.promisify(document.delete);
					await func(user).bind(user)();
					expect(deleteParams).to.eql({
						"Key": {"id": {"N": "1"}, "name": {"S": "Charlie"}},
						"TableName": "User"
					});
				});

				it("Should throw error if DynamoDB API returns an error", () => {
					deleteItemFunction = () => Promise.reject({"error": "ERROR"});
					return expect(callType.func(user).bind(user)()).to.be.rejectedWith({"error": "ERROR"});
				});
			});
		});
	});

	describe("document.populate", () => {
		let User, user, Game, game, getItemParams = [], getItemFunction;
		beforeEach(() => {
			dynamoose.model.defaults.set({
				"create": false,
				"waitForActive": false
			});
			aws.ddb.set({
				"getItem": (params) => {
					getItemParams.push(params);
					return {"promise": getItemFunction};
				}
			});
			User = dynamoose.model("User", {"id": Number, "name": String});
			user = new User({"id": 1, "name": "Charlie"});
			Game = dynamoose.model("Game", {"id": Number, "name": String, "user": User});
			game = new Game({"id": 2, "name": "Game 2", "user": 1});
		});
		afterEach(() => {
			dynamoose.model.defaults.set({});
			aws.ddb.revert();
			User = null;
			user = null;
			Game = null;
			game = null;
			getItemParams = [];
			getItemFunction = null;
		});

		it("Should be a function", () => {
			expect(game.populate).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (document) => document.populate},
			{"name": "Callback", "func": (document) => util.promisify(document.populate)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should expand to correct object", async () => {
					getItemFunction = () => Promise.resolve({
						"Item": {...user}
					});
					const res = await callType.func(game).bind(game)();
					expect(getItemParams).to.eql([{
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
					expect(res.toJSON()).to.eql({
						"id": 2,
						"name": "Game 2",
						"user": {
							"id": 1,
							"name": "Charlie"
						}
					});
					expect(res).to.be.a.instanceOf(Document);
				});

				it("Should not call getItem if sub document already exists", async () => {
					getItemFunction = () => Promise.resolve({
						"Item": {...user}
					});
					game = new Game({"id": 2, "name": "Game 2", "user": user});
					const res = await callType.func(game).bind(game)();
					expect(getItemParams).to.eql([]);
					expect(res.toJSON()).to.eql({
						"id": 2,
						"name": "Game 2",
						"user": {
							"id": 1,
							"name": "Charlie"
						}
					});
				});

				describe("Own Model (this)", () => {
					let child, parent;
					beforeEach(() => {
						User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.THIS});
						parent = new User({"id": 1, "name": "Tom"});
						child = new User({"id": 2, "name": "Tim", "parent": 1});
					});

					it("Should expand to correct object", async () => {
						getItemFunction = () => Promise.resolve({
							"Item": {...parent}
						});
						const res = await callType.func(child).bind(child)();
						expect(getItemParams).to.eql([{
							"Key": {
								"id": {
									"N": "1"
								}
							},
							"TableName": "User"
						}]);
						expect(res.toJSON()).to.eql({
							"id": 2,
							"name": "Tim",
							"parent": {
								"id": 1,
								"name": "Tom"
							}
						});
					});

					it("Should not call getItem if sub document already exists", async () => {
						getItemFunction = () => Promise.resolve({
							"Item": {...parent}
						});
						child = new User({"id": 2, "name": "Tim", "parent": parent});
						const res = await callType.func(child).bind(child)();
						expect(getItemParams).to.eql([]);
						expect(res.toJSON()).to.eql({
							"id": 2,
							"name": "Tim",
							"parent": {
								"id": 1,
								"name": "Tom"
							}
						});
					});
				});
			});
		});
	});

	describe("conformToSchema", () => {
		beforeEach(() => {
			dynamoose.model.defaults.set({
				"create": false,
				"waitForActive": false
			});
		});
		afterEach(() => {
			dynamoose.model.defaults.set({});
		});

		const tests = [
			{"schema": {"id": Number, "name": String}, "input": {"id": 1, "name": "Charlie", "hello": "world"}, "output": {"id": 1, "name": "Charlie"}},
			{"schema": {"id": Number, "name": String}, "input": {"id": 1}, "output": {"id": 1}},
			{"schema": {"id": Number, "name": String, "age": Number}, "input": {"id": 1, "name": "Charlie", "age": "test"}, "error": "test"},
			{"schema": {"id": Number, "name": String, "age": Number, "parents": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "age": Number}}]}}, "input": {"id": 1, "name": "Bob", "age": 2, "parents": [{"name": "Tim", "age": 3}, {"name": "Sara", "age": 4}]}, "output": {"id": 1, "name": "Bob", "age": 2, "parents": [{"name": "Tim", "age": 3}, {"name": "Sara", "age": 4}]}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "age": Number, "parent": new dynamoose.Schema({"name": String, "age": Number})}), "input": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}, "output": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "age": Number, "parent": {"type": Object, "schema": new dynamoose.Schema({"name": String, "age": Number})}}), "input": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}, "output": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "age": Number, "parents": {"type": Array, "schema": [new dynamoose.Schema({"name": String, "age": Number})]}}), "input": {"id": 1, "name": "Bob", "age": 2, "parents": [{"name": "Tim", "age": 3}, {"name": "Sara", "age": 4}]}, "output": {"id": 1, "name": "Bob", "age": 2, "parents": [{"name": "Tim", "age": 3}, {"name": "Sara", "age": 4}]}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "parent": new dynamoose.Schema({"name": String}, {"saveUnknown": ["age"]})}, {"saveUnknown": ["age"]}), "input": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}, "output": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3}}, "settings": {"saveUnknown": true}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "parent": new dynamoose.Schema({"name": String}, {"saveUnknown": true})}, {"saveUnknown": ["age"]}), "input": {"id": 1, "name": "Bob", "age": 2, "favoriteColor": "gray", "parent": {"name": "Tim", "age": 3, "favoriteColor": "blue"}}, "output": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim", "age": 3, "favoriteColor": "blue"}}, "settings": {"saveUnknown": true}},
			{"schema": new dynamoose.Schema({"id": Number, "name": String, "parent": new dynamoose.Schema({"name": String}, {})}, {"saveUnknown": ["age"]}), "input": {"id": 1, "name": "Bob", "age": 2, "favoriteColor": "gray", "parent": {"name": "Tim", "age": 3, "favoriteColor": "blue"}}, "output": {"id": 1, "name": "Bob", "age": 2, "parent": {"name": "Tim"}}, "settings": {"saveUnknown": true}},
			{"schema": {"id": Number, "name": String}, "input": {"id": 1}, "settings": {"type": "toDynamo"}, "output": {"id": 1}},
			{"schema": {"id": Number, "name": String, "age": Number}, "input": {"id": 1, "name": "Charlie", "age": "test"}, "error": "test"}
		];

		tests.forEach((test) => {
			if (test.error) {
				it(`Should throw error ${test.error} correctly for input ${JSON.stringify(test.input)} and schema ${JSON.stringify(test.schema)}`, () => {
					const User = dynamoose.model("User", test.schema);
					const user = new User(test.input);

					return expect(user.conformToSchema(test.settings || undefined)).to.be.rejectedWith("Expected age to be of type number, instead found type string.");
				});
			} else {
				it(`Should modify ${JSON.stringify(test.input)} correctly for schema ${JSON.stringify(test.schema)}`, async () => {
					const User = dynamoose.model("User", test.schema);
					const user = new User(test.input);

					const obj = await user.conformToSchema(test.settings || undefined);

					expect({...user}).to.eql(test.output);
					expect(obj).to.eql(user);
				});
			}
		});
	});

	describe("Document.isDynamoObject", () => {
		let User;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
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
				"input": {"id": {"N": "1"}, "map": {"L": [{"S": "hello"}, {"S": "world"}]}},
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
			},
			{
				"input": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}},
				"output": true
			},
			{
				"input": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}},
				"output": true
			},
			{
				"input": {"id": {"N": "1"}, "friends": [{"S": "Tim"}, {"S": "Bob"}]},
				"output": false
			},
			{
				"input": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}},
				"output": true
			},
			{
				"input": {"data": {"M": {}}},
				"output": true
			},
			{
				"input": {"data": {"L": []}},
				"output": true
			},
			{
				"input": {"prop": undefined},
				"output": false
			},
			{
				"input": {"prop": null},
				"output": false
			}
		];

		tests.forEach((test) => {
			it(`Should return ${test.output} for ${JSON.stringify(test.input)}`, () => {
				expect(User.isDynamoObject(test.input)).to.eql(test.output);
			});
		});
	});

	describe("Document.attributesWithSchema", () => {
		it("Should be a function", () => {
			expect(dynamoose.model("User", {"id": Number}, {"create": false, "waitForActive": false}).attributesWithSchema).to.be.a("function");
		});

		const tests = [
			{
				"input": {"id": 1},
				"output": ["id"],
				"schema": {"id": Number}
			},
			{
				"input": {"id": 1, "friends": [{"name": "Bob", "id": 1}, {"name": "Tim"}]},
				"output": ["id", "friends", "friends.0", "friends.1", "friends.0.id", "friends.1.id", "friends.0.name", "friends.1.name"],
				"schema": {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": {"type": Number, "required": true}, "name": String}}]}}
			},
			{
				"input": {"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}]},
				"output": ["id", "friends", "friends.0", "friends.1", "friends.0.name", "friends.1.name", "friends.0.addresses", "friends.1.addresses", "friends.0.addresses.0", "friends.1.addresses.0", "friends.1.addresses.1", "friends.0.addresses.0.country", "friends.1.addresses.0.country", "friends.1.addresses.1.country", "friends.0.addresses.0.zip", "friends.1.addresses.0.zip", "friends.1.addresses.1.zip"],
				"schema": {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}, "zip": Number}}]}}}]}}
			},
			{
				"input": {"id": 1},
				"output": ["id", "address", "address.street", "address.country"],
				"schema": {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "default": "world"}}}}
			},
			{
				"input": {"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}, {"name": "Billy"}]},
				"output": ["id", "friends", "friends.0", "friends.1", "friends.0.name", "friends.1.name", "friends.0.addresses", "friends.1.addresses", "friends.0.addresses.0", "friends.1.addresses.0", "friends.1.addresses.1", "friends.0.addresses.0.country", "friends.1.addresses.0.country", "friends.1.addresses.1.country", "friends.0.addresses.0.zip", "friends.1.addresses.0.zip", "friends.1.addresses.1.zip", "friends.2", "friends.2.name", "friends.2.addresses", "friends.2.addresses.0", "friends.2.addresses.0.zip", "friends.2.addresses.0.country"],
				"schema": {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}, "zip": Number}}]}}}]}}
			},
			{
				"input": {"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}, {"name": "Billy", "addresses": []}]},
				"output": ["id", "friends", "friends.0", "friends.1", "friends.0.name", "friends.1.name", "friends.0.addresses", "friends.1.addresses", "friends.0.addresses.0", "friends.1.addresses.0", "friends.1.addresses.1", "friends.0.addresses.0.country", "friends.1.addresses.0.country", "friends.1.addresses.1.country", "friends.0.addresses.0.zip", "friends.1.addresses.0.zip", "friends.1.addresses.1.zip", "friends.2", "friends.2.name", "friends.2.addresses", "friends.2.addresses.0", "friends.2.addresses.0.zip", "friends.2.addresses.0.country"],
				"schema": {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}, "zip": Number}}]}}}]}}
			}
		];

		tests.forEach((test) => {
			it(`Should return ${JSON.stringify(test.output)} for input of ${JSON.stringify(test.input)} with a schema of ${JSON.stringify(test.schema)}`, async () => {
				const model = dynamoose.model("User", test.schema, {"create": false, "waitForActive": false});
				expect((await model.attributesWithSchema(test.input, model.Model)).sort()).to.eql(test.output.sort());
			});
		});
	});

	describe("Document.objectFromSchema", () => {
		it("Should be a function", () => {
			expect(dynamoose.model("User", {"id": Number}, {"create": false, "waitForActive": false}).objectFromSchema).to.be.a("function");
		});

		const tests = [
			{
				"input": {"id": 1},
				"output": {"id": 1},
				"schema": {"id": Number}
			},
			{
				"input": {"id": 1, "name": "Charlie"},
				"output": {"id": 1},
				"schema": {"id": Number}
			},
			{
				"input": {"id": 1, "name": "Charlie"},
				"output": {"id": 1, "name": "Charlie"},
				"schema": {"id": Number, "name": String}
			},
			{
				"input": [{"id": 1, "name": undefined}, {"defaults": true}],
				"output": {"id": 1, "name": undefined},
				"schema": {"id": Number, "name": String}
			},
			{
				"input": [{"id": 1, "name": undefined}, {"defaults": true}],
				"output": {"id": 1, "name": "Charlie"},
				"schema": {"id": Number, "name": {"type": String, "default": "Charlie"}}
			},
			{
				"input": [{"id": 1, "name": dynamoose.UNDEFINED}, {"defaults": true}],
				"output": {"id": 1, "name": undefined},
				"schema": {"id": Number, "name": {"type": String, "default": "Charlie"}}
			},
			// TODO: uncomment these lines below
			// {
			// 	"input": {"id": "1"},
			// 	"output": {"id": 1},
			// 	"schema": {"id": Number}
			// },
			// {
			// 	"input": {"id": "1.5"},
			// 	"output": {"id": 1},
			// 	"schema": {"id": Number}
			// },
			{
				"input": {"id": "hello"},
				"error": new Error.TypeMismatch("Expected id to be of type number, instead found type string."),
				"schema": {"id": Number}
			},
			// Defaults
			{
				"input": {},
				"output": {},
				"schema": {"id": {"type": String, "default": "id"}}
			},
			{
				"input": [{}, {"defaults": true}],
				"output": {"id": "id"},
				"schema": {"id": {"type": String, "default": "id"}}
			},
			{
				"input": {},
				"output": {},
				"schema": {"id": {"type": String, "default": () => "id"}}
			},
			{
				"input": [{}, {"defaults": true}],
				"output": {"id": "id"},
				"schema": {"id": {"type": String, "default": () => "id"}}
			},
			{
				"input": {},
				"output": {},
				"schema": {"id": {"type": String, "default": async () => "id"}}
			},
			{
				"input": [{}, {"defaults": true}],
				"output": {"id": "id"},
				"schema": {"id": {"type": String, "default": async () => "id"}}
			},
			{
				"input": {},
				"output": {},
				"schema": {"id": {"type": String, "validate": async () => "id"}}
			},
			{
				"input": [{}, {"defaults": true}],
				"output": {"id": "id"},
				"schema": {"id": {"type": String, "default": async () => "id"}}
			},
			{
				"input": [{}, {"defaults": true}],
				"output": {"id": 0},
				"schema": {"id": {"type": Number, "default": 0}}
			},
			{
				"input": [{"id": 1}, {"type": "fromDynamo", "defaults": true}],
				"schema": () => {
					const Item = dynamoose.model("Item", {"id": Number, "data": String}, {"create": false, "waitForActive": false});
					return {"id": Number, "data": {"type": Item, "default": true}};
				},
				"error": new Error.ValidationError("Expected data to be of type Item, instead found type boolean.")
			},
			{
				"input": [{"id": "test"}, {"validate": true}],
				"error": new Error.ValidationError("id with a value of test had a validation error when trying to save the document"),
				"schema": {"id": {"type": String, "validate": (val) => val.length > 5}}
			},
			// Validations
			{
				"input": [{"id": "test"}, {"validate": true}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "age": {"type": Number, "validate": (val) => val > 0}}
			},
			{
				"input": {"id": "test"},
				"output": {"id": "test"},
				"schema": {"id": {"type": String, "validate": async (val) => val.length > 5}}
			},
			{
				"input": [{"id": "test"}, {"validate": true}],
				"error": new Error.ValidationError("id with a value of test had a validation error when trying to save the document"),
				"schema": {"id": {"type": String, "validate": async (val) => val.length > 5}}
			},
			{
				"input": [{"id": "hello world"}, {"validate": true}],
				"output": {"id": "hello world"},
				"schema": {"id": {"type": String, "validate": async (val) => val.length > 5}}
			},
			{
				"input": {"id": "test"},
				"output": {"id": "test"},
				"schema": {"id": {"type": String, "validate": (val) => val.length > 5}}
			},
			{
				"input": [{"id": "test"}, {"validate": true}],
				"error": new Error.ValidationError("id with a value of test had a validation error when trying to save the document"),
				"schema": {"id": {"type": String, "validate": (val) => val.length > 5}}
			},
			{
				"input": [{"id": "hello world"}, {"validate": true}],
				"output": {"id": "hello world"},
				"schema": {"id": {"type": String, "validate": (val) => val.length > 5}}
			},
			{
				"input": {"id": "test"},
				"output": {"id": "test"},
				"schema": {"id": {"type": String, "validate": /ID_.+/gu}}
			},
			{
				"input": [{"id": "test"}, {"validate": true}],
				"error": new Error.ValidationError("id with a value of test had a validation error when trying to save the document"),
				"schema": {"id": {"type": String, "validate": /ID_.+/gu}}
			},
			{
				"input": [{"id": "ID_test"}, {"validate": true}],
				"output": {"id": "ID_test"},
				"schema": {"id": {"type": String, "validate": /ID_.+/gu}}
			},
			{
				"input": {"id": "test"},
				"output": {"id": "test"},
				"schema": {"id": {"type": String, "validate": "ID_test"}}
			},
			{
				"input": [{"id": "test"}, {"validate": true}],
				"error": new Error.ValidationError("id with a value of test had a validation error when trying to save the document"),
				"schema": {"id": {"type": String, "validate": "ID_test"}}
			},
			{
				"input": [{"id": "ID_test"}, {"validate": true}],
				"output": {"id": "ID_test"},
				"schema": {"id": {"type": String, "validate": "ID_test"}}
			},
			{
				"input": [{"id": "test"}, {"enum": true}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "age": {"type": Number, "enum": [10, 20]}}
			},
			{
				"input": [{"id": "test"}, {"enum": true, "required": true}],
				"error": new Error.ValidationError("age is a required property but has no value when trying to save document"),
				"schema": {"id": {"type": String}, "age": {"type": Number, "enum": [10, 20], "required": true}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"name": {"type": String, "required": true}}, "required": false}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"name": {"type": String, "required": false}}, "required": false}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"error": new Error.ValidationError("data is a required property but has no value when trying to save document"),
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"name": {"type": String, "required": false}}, "required": true}}
			},
			{
				"input": [{"id": "test", "data": {}}, {"required": true}],
				"output": {"id": "test", "data": {}},
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"name": {"type": String, "required": false}}, "required": true}}
			},
			{
				"input": [{"id": "test", "data": {"email": "test@test.com"}}, {"required": true}],
				"error": new Error.ValidationError("data.name is a required property but has no value when trying to save document"),
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"email": String, "name": {"type": String, "required": true}}}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"error": new Error.ValidationError("data is a required property but has no value when trying to save document"),
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"name": {"type": String, "required": true}}, "required": true}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "data": {"type": Object, "schema": {"email": String, "name": {"type": String, "required": true}}}}
			},
			{
				"input": [{"id": "test"}, {"required": true}],
				"error": new Error.ValidationError("hash is a required property but has no value when trying to save document"),
				"schema": {"id": {"type": String}, "hash": {"type": String, "required": true}, "data": {"type": Object, "schema": {"email": String, "name": {"type": String, "required": true}}}}
			},
			{
				"input": [{"id": "test"}, {"required": "nested"}],
				"output": {"id": "test"},
				"schema": {"id": {"type": String}, "hash": {"type": String, "required": true}, "data": {"type": Object, "schema": {"email": String, "name": {"type": String, "required": true}}}}
			},
			{
				"input": [{"id": 1, "ttl": 1}, {"type": "fromDynamo", "checkExpiredItem": true, "customTypesDynamo": true}],
				"model": ["User", {"id": Number}, {"create": false, "waitForActive": false, "expires": 1000}],
				"output": {"id": 1, "ttl": new Date(1000)}
			},
			{
				"input": [{"id": 1, "birthday": new Date(0)}, {"type": "toDynamo", "customTypesDynamo": true}],
				"model": ["User", {"id": Number, "birthday": Date}, {"create": false, "waitForActive": false}],
				"output": {"id": 1, "birthday": 0}
			},
			{
				"input": [{"id": 1, "birthday": 0}, {"type": "toDynamo", "customTypesDynamo": true}],
				"model": ["User", {"id": Number, "birthday": Date}, {"create": false, "waitForActive": false}],
				"output": {"id": 1, "birthday": 0}
			},
			{
				"input": [{"id": 1, "birthday": 0}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"model": ["User", {"id": Number, "birthday": Date}, {"create": false, "waitForActive": false}],
				"output": {"id": 1, "birthday": new Date(0)}
			},
			{
				"input": [{"id": 1, "ttl": 1}, {"type": "fromDynamo", "checkExpiredItem": true}],
				"model": ["User", {"id": Number}, {"create": false, "waitForActive": false, "expires": {"ttl": 1000, "attribute": "ttl", "items": {"returnExpired": false}}}],
				"output": undefined
			},
			{
				"input": [{"id": 1, "items": ["test"]}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number, "items": Array}, {"saveUnknown": true}),
				"output": {"id": 1, "items": ["test"]}
			},
			{
				"input": [{"id": 1, "items": ["hello", "world"]}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number, "items": Array}, {"saveUnknown": true}),
				"output": {"id": 1, "items": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "items": ["hello", "world"]}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number}, {"saveUnknown": true}),
				"output": {"id": 1, "items": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}}, {"type": "fromDynamo"}],
				"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": {"type": Set, "schema": [String]}}}}),
				"output": {"id": 1, "items": {"data": new Set(["hello", "world"])}}
			},
			{
				"input": [{"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}}, {"type": "fromDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number}, {"saveUnknown": true}),
				"output": {"id": 1, "items": {"data": new Set(["hello", "world"])}}
			},
			{
				"input": [{"id": 1, "items": {"data": ["hello", "world"]}}, {"type": "toDynamo"}],
				"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": {"type": Set, "schema": [String]}}}}),
				"output": {"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}}
			},
			{
				"input": [{"id": 1, "items": {"data": new Set(["hello", "world"])}}, {"type": "toDynamo"}],
				"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": {"type": Set, "schema": [String]}}}}),
				"output": {"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}}
			},
			{
				"input": [{"id": 1, "items": {"data": new Set(["hello", "world"])}}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number}, {"saveUnknown": true}),
				"output": {"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world", "universe", "galaxy"]}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number}, {"saveUnknown": ["data", "data.1", "data.3"]}),
				"output": {"id": 1, "data": ["world", "galaxy"]}
			},

			// TODO: uncomment these
			// {
			// 	"input": [{"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", 1]}}}, {"type": "fromDynamo"}],
			// 	"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": [String]}}}),
			// 	"error": new Error.ValidationError("data.1 should be a string")
			// },
			// {
			// 	"input": [{"id": 1, "items": {"data": {"wrapperName": "Set", "type": "String", "values": ["hello", 1]}}}, {"type": "fromDynamo", "saveUnknown": true}],
			// 	"schema": new Schema({"id": Number}, {"saveUnknown": true}),
			// 	"error": new Error.ValidationError("data.1 should be a string")
			// },
			// {
			// 	"input": [{"id": 1, "items": {"data": ["hello", 1]}}, {"type": "toDynamo"}],
			// 	"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": [String]}}}),
			// 	"error": new Error.ValidationError("data.1 should be a string")
			// },
			// {
			// 	"input": [{"id": 1, "items": {"data": new Set(["hello", 1])}}, {"type": "toDynamo"}],
			// 	"schema": new Schema({"id": Number, "items": {"type": Object, "schema": {"data": [String]}}}),
			// 	"error": new Error.ValidationError("data.1 should be a string")
			// },
			// {
			// 	"input": [{"id": 1, "items": {"data": new Set(["hello", 1])}}, {"type": "toDynamo", "saveUnknown": true}],
			// 	"schema": new Schema({"id": Number}, {"saveUnknown": true}),
			// 	"error": new Error.ValidationError("data.1 should be a string")
			// },

			{
				"input": [{"id": 1, "items": [{"name": "Charlie"}, {"name": "Bob"}]}, {"type": "toDynamo", "saveUnknown": true}],
				"schema": new Schema({"id": Number}, {"saveUnknown": true}),
				"output": {"id": 1, "items": [{"name": "Charlie"}, {"name": "Bob"}]}
			},
			{
				"input": [{"id": 1, "items": [new Date(1), new Date(10000)]}, {"type": "toDynamo", "customTypesDynamo": true}],
				"schema": new Schema({"id": Number, "items": {"type": Array, "schema": [Date]}}),
				"output": {"id": 1, "items": [1, 10000]}
			},
			{
				"input": [{"id": 1, "items": [1, 10000]}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": new Schema({"id": Number, "items": {"type": Array, "schema": [Date]}}),
				"output": {"id": 1, "items": [new Date(1), new Date(10000)]}
			},
			{
				"input": [{"id": 1, "items": [1, 10000, "test"]}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": new Schema({"id": Number, "items": {"type": Array, "schema": [Date]}}),
				"error": new Error.ValidationError("Expected items.2 to be of type date, instead found type string.")
			},
			{
				"input": [{"id": 1, "items": [{"birthday": 1}, {"birthday": 10000}, {"birthday": "test"}]}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": new Schema({"id": Number, "items": {"type": Array, "schema": [{"type": Object, "schema": {"birthday": Date}}]}}),
				"error": new Error.ValidationError("Expected items.2.birthday to be of type date, instead found type string.")
			},
			{
				"schema": {"id": Number, "name": {"type": String, "set": (val) => val === "" ? undefined : val}},
				"input": [{"id": 1, "name": ""}, {"type": "toDynamo", "modifiers": ["set"]}],
				"output": {"id": 1, "name": undefined}
			},
			{
				"schema": {"id": Number, "name": {"type": String, "required": true, "set": (val) => val === "" ? undefined : val}},
				"input": [{"id": 1, "name": ""}, {"type": "toDynamo", "modifiers": ["set"], "required": true}],
				"error": new Error.ValidationError("name is a required property but has no value when trying to save document")
			},
			{
				"schema": {"id": Number, "friends": {"type": Array}},
				"input": [{"id": 1, "friends": ["a", "b", "c"]}, {"type": "toDynamo"}],
				"output": {"id": 1, "friends": []}
			},

			// Multiple Schemas
			{
				"schema": [new Schema({"id": Number, "name": String}), new Schema({"id": Number, "name": Number})],
				"input": [{"id": 1, "name": "Test"}, {"type": "toDynamo"}],
				"output": {"id": 1, "name": "Test"}
			},
			{
				"schema": [{"id": Number, "name": String}, {"id": Number, "name": Number}],
				"input": [{"id": 1, "name": "Test"}, {"type": "toDynamo"}],
				"output": {"id": 1, "name": "Test"}
			},
			{
				"schema": [{"id": Number, "name": String}, {"id": Number, "name": Number}],
				"input": [{"id": 1, "name": 2}, {"type": "toDynamo"}],
				"output": {"id": 1, "name": 2}
			},
			{
				"schema": [{"id": Number, "name": String}, {"id": Number, "data": String}],
				"input": [{"id": 1, "name": "Test"}, {"type": "toDynamo"}],
				"output": {"id": 1, "name": "Test"}
			},
			{
				"schema": [{"id": Number, "name": String}, {"id": Number, "data": String}],
				"input": [{"id": 1, "data": "Test"}, {"type": "toDynamo"}],
				"output": {"id": 1, "data": "Test"}
			},
			// Combine Type
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "toDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "data2": "world", "combine": "hello-world"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world", "combine": "random"}, {"type": "toDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "data2": "world", "combine": "hello-world"}
			},
			{
				"schema": {"id": Number, "data1": {"type": Array, "schema": [String]}, "data2": {"type": Array, "schema": [String]}, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"]}, {"type": "toDynamo", "combine": true}],
				"output": {"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"], "combine": "hello,hola-world,universe"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "toDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "data2": "world", "combine": "hello!world"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello"}, {"type": "toDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "combine": "hello"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "fromDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "data2": "world", "combine": "hello-world"}
			},
			{
				"schema": {"id": Number, "data1": {"type": Array, "schema": [String]}, "data2": {"type": Array, "schema": [String]}, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"]}, {"type": "fromDynamo", "combine": true}],
				"output": {"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"], "combine": "hello,hola-world,universe"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "fromDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "data2": "world", "combine": "hello!world"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello"}, {"type": "fromDynamo", "combine": true}],
				"output": {"id": 1, "data1": "hello", "combine": "hello"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "toDynamo"}],
				"output": {"id": 1, "data1": "hello", "data2": "world"}
			},
			{
				"schema": {"id": Number, "data1": {"type": Array, "schema": [String]}, "data2": {"type": Array, "schema": [String]}, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "-"}}}},
				"input": [{"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"]}, {"type": "toDynamo"}],
				"output": {"id": 1, "data1": ["hello", "hola"], "data2": ["world", "universe"]}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello", "data2": "world"}, {"type": "toDynamo"}],
				"output": {"id": 1, "data1": "hello", "data2": "world"}
			},
			{
				"schema": {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"], "seperator": "!"}}}},
				"input": [{"id": 1, "data1": "hello"}, {"type": "toDynamo"}],
				"output": {"id": 1, "data1": "hello"}
			},
			{
				"schema": {"id": Number, "other": [{"type": "Combine"}, String]},
				"input": [{"id": 1}, {"type": "toDynamo", "combine": true}],
				"error": new Error.InvalidParameter("Combine type is not allowed to be used with multiple types")
			},
			// Multiple Types
			{
				"input": [{"id": 1, "data": 2}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [String, Number]},
				"output": {"id": 1, "data": 2}
			},
			{
				"input": [{"id": 1, "data": "hello"}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [String, Number]},
				"output": {"id": 1, "data": "hello"}
			},
			{
				"input": [{"id": 1, "data": 2}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": ["String", "Number"]},
				"output": {"id": 1, "data": 2}
			},
			{
				"input": [{"id": 1, "data": "hello"}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": ["String", "Number"]},
				"output": {"id": 1, "data": "hello"}
			},
			{
				"input": [{"id": 1, "data": 2}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": {"type": [String, Number]}},
				"output": {"id": 1, "data": 2}
			},
			{
				"input": [{"id": 1, "data": "hello"}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": {"type": [String, Number]}},
				"output": {"id": 1, "data": "hello"}
			},
			{
				"input": [{"id": 1, "data": 2}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, Number]},
				"output": {"id": 1, "data": 2}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, Number]},
				"output": {"id": 1, "data": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "data": new Set(["hello", "world"])}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, Number]},
				"output": {"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, Number]},
				"output": {"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}
			},
			{
				"input": [{"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, Number]},
				"output": {"id": 1, "data": new Set(["hello", "world"])}
			},
			{
				"input": [{"id": 1, "data": 1}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, Number]},
				"output": {"id": 1, "data": 1}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, {"type": Array, "schema": [String]}]},
				"output": {"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Set, "schema": [String]}]},
				"output": {"id": 1, "data": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "data": new Set(["hello", "world"])}, {"type": "toDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Set, "schema": [String]}]},
				"output": {"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}
			},
			{
				"input": [{"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Set, "schema": [String]}, {"type": Array, "schema": [String]}]},
				"output": {"id": 1, "data": new Set(["hello", "world"])}
			},
			{
				"input": [{"id": 1, "data": {"wrapperName": "Set", "type": "String", "values": ["hello", "world"]}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Set, "schema": [String]}]},
				"output": {"id": 1, "data": new Set(["hello", "world"])}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Set, "schema": [String]}]},
				"output": {"id": 1, "data": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "data": ["hello", "world"]}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Object, "schema": {"name": String}}]},
				"output": {"id": 1, "data": ["hello", "world"]}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [String]}, {"type": Object, "schema": {"name": String}}]},
				"output": {"id": 1, "data": {"name": "hello world"}}
			},
			{
				"input": [{"id": 1, "data": [{"name": "hello world"}]}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [{"type": Object, "schema": {"name": String}}]}, {"type": Object, "schema": {"name": String}}]},
				"output": {"id": 1, "data": [{"name": "hello world"}]}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Array, "schema": [{"type": Object, "schema": {"name": String}}]}, {"type": Object, "schema": {"name": String}}]},
				"output": {"id": 1, "data": {"name": "hello world"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id1": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": String, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id1": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id2": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": String, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id2": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id1": "1", "id2": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": String, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id1": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id2": "1", "id1": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": String, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id1": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": 1, "id1": "1", "id2": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"output": {"id": 1, "data": {"name": 1, "id2": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id2": "1", "id1": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id1": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": 1, "id2": "1", "id1": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"output": {"id": 1, "data": {"name": 1, "id2": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id1": "1", "id2": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": String}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"output": {"id": 1, "data": {"name": "hello world", "id1": "1"}}
			},
			{
				"input": [{"id": 1, "data": {"name": "hello world", "id1": "1"}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": Number}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"error": new Error.ValidationError("Expected data.id1 to be of type number, instead found type string.")
			},
			{
				"input": [{"id": 1, "data": {"name": 1, "id2": 2}}, {"type": "fromDynamo"}],
				"schema": {"id": Number, "data": [{"type": Object, "schema": {"name": String, "id1": Number}}, {"type": Object, "schema": {"name": Number, "id2": String}}]},
				"error": new Error.ValidationError("Expected data.id2 to be of type string, instead found type number.")
			},
			{
				"input": [{"id": 1, "data": 1}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date, "settings": {"storage": "seconds"}}]},
				"output": {"id": 1, "data": new Date(1000)}
			},
			{
				"input": [{"id": 1, "data": 1}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date}]},
				"output": {"id": 1, "data": new Date(1)}
			},
			{
				"input": [{"id": 1, "data": 1}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date, "settings": {"storage": "miliseconds"}}]},
				"output": {"id": 1, "data": new Date(1)}
			},
			{
				"input": [{"id": 1, "data": "hello world"}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date, "settings": {"storage": "seconds"}}]},
				"output": {"id": 1, "data": "hello world"}
			},
			{
				"input": [{"id": 1, "data": "hello world"}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date, "settings": {"storage": "miliseconds"}}]},
				"output": {"id": 1, "data": "hello world"}
			},
			{
				"input": [{"id": 1, "data": "hello world"}, {"type": "fromDynamo", "customTypesDynamo": true}],
				"schema": {"id": Number, "data": [String, {"value": Date}]},
				"output": {"id": 1, "data": "hello world"}
			},
			{
				"input": [{"id": 1, "data": true}, {"type": "fromDynamo"}],
				"schema": () => {
					const Item = dynamoose.model("Item", {"id": Number, "data": String}, {"create": false, "waitForActive": false});
					return {"id": Number, "data": [Item, String]};
				},
				"error": new Error.ValidationError("Expected data to be of type Item, string, instead found type boolean.")
			},
			{
				"input": [{"id": 1, "data": true}, {"type": "fromDynamo"}],
				"schema": () => {
					const Item = dynamoose.model("Item", {"id": Number, "data": String}, {"create": false, "waitForActive": false});
					return {"id": Number, "data": [{"type": Set, "schema": [Item]}, String]};
				},
				"error": new Error.ValidationError("Expected data to be of type Item Set, string, instead found type boolean.")
			}
		];

		tests.forEach((test) => {
			let input, model;
			const func = () => {
				if (!(input && model)) {
					if (test.model) {
						model = dynamoose.model(...test.model);
					} else {
						model = dynamoose.model("User", typeof test.schema === "function" ? test.schema() : test.schema, {"create": false, "waitForActive": false});
					}

					input = !Array.isArray(test.input) ? [test.input] : test.input;
					input.splice(1, 0, model.Model);
				}

				return {input, model};
			};

			const testFunc = test.test || it;
			if (test.error) {
				testFunc(`Should throw error ${JSON.stringify(test.error)} for input of ${JSON.stringify(test.input)}`, () => {
					return expect(func().model.objectFromSchema(...func().input)).to.be.rejectedWith(test.error.message);
				});
			} else {
				testFunc(`Should return ${JSON.stringify(test.output)} for input of ${JSON.stringify(test.input)} with a schema of ${JSON.stringify(test.schema)}`, async () => {
					expect(await func().model.objectFromSchema(...func().input)).to.eql(test.output);
				});
			}
		});
	});

	describe("Document.prepareForObjectFromSchema", () => {
		it("Should be a function", () => {
			expect(dynamoose.model("User", {"id": Number}, {"create": false, "waitForActive": false}).prepareForObjectFromSchema).to.be.a("function");
		});

		const internalProperties = require("../../dist/Internal").General.internalProperties;
		const tests = [
			{
				"input": [{}, {}],
				"output": {},
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [{}, {"updateTimestamps": true}],
				"output": {},
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [{}, {"updateTimestamps": false, "type": "toDynamo"}],
				"output": {},
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [{}, {"updateTimestamps": true, "type": "toDynamo"}],
				"output": (result) => ({
					"updatedAt": result.updatedAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": true}}), {"updateTimestamps": true, "type": "toDynamo"}],
				"output": (result) => ({
					"updatedAt": result.updatedAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": true, "type": "toDynamo"}],
				"output": (result) => ({
					"updatedAt": result.updatedAt || new Date(),
					"createdAt": result.createdAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": {"createdAt": true, "updatedAt": true}, "type": "toDynamo"}],
				"output": (result) => ({
					"updatedAt": result.updatedAt || new Date(),
					"createdAt": result.createdAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": {"createdAt": true, "updatedAt": false}, "type": "toDynamo"}],
				"output": (result) => ({
					"createdAt": result.createdAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": {"createdAt": false, "updatedAt": true}, "type": "toDynamo"}],
				"output": (result) => ({
					"updatedAt": result.updatedAt || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": true}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": true, "type": "toDynamo"}],
				"output": (result) => ({
					"updated": result.updated || new Date(),
					"created": result.created || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}), {"create": false, "waitForActive": false}]
			},
			{
				"input": [Object.assign({}, {[internalProperties]: {"storedInDynamo": false}}), {"updateTimestamps": true, "type": "toDynamo"}],
				"output": (result) => ({
					"a": result.a || new Date(),
					"b": result.b || new Date(),
					"c": result.c || new Date(),
					"d": result.d || new Date()
				}),
				"model": ["User", new dynamoose.Schema({"id": String}, {"timestamps": {"createdAt": ["a", "b"], "updatedAt": ["c", "d"]}}), {"create": false, "waitForActive": false}]
			}
		];

		tests.forEach((test) => {
			let input, model;
			const func = () => {
				if (!(input && model)) {
					if (test.model) {
						model = dynamoose.model(...test.model);
					} else {
						model = dynamoose.model("User", test.schema, {"create": false, "waitForActive": false});
					}

					input = !Array.isArray(test.input) ? [test.input] : test.input;
					input.splice(1, 0, model.Model);
				}

				return {input, model};
			};

			it(`Should return ${JSON.stringify(test.output)} for input of ${JSON.stringify(test.input)} with a schema of ${JSON.stringify(test.schema)}`, async () => {
				const res = func();
				const result = await res.model.prepareForObjectFromSchema(...res.input);
				expect(result).to.eql(typeof test.output === "function" ? test.output(result) : test.output);
			});
		});
	});
});
