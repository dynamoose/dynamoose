const {expect} = require("chai");
const Document = require("../lib/Document");
const Model = require("../lib/Model");
const Schema = require("../lib/Schema");
const aws = require("../lib/aws");
const util = require("util");
const Error = require("../lib/Error");
const utils = require("../lib/utils");

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
					expect(await (new User(test.input).toDynamo(test.settings))).to.eql(test.output);
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
					const Robot = new Model("Robot", {"id": Number, "built": Number});
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

				it("Should save with correct object with string set", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": [String]});
					user = new User({"id": 1, "friends": ["Charlie", "Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Tim", "Bob"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with string set and saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": true}));
					user = new User({"id": 1, "friends": new Set(["Charlie", "Tim", "Bob"])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Tim", "Bob"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with number set", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "numbers": [Number]});
					user = new User({"id": 1, "numbers": [5, 7]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with number set using saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": true}));
					user = new User({"id": 1, "numbers": new Set([5, 7])});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with date set", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "times": [Date]});
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
					User = new Model("User", {"id": Number, "data": Buffer});
					user = new User({"id": 1, "data": Buffer.from("testdata")});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with buffer set", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "data": [Buffer]});
					user = new User({"id": 1, "data": [Buffer.from("testdata"), Buffer.from("testdata2")]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with buffer set using saveUnknown", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": true}));
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
					User = new Model("User", {"id": Number, "name": String, "birthday": Date}, {"create": false, "waitForActive": false});
					const birthday = new Date();
					user = new User({"id": 1, "name": "Charlie", birthday});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": `${birthday.getTime()}`}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with object type in schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello", "country": "world"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with object type in schema with properties that don't exist in schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello", "country": "world", "random": "test"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should handle nested attributes inside object correctly for default value", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "default": "world"}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should handle nested attributes inside object correctly for default value with object not passed in", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "default": "world"}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}}}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if required property inside object doesn't exist", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"street": "hello"}});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("address.country is a required property but has no value when trying to save document"));
				});

				it("Should throw type mismatch error if passing in wrong type with custom type for object", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": "test"});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected address to be of type object, instead found type string."));
				});

				it("Should throw type mismatch error if passing in wrong type for nested object attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": true}});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected address.country to be of type string, instead found type boolean."));
				});

				it("Should save correct object with nested objects and saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"data": {"country": "world"}, "name": "Home"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with nested objects", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "address": {"type": Object, "schema": {"data": {"type": Object, "schema": {"country": String}}, "name": String}}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"data": {"country": "world"}, "name": "Home"}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with object property and saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number, "address": Object}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "address": {"country": "world", "zip": 12345}});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"S": "world"}, "zip": {"N": "12345"}}}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": ["Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array as object schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": String}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": ["Tim", "Bob"]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with array and objects within array", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Tim", "id": 1}, {"name": "Bob", "id": 2}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "id": {"N": "1"}}}, {"M": {"name": {"S": "Bob"}, "id": {"N": "2"}}}]}},
						"TableName": "User"
					}]);
				});

				it("Should save correct object with nested array's", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "data": {"type": Array, "schema": [String]}}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Tim", "data": ["hello", "world"]}, {"name": "Bob", "data": ["random", "data"]}]});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "data": {"L": [{"S": "hello"}, {"S": "world"}]}}}, {"M": {"name": {"S": "Bob"}, "data": {"L": [{"S": "random"}, {"S": "data"}]}}}]}},
						"TableName": "User"
					}]);
				});

				it("Should throw type mismatch error if passing in wrong type for nested array object", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [true]});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected friends.0 to be of type object, instead found type boolean."));
				});

				it("Should throw error if not passing in required property in array", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": {"type": Number, "required": true}, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob"}]});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("friends.0.id is a required property but has no value when trying to save document"));
				});

				it("Should throw error if not passing in required property in array for second item", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": {"type": Number, "required": true}, "name": String}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob", "id": 1}, {"name": "Tim"}]});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("friends.1.id is a required property but has no value when trying to save document"));
				});

				it("Should throw error if not passing in required property in array for second item with multi nested objects", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}}}]}}}]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}]});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("friends.1.addresses.1.country is a required property but has no value when trying to save document"));
				});

				it("Should save with correct object with timestamps set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number, "name": String}, {"timestamps": true}), {"create": false, "waitForActive": false});
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

					user.name = "Bob";
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
					User = new Model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}), {"create": false, "waitForActive": false});
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

					user.name = "Bob";
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

				it("Should save with correct object with timestamps but no createdAt timestamp", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": null, "updatedAt": "updatedAt"}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.createdAt).to.not.exist;
					expect(putParams[0].Item.updatedAt).to.be.a("object");

					await utils.timeout(5);

					user.name = "Bob";
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
					User = new Model("User", new Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": "createdAt", "updatedAt": false}}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie"});
					await callType.func(user).bind(user)();
					expect(putParams[0].TableName).to.eql("User");
					expect(putParams[0].Item).to.be.a("object");
					expect(putParams[0].Item.id).to.eql({"N": "1"});
					expect(putParams[0].Item.name).to.eql({"S": "Charlie"});
					expect(putParams[0].Item.createdAt).to.be.a("object");
					expect(putParams[0].Item.updatedAt).to.not.exist;

					await utils.timeout(5);

					user.name = "Bob";
					await callType.func(user).bind(user)();

					expect(putParams[1].TableName).to.eql("User");
					expect(putParams[1].Item).to.be.a("object");
					expect(putParams[1].Item.id).to.eql({"N": "1"});
					expect(putParams[1].Item.name).to.eql({"S": "Bob"});
					expect(putParams[1].Item.createdAt).to.be.a("object");
					expect(putParams[1].Item.updatedAt).to.not.exist;

					expect(putParams[1].Item.createdAt.N).to.eql(putParams[0].Item.createdAt.N);
				});

				it("Should throw type mismatch error if passing in wrong type with custom type", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": String, "birthday": Date}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "birthday": "test"});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected birthday to be of type number, instead found type string."));
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
					User = new Model("User", {"id": Number, "age": Number}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default values", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "default": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default value as function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "default": () => 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with default value as async function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "default": async () => 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with validation value", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 5});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "5"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation value", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("age with a value of 4 had a validation error when trying to save the document"));
				});

				it("Should save with correct object with validation function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 6});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "6"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("age with a value of 4 had a validation error when trying to save the document"));
				});

				it("Should save with correct object with validation async function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": async (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 6});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "age": {"N": "6"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation async function", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "age": {"type": Number, "validate": async (val) => val > 5}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "age": 4});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("age with a value of 4 had a validation error when trying to save the document"));
				});

				it("Should save with correct object with validation RegExp", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "validate": /.../gu}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if invalid value for validation RegExp", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "validate": /.../gu}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "a"});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name with a value of a had a validation error when trying to save the document"));
				});

				it("Should save with correct object with required property", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "required": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if required property not passed in", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "required": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name is a required property but has no value when trying to save document"));
				});

				it("Should save with correct object with enum property", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "enum": ["Tim", "Tom"]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if value does not match value in enum property", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "enum": ["Tim", "Tom"]}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Bob"});
					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.ValidationError("name must equal [\"Tim\",\"Tom\"], but is set to Bob"));
				});

				it("Should save with correct object with forceDefault property", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": {"type": String, "default": "Tim", "forceDefault": true}}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tim"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to true", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to an array with correct attribute", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": ["name"]}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}, "name": {"S": "Tom"}},
						"TableName": "User"
					}]);
				});

				it("Should save with correct object with saveUnknown set to false", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", new Schema({"id": Number}, {"saveUnknown": false}), {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Tom"});
					await callType.func(user).bind(user)();
					expect(putParams).to.eql([{
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}]);
				});

				it("Should throw error if object contains properties that have type mismatch with schema", async () => {
					putItemFunction = () => Promise.resolve();
					User = new Model("User", {"id": Number, "name": String, "age": Number}, {"create": false, "waitForActive": false});
					user = new User({"id": 1, "name": "Charlie", "age": "test"});

					let result, error;
					try {
						result = await callType.func(user).bind(user)();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected age to be of type number, instead found type string."));
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

	describe("conformToSchema", () => {
		beforeEach(() => {
			Model.defaults = {
				"create": false,
				"waitForActive": false
			};
		});
		afterEach(() => {
			Model.defaults = {};
		});

		const tests = [
			{"schema": {"id": Number, "name": String}, "input": {"id": 1, "name": "Charlie", "hello": "world"}, "output": {"id": 1, "name": "Charlie"}},
			{"schema": {"id": Number, "name": String}, "input": {"id": 1}, "output": {"id": 1}},
			{"schema": {"id": Number, "name": String, "age": Number}, "input": {"id": 1, "name": "Charlie", "age": "test"}, "error": "test"}
		];

		tests.forEach((test) => {
			if (test.error) {
				it(`Should throw error ${test.error} correctly for input ${JSON.stringify(test.input)} and schema ${JSON.stringify(test.schema)}`, async () => {
					const User = new Model("User", test.schema);
					const user = new User(test.input);

					let result, error;
					try {
						result = await user.conformToSchema();
					} catch (e) {
						error = e;
					}

					expect(result).to.not.exist;
					expect(error).to.eql(new Error.TypeMismatch("Expected age to be of type number, instead found type string."));
				});
			} else {
				it(`Should modify ${JSON.stringify(test.input)} correctly for schema ${JSON.stringify(test.schema)}`, async () => {
					const User = new Model("User", test.schema);
					const user = new User(test.input);

					const obj = await user.conformToSchema();

					expect({...user}).to.eql(test.output);
					expect(obj).to.eql(user);
				});
			}
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
			expect(new Model("User", {"id": Number}, {"create": false, "waitForActive": false}).attributesWithSchema).to.be.a("function");
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
				// TODO: not confident I wrote the output of this test correctly. The most important part of this output that I know for 100% sure is correct is the `friends.1.addresses.1.country`. The last 3 items in the output I'm not 100% confident with tho.
				"input": {"id": 1, "friends": [{"name": "Bob", "addresses": [{"country": "world"}]}, {"name": "Tim", "addresses": [{"country": "moon"}, {"zip": 12345}]}]},
				"output": ["id", "friends", "friends.0", "friends.1", "friends.0.name", "friends.1.name", "friends.0.addresses", "friends.1.addresses", "friends.0.addresses.0", "friends.1.addresses.0", "friends.0.addresses.0.country", "friends.1.addresses.0.country", "friends.1.addresses.1.country", "friends.0.addresses.0.zip", "friends.1.addresses.0.zip", "friends.1.addresses.1.zip"],
				"schema": {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "addresses": {"type": Array, "schema": [{"type": Object, "schema": {"country": {"type": String, "required": true}, "zip": Number}}]}}}]}}
			}
		];

		tests.forEach((test) => {
			it(`Should return ${JSON.stringify(test.output)} for input of ${JSON.stringify(test.input)} with a schema of ${JSON.stringify(test.schema)}`, () => {
				expect((new Model("User", test.schema, {"create": false, "waitForActive": false})).attributesWithSchema(test.input)).to.eql(test.output);
			});
		});
	});

	describe("Document.objectFromSchema", () => {
		it("Should be a function", () => {
			expect(new Model("User", {"id": Number}, {"create": false, "waitForActive": false}).objectFromSchema).to.be.a("function");
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
		];

		tests.forEach((test) => {
			const model = new Model("User", test.schema, {"create": false, "waitForActive": false});

			if (test.error) {
				it(`Should throw error ${JSON.stringify(test.error)} for input of ${JSON.stringify(test.input)}`, async () => {
					let result, error;
					try {
						result = await model.objectFromSchema(...(!Array.isArray(test.input) ? [test.input] : test.input));
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql(test.error);
				});
			} else {
				it(`Should return ${JSON.stringify(test.output)} for input of ${JSON.stringify(test.input)} with a schema of ${JSON.stringify(test.schema)}`, async () => {
					expect(await model.objectFromSchema(...(!Array.isArray(test.input) ? [test.input] : test.input))).to.eql(test.output);
				});
			}
		});
	});
});
