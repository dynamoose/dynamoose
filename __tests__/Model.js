const {"expect": expectChai} = require("chai");
const dynamoose = require("../dist");
const CustomError = require("../dist/Error");
const Internal = require("../dist/Internal");
const utils = require("../dist/utils");
const util = require("util");
const ModelStore = require("../dist/ModelStore");
const {internalProperties} = Internal.General;

describe("Model", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
	});

	it("Should have a model proprety on the dynamoose object", () => {
		expectChai(dynamoose.model).to.exist;
	});

	it("Should be a function", () => {
		expectChai(dynamoose.model).to.be.a("function");
	});

	describe("Initialization", () => {
		it("Should throw an error if no schema is passed in and no existing model in store", () => {
			expectChai(() => dynamoose.model("Cat")).to.throw(CustomError.MissingSchemaError);
			expectChai(() => dynamoose.model("Cat")).to.throw("Schema hasn't been registered for model \"Cat\".\nUse \"dynamoose.model(name, schema)\"");
		});

		it("Should throw same error as no schema if nothing passed in", () => {
			expectChai(() => dynamoose.model()).to.throw(CustomError.MissingSchemaError);
			expectChai(() => dynamoose.model()).to.throw("Schema hasn't been registered for model \"undefined\".\nUse \"dynamoose.model(name, schema)\"");
		});

		it("Should return existing model if already exists and not passing in schema", () => {
			const User = dynamoose.model("User", {"id": String});
			const UserB = dynamoose.model("User");

			expectChai(UserB).to.eql(User);
		});

		it("Should store latest model in model store", () => {
			dynamoose.model("User", {"id": String});
			dynamoose.model("User", {"id": String, "name": String});

			expectChai(ModelStore("User").getInternalProperties(internalProperties).schemas[0].getInternalProperties(internalProperties).schemaObject).to.eql({"id": String, "name": String});
		});

		it("Should throw error if passing in empty array for schema parameter", () => {
			expectChai(() => dynamoose.model("User", [])).to.throw("Schema hasn't been registered for model \"User\".\nUse \"dynamoose.model(name, schema)\"");
		});

		it("Should throw error if hashKey's don't match for all schema's", () => {
			expectChai(() => dynamoose.model("User", [{"id": String}, {"id2": String}])).to.throw("hashKey's for all schema's must match.");
		});

		it("Should throw error if rangeKey's don't match for all schema's", () => {
			expectChai(() => dynamoose.model("User", [{"id": String, "rangeKey": {"type": String, "rangeKey": true}}, {"id": String, "rangeKey2": {"type": String, "rangeKey": true}}])).to.throw("rangeKey's for all schema's must match.");
		});

		it("Should create a schema if not passing in schema instance", () => {
			const schema = {"name": String};
			const Cat = dynamoose.model("Cat", schema);
			expectChai(Cat.Model.getInternalProperties(internalProperties).schemas).to.not.eql([schema]);
			expectChai(Cat.Model.getInternalProperties(internalProperties).schemas[0]).to.be.an.instanceof(dynamoose.Schema);
		});

		it("Should use schema instance if passed in", () => {
			const schema = new dynamoose.Schema({"name": String});
			const Cat = dynamoose.model("Cat", schema);
			expectChai(Cat.Model.getInternalProperties(internalProperties).schemas).to.eql([schema]);
			expectChai(Cat.Model.getInternalProperties(internalProperties).schemas[0]).to.be.an.instanceof(dynamoose.Schema);
		});

		it("Should not fail with initialization if table doesn't exist", async () => {
			dynamoose.Table.defaults.set({});
			const itemsCalled = [];
			dynamoose.aws.ddb.set({
				"createTable": () => {
					return new Promise((resolve) => {
						itemsCalled.push("createTable");
						setTimeout(() => {
							itemsCalled.push("createTableDone");
							resolve();
						}, 100);
					});
				},
				"describeTable": () => {
					itemsCalled.push("describeTable");
					return itemsCalled.includes("createTableDone") ? Promise.resolve({"Table": {"TableStatus": "ACTIVE"}}) : Promise.reject();
				}
			});

			const tableName = "Cat";
			let failed = false;
			const errorHandler = () => {
				failed = true;
			};
			process.on("unhandledRejection", errorHandler);
			dynamoose.model(tableName, {"id": String});
			await utils.timeout(100);
			expectChai(failed).to.be.false;
			process.removeListener("unhandledRejection", errorHandler);
		});

		it("Should throw an error if trying to access table with no table", () => {
			const model = dynamoose.model("User", {"id": String});
			expectChai(model.Model.getInternalProperties(internalProperties).table).to.throw("No table has been registered for User model. Use `new dynamoose.Table` to register a table for this model.");
		});
	});

	describe("model.name", () => {
		it("Should return correct value", () => {
			const model = dynamoose.model("Cat", {"id": String});
			expectChai(model.name).to.eql("Cat");
		});

		it("Should not be able to set", () => {
			const model = dynamoose.model("Cat", {"id": String});
			model.name = "Dog";
			expectChai(model.name).to.eql("Cat");
		});
	});

	describe("model.get()", () => {
		let User, getItemParams, getItemFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			getItemParams = null;
			getItemFunction = null;
			dynamoose.aws.ddb.set({
				"getItem": (params) => {
					getItemParams = params;
					return getItemFunction();
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
			expectChai(User.get).to.be.a("function");
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
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send consistent (false) to getItem", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)(1, {"consistent": false});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ConsistentRead": false
					});
				});

				it("Should send consistent (true) to getItem", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)(1, {"consistent": true});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ConsistentRead": true
					});
				});

				it("Should get consistent (false) back in request", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request", "consistent": true});
					expectChai(getItemParams).to.not.exist;
					expectChai(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User",
						"ConsistentRead": true
					});
				});

				it("Should get consistent (true) back in request", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request", "consistent": false});
					expectChai(getItemParams).to.not.exist;
					expectChai(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User",
						"ConsistentRead": false
					});
				});

				it("Should send correct params to getItem if we pass in an object", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to getItem if we only request a certain attribute", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1}, {"attributes": ["id"]});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ProjectionExpression": "#a0",
						"ExpressionAttributeNames": {
							"#a0": "id"
						}
					});
				});

				it("Should send correct params to getItem if we request certain attributes", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1}, {"attributes": ["id", "name"]});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ProjectionExpression": "#a0, #a1",
						"ExpressionAttributeNames": {
							"#a0": "id",
							"#a1": "name"
						}
					});
				});

				it("Should send correct params to getItem if we pass in an object with range key", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
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

				it("Should send correct params to getItem if we pass in an entire object with unnecessary attributes", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to getItem if we have a set setting for property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": String});
					new dynamoose.Table("User", [User]);

					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "2"}, "name": {"S": "Charlie"}}});
					await callType.func(User).bind(User)({"id": 1});
					expectChai(getItemParams).to.be.an("object");
					expectChai(getItemParams).to.eql({
						"Key": {
							"id": {
								"N": "2"
							}
						},
						"TableName": "User"
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "2"}, "name": {"S": "Charlie"}}});
					return expect(callType.func(User).bind(User)({"id": "Hello"})).rejects.toEqual(new CustomError.TypeMismatch("Expected id to be of type number, instead found type string."));
				});

				it("Should return object with correct values", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie");
				});

				it("Should return object that is an instance of Item", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an.instanceof(User);
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request"});
					expectChai(getItemParams).to.not.exist;
					expectChai(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					});
				});

				it("Should return undefined for expired object", async () => {
					User = dynamoose.model("User", {"id": Number});
					new dynamoose.Table("User", [User], {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "ttl": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.eql(undefined);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					User = dynamoose.model("User", {"id": Number});
					new dynamoose.Table("User", [User], {"expires": 1000});
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "ttl": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "ttl"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.ttl).to.eql(new Date(1000));
				});

				it("Should return object with correct values with saveUnknown", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "hello": {"S": "world"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "hello"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.hello).to.eql("world");
				});

				it("Should return object with correct values for string set", async () => {
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "friends"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for string set with saveUnknown", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"SS": ["Charlie", "Bob"]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "friends"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.friends).to.eql(new Set(["Charlie", "Bob"]));
				});

				it("Should return object with correct values for number set", async () => {
					User = dynamoose.model("User", {"id": Number, "numbers": {"type": Set, "schema": [Number]}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "numbers"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for number set with saveUnknown", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "numbers": {"NS": ["5", "7"]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "numbers"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.numbers).to.eql(new Set([5, 7]));
				});

				it("Should return object with correct values for date set", async () => {
					User = dynamoose.model("User", {"id": Number, "times": {"type": Set, "schema": [Date]}});
					new dynamoose.Table("User", [User]);
					const time = new Date();
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "times": {"NS": [time.getTime(), 0]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "times"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.times).to.eql(new Set([time, new Date(0)]));
				});

				it("Should return object with correct values for buffer", async () => {
					User = dynamoose.model("User", {"id": Number, "data": Buffer});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"B": Buffer.from("testdata")}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "data"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.data).to.eql(Buffer.from("testdata"));
				});

				it("Should return object with correct values for buffer set", async () => {
					User = dynamoose.model("User", {"id": Number, "data": {"type": Set, "schema": [Buffer]}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "data"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values for buffer set with saveUnknown", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data": {"BS": [Buffer.from("testdata"), Buffer.from("testdata2")]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "data"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.data).to.eql(new Set([Buffer.from("testdata"), Buffer.from("testdata2")]));
				});

				it("Should return object with correct values if using custom types", async () => {
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name", "birthday"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie");
					expectChai(user.birthday).to.eql(new Date(1));
				});

				it("Should return object with correct values if using custom types but value doesn't exist", async () => {
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie");
					expectChai(user.birthday).to.not.exist;
				});

				it("Should throw type mismatch error if passing in wrong type with custom type", () => {
					User = dynamoose.model("User", {"id": Number, "name": String, "birthday": Date});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"S": "Hello World"}}});

					return expect(callType.func(User).bind(User)(1)).rejects.toEqual(new CustomError.TypeMismatch("Expected birthday to be of type date, instead found type string."));
				});

				it("Should return object with correct values with object property", async () => {
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"street": {"S": "hello"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "address"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.address).to.eql({"street": "hello", "country": "world"});
				});

				it("Should return object with correct values with object property with elements that don't exist in schema", async () => {
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "address"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.address).to.eql({"country": "world"});
				});

				it("Should throw type mismatch error if passing in wrong type with custom type for object", () => {
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"S": "test"}}});

					return expect(callType.func(User).bind(User)(1)).rejects.toEqual(new CustomError.TypeMismatch("Expected address to be of type object, instead found type string."));
				});

				it("Should throw type mismatch error if passing in wrong type for nested object attribute", () => {
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"street": String, "country": {"type": String, "required": true}}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"country": {"BOOL": true}}}}});

					return expect(callType.func(User).bind(User)(1)).rejects.toEqual(new CustomError.TypeMismatch("Expected address.country to be of type string, instead found type boolean."));
				});

				it("Should return object with correct values with object property and saveUnknown set to true", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "address"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.address).to.eql({"country": "world", "zip": 12345});
				});

				it("Should return object with correct values with multiple nested object properties and saveUnknown set to true", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "address"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.address).to.eql({"data": {"country": "world"}, "name": "Home"});
				});

				it("Should return object with correct values with multiple nested object properties", async () => {
					User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"data": {"type": Object, "schema": {"country": String}}, "name": String}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "address": {"M": {"data": {"M": {"country": {"S": "world"}}}, "name": {"S": "Home"}}}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "address"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.address).to.eql({"data": {"country": "world"}, "name": "Home"});
				});

				it("Should return correct object for array properties", async () => {
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"L": [{"S": "Tim"}, {"S": "Bob"}]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "friends"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.friends).to.eql(["Tim", "Bob"]);
				});

				it("Should return correct object with array and objects within array", async () => {
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [{"type": Object, "schema": {"id": Number, "name": String}}]}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "friends": {"L": [{"M": {"name": {"S": "Tim"}, "id": {"N": "1"}}}, {"M": {"name": {"S": "Bob"}, "id": {"N": "2"}}}]}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "friends"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.friends).to.eql([{"name": "Tim", "id": 1}, {"name": "Bob", "id": 2}]);
				});

				it("Should return correct object if attribute has a get function", async () => {
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "get": (val) => `${val}-get`}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie-get");
				});

				it("Should return correct object if attribute has an async get function", async () => {
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "get": async (val) => `${val}-get`}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie-get");
				});

				describe("Populate", () => {
					it("Should not populate item automatically", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.model("Parent", {"id": Number, "data": String})});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": 2
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": dynamoose.model("Parent", {"id": Number, "data": String})}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": 2
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when schema property is dynamoose.type.THIS", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.type.THIS});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": 2
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when schema property is dynamoose.type.THIS if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": dynamoose.type.THIS}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": 2
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using set", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Set, "schema": [dynamoose.model("Parent", {"id": Number, "data": String})]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.id).to.eql(1);
						expectChai(user.name).to.eql("Charlie");
						expectChai(user.parent).to.eql(new Set([2]));
						expectChai(Object.keys(user.toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using set if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Set, "schema": [{"type": dynamoose.model("Parent", {"id": Number, "data": String})}]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.id).to.eql(1);
						expectChai(user.name).to.eql("Charlie");
						expectChai(user.parent).to.eql(new Set([2]));
						expectChai(Object.keys(user.toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using set when schema property is dynamoose.type.THIS", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Set, "schema": [dynamoose.type.THIS]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.id).to.eql(1);
						expectChai(user.name).to.eql("Charlie");
						expectChai(user.parent).to.eql(new Set([2]));
						expectChai(Object.keys(user.toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using set when schema property is dynamoose.type.THIS if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Set, "schema": [{"type": dynamoose.type.THIS}]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.id).to.eql(1);
						expectChai(user.name).to.eql("Charlie");
						expectChai(user.parent).to.eql(new Set([2]));
						expectChai(Object.keys(user.toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using array", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Array, "schema": [dynamoose.model("Parent", {"id": Number, "data": String})]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using array if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Array, "schema": [{"type": dynamoose.model("Parent", {"id": Number, "data": String})}]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using array when schema property is dynamoose.type.THIS", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Array, "schema": [dynamoose.type.THIS]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should not populate item automatically when using array when schema property is dynamoose.type.THIS if schema property is object", async () => {
						let getItemTimesCalled = 0;

						User = dynamoose.model("User", {"id": Number, "name": String, "parent": {"type": Array, "schema": [{"type": dynamoose.type.THIS}]}});
						new dynamoose.Table("User", [User]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								getItemTimesCalled++;
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						});
						expectChai(getItemTimesCalled).to.eql(1);
					});

					it("Should autopopulate if model settings have populate set", async () => {
						User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.type.THIS});
						new dynamoose.Table("User", [User], {"populate": "*"});
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								return params.Key.id.N === "1" ? {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}} : {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							}
						});
						const user = await callType.func(User).bind(User)(1);
						expectChai(user.toJSON()).to.eql({
							"id": 1,
							"name": "Charlie",
							"parent": {
								"id": 2,
								"name": "Bob"
							}
						});
					});
				});

				it("Should throw error if DynamoDB responds with error", () => {
					getItemFunction = () => Promise.reject({"error": "Error"});

					return expect(callType.func(User).bind(User)(1)).rejects.toEqual({"error": "Error"});
				});

				it("Should return undefined if no object exists in DynamoDB", async () => {
					getItemFunction = () => Promise.resolve({});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.eql(undefined);
				});

				it("Should return object with correct values if Dynamo object consists properties that don't exist in schema", async () => {
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "hello": {"S": "world"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "name"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.name).to.eql("Charlie");
				});

				it("Should return object with correct combine attribute without modifying", async () => {
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "data1": {"S": "hello"}, "data2": {"S": "world"}, "combine": {"S": "random"}}});
					const user = await callType.func(User).bind(User)(1);
					expectChai(user).to.be.an("object");
					expectChai(Object.keys(user)).to.eql(["id", "data1", "data2", "combine"]);
					expectChai(user.id).to.eql(1);
					expectChai(user.data1).to.eql("hello");
					expectChai(user.data2).to.eql("world");
					expectChai(user.combine).to.eql("random");
				});

				it("Should throw error if Dynamo object contains properties that have type mismatch with schema", () => {
					User = dynamoose.model("User", {"id": Number, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					getItemFunction = () => Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"S": "Hello World"}}});

					return expect(callType.func(User).bind(User)(1)).rejects.toEqual(new CustomError.TypeMismatch("Expected age to be of type number, instead found type string."));
				});

				it("Should wait for model to be ready prior to running DynamoDB API call", async () => {
					let calledGetItem = false;
					getItemFunction = () => {
						calledGetItem = true; return Promise.resolve({"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					};
					let describeTableResponse = {
						"Table": {"TableStatus": "CREATING"}
					};
					dynamoose.aws.ddb.set({
						"describeTable": () => Promise.resolve(describeTableResponse),
						"getItem": getItemFunction
					});
					const model = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("User", [model], {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
					await utils.set_immediate_promise();

					let user;
					callType.func(model).bind(model)(1).then((item) => user = item);

					await utils.set_immediate_promise();
					expectChai(calledGetItem).to.be.false;
					expectChai(user).to.not.exist;
					expectChai(model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
					await utils.set_immediate_promise();
					expectChai(calledGetItem).to.be.true;
					expectChai({...user}).to.eql({"id": 1, "name": "Charlie"});
				});
			});
		});
	});

	describe("model.batchGet()", () => {
		let User, params, promiseFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			params = null;
			promiseFunction = null;
			dynamoose.aws.ddb.set({
				"batchGetItem": (paramsB) => {
					params = paramsB;
					return promiseFunction();
				}
			});
		});
		afterEach(() => {
			User = null;
			params = null;
			promiseFunction = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expectChai(User.batchGet).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.batchGet},
			{"name": "Callback", "func": (Model) => util.promisify(Model.batchGet)}
		];

		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should send correct params to batchGetItem", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					await callType.func(User).bind(User)([1]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": {
								"Keys": [
									{"id": {"N": "1"}}
								]
							}
						}
					});
				});

				it("Should send correct params to batchGetItem with attributes", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					await callType.func(User).bind(User)([1], {"attributes": ["id", "data"]});
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": {
								"Keys": [
									{"id": {"N": "1"}}
								],
								"AttributesToGet": ["id", "data"]
							}
						}
					});
				});

				it("Should return correct request if setting option return to request", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					const paramsB = await callType.func(User).bind(User)([1], {"return": "request"});
					expectChai(params).to.not.exist;
					expectChai(paramsB).to.be.an("object");
					expectChai(paramsB).to.eql({
						"RequestItems": {
							"User": {
								"Keys": [
									{"id": {"N": "1"}}
								]
							}
						}
					});
				});

				it("Should send correct params to batchGetItem for multiple items", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}, {"id": {"N": "2"}, "name": {"S": "Bob"}}]}, "UnprocessedKeys": {}});
					await callType.func(User).bind(User)([1, 2]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": {
								"Keys": [
									{"id": {"N": "1"}},
									{"id": {"N": "2"}}
								]
							}
						}
					});
				});

				it("Should send correct params to batchGetItem if we have a set setting for property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": String});
					new dynamoose.Table("User", [User]);

					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "2"}, "name": {"S": "Charlie"}}, {"id": {"N": "3"}, "name": {"S": "Bob"}}]}, "UnprocessedKeys": {}});
					await callType.func(User).bind(User)([1, 2]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": {
								"Keys": [
									{"id": {"N": "2"}},
									{"id": {"N": "3"}}
								]
							}
						}
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "2"}, "name": {"S": "Charlie"}}, {"id": {"N": "3"}, "name": {"S": "Bob"}}]}, "UnprocessedKeys": {}});
					expect(callType.func(User).bind(User)(["hello", "world"])).rejects.toEqual(new CustomError.InvalidType("test"));
				});

				it("Should return correct result from batchGet", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					const result = await callType.func(User).bind(User)([1]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"}
					]);
				});

				it("Should return correct result from batchGet for multiple items", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}, {"id": {"N": "2"}, "name": {"S": "Bob"}}]}, "UnprocessedKeys": {}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"},
						{"id": 2, "name": "Bob"}
					]);
				});

				it("Should return correct result from batchGet for multiple items that aren't sorted correctly", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "2"}, "name": {"S": "Bob"}}, {"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"},
						{"id": 2, "name": "Bob"}
					]);
				});

				it("Should return correct result from batchGet with unprocessed keys", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {"User": {"Keys": [{"id": {"N": 2}}]}}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([{"id": 2}]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"}
					]);
				});

				it("Should return correct result from batchGet for multiple items with unprocessed keys", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}, {"id": {"N": "3"}, "name": {"S": "Bob"}}]}, "UnprocessedKeys": {"User": {"Keys": [{"id": {"N": 2}}]}}});
					const result = await callType.func(User).bind(User)([1, 2, 3]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([{"id": 2}]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"},
						{"id": 3, "name": "Bob"}
					]);
				});

				it("Should return correct result from batchGet for multiple items that aren't sorted with unprocessed keys", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "3"}, "name": {"S": "Bob"}}, {"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {"User": {"Keys": [{"id": {"N": 2}}]}}});
					const result = await callType.func(User).bind(User)([1, 2, 3]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([{"id": 2}]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"},
						{"id": 3, "name": "Bob"}
					]);
				});

				it("Should return correct result from batchGet for multiple unprocessed keys that aren't sorted", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {"User": {"Keys": [{"id": {"N": 3}}, {"id": {"N": 2}}]}}});
					const result = await callType.func(User).bind(User)([1, 2, 3]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([{"id": 2}, {"id": 3}]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"}
					]);
				});

				describe("Populate", () => {
					it("Should have populate function on response", async () => {
						promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
						const result = await callType.func(User).bind(User)([1]);
						expectChai(result.populate).to.be.a("function");
					});

					it("Should autopopulate if model settings have populate set", async () => {
						User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.type.THIS});
						new dynamoose.Table("User", [User], {"populate": "*"});
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"batchGetItem": () => {
								return {"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]}, "UnprocessedKeys": {}};
							}
						});
						const result = await callType.func(User).bind(User)([1]);
						expectChai(result.toJSON()).to.eql([{
							"id": 1,
							"name": "Charlie",
							"parent": {
								"id": 2,
								"name": "Bob"
							}
						}]);
					});
				});

				it("Should handle correctly if item not in Responses or UnprocessedKeys", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {"User": {"Keys": [{"id": {"N": 3}}, {"id": {"N": 2}}]}}});
					const result = await callType.func(User).bind(User)([1, 2, 3, 4]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([{"id": 2}, {"id": 3}]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"}
					]);
				});

				it("Should handle correctly if item not in Responses", async () => {
					promiseFunction = () => Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.be.an("array");
					expectChai(result.unprocessedKeys).to.eql([]);
					expectChai(result.map((item) => ({...item}))).to.eql([
						{"id": 1, "name": "Charlie"}
					]);
				});

				it("Should throw error if DynamoDB responds with error", () => {
					promiseFunction = () => Promise.reject({"error": "Error"});

					return expect(callType.func(User).bind(User)([1, 2, 3])).rejects.toEqual({"error": "Error"});
				});

				it("Should wait for model to be ready prior to running DynamoDB API call", async () => {
					let calledBatchGetItem = false;
					promiseFunction = () => {
						calledBatchGetItem = true; return Promise.resolve({"Responses": {"User": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]}, "UnprocessedKeys": {}});
					};
					let describeTableResponse = {
						"Table": {"TableStatus": "CREATING"}
					};
					dynamoose.aws.ddb.set({
						"describeTable": () => Promise.resolve(describeTableResponse),
						"batchGetItem": promiseFunction
					});
					const model = dynamoose.model("User", {"id": Number, "name": String});
					new dynamoose.Table("User", [model], {"waitForActive": {"enabled": true, "check": {"frequency": 0, "timeout": 100}}});
					await utils.set_immediate_promise();

					let users;
					callType.func(model).bind(model)([1]).then((item) => users = item);

					await utils.set_immediate_promise();
					expectChai(calledBatchGetItem).to.be.false;
					expectChai(users).to.not.exist;
					expectChai(model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTasks.length).to.eql(1);

					describeTableResponse = {
						"Table": {"TableStatus": "ACTIVE"}
					};
					await model.Model.getInternalProperties(internalProperties).table().getInternalProperties(internalProperties).pendingTaskPromise();
					await utils.set_immediate_promise();
					expectChai(calledBatchGetItem).to.be.true;
					expectChai(users.map((user) => ({...user}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});
			});
		});
	});

	describe("model.create()", () => {
		let User, createItemParams, createItemFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			dynamoose.aws.ddb.set({
				"putItem": (params) => {
					createItemParams = params;
					return createItemFunction();
				}
			});
		});
		afterEach(() => {
			User = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expectChai(User.create).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.create},
			{"name": "Callback", "func": (Model) => util.promisify(Model.create)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result after saving with defaults", async () => {
					createItemFunction = () => Promise.resolve();

					User = dynamoose.model("User", {"id": Number, "name": String, "defaultValue": {"type": String, "default": "Hello World"}});
					new dynamoose.Table("User", [User]);

					const result = await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(result.toJSON()).to.eql({"id": 1, "name": "Charlie", "defaultValue": "Hello World"});
				});

				it("Should send correct params to putItem", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
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

				it("Should send correct params to putItem with value as undefined as first property", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"name": undefined, "id": 1});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to putItem with value as undefined as second property", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": undefined});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to putItem if item has model property name", async () => {
					const schema = new dynamoose.Schema({
						"_id": String,
						"model": {
							"type": Array,
							"schema": [
								{
									"type": Object,
									"schema": {
										"_id": String,
										"text": String
									}
								}
							]
						}
					});
					User = dynamoose.model("User", schema);
					new dynamoose.Table("User", [User]);

					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"_id": "1", "model": [{"_id": "12345678", "text": "someText"}]});
					expectChai(createItemParams).to.be.an("object");
					expect(createItemParams).toEqual({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "_id"
						},
						"Item": {
							"_id": {
								"S": "1"
							},
							"model": {
								"L": [
									{
										"M": {
											"_id": {
												"S": "12345678"
											},
											"text": {
												"S": "someText"
											}
										}
									}
								]
							}
						},
						"TableName": "User"
					});
				});

				it("Should not include attributes that do not exist in schema", async () => {
					createItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "hello": "world"});
					expectChai(createItemParams.Item).to.eql({
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
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
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

				it("Should send correct params to putItem with set function", async () => {
					createItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": (val) => `${val}-set`}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie-set"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to putItem with async set function", async () => {
					createItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": async (val) => `${val}-set`}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							},
							"name": {
								"S": "Charlie-set"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to putItem with combine attribute", async () => {
					createItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "data1": "hello", "data2": "world"});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							},
							"data1": {
								"S": "hello"
							},
							"data2": {
								"S": "world"
							},
							"combine": {
								"S": "hello,world"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to putItem with value as null", async () => {
					const User2 = dynamoose.model("User", {"id": Number, "name": dynamoose.type.NULL});
					new dynamoose.Table("User", [User2]);

					createItemFunction = () => Promise.resolve();
					await callType.func(User2).bind(User2)({"id": 1, "name": null});
					expectChai(createItemParams).to.be.an("object");
					expectChai(createItemParams).to.eql({
						"ConditionExpression": "attribute_not_exists(#__hash_key)",
						"ExpressionAttributeNames": {
							"#__hash_key": "id"
						},
						"Item": {
							"id": {
								"N": "1"
							},
							"name": {
								"NULL": true
							}
						},
						"TableName": "User"
					});
				});

				it("Should not mutate original object if properties not in schema", async () => {
					createItemFunction = () => Promise.resolve();
					const obj = {"id": 1, "random": "data"};
					await callType.func(User).bind(User)(obj);
					expectChai(obj).to.be.an("object");
					expectChai(obj).to.deep.eql({
						"id": 1,
						"random": "data"
					});
				});

				it("Should not mutate original object if nested object properties not in schema", async () => {
					createItemFunction = () => Promise.resolve();
					const obj = {"id": 1, "randomdata": {"hello": "world"}};
					await callType.func(User).bind(User)(obj);
					expectChai(obj).to.be.an("object");
					expectChai(obj).to.deep.eql({
						"id": 1,
						"randomdata": {
							"hello": "world"
						}
					});
				});

				it("Should return correct result after saving with timestamps", async () => {
					createItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String}, {"timestamps": true}));
					new dynamoose.Table("User", [User]);
					const date1 = Date.now();
					const obj = {"id": 1, "name": "Charlie"};
					const result = await callType.func(User).bind(User)(obj);

					// Check original timestamps
					expectChai(result.id).to.eql(1);
					expectChai(result.name).to.eql("Charlie");
					expectChai(result.createdAt).to.be.a("number");
					expectChai(result.createdAt).to.be.within(date1 - 10, date1 + 10);
					expectChai(result.updatedAt).to.be.a("number");
					expectChai(result.updatedAt).to.be.within(date1 - 10, date1 + 10);

					await new Promise((resolve) => setTimeout(resolve, 20));

					const date2 = Date.now();

					// Mutate document and re-save
					result.name = "Charlie 2";
					const result2 = await result.save();

					expectChai(result.toJSON()).to.eql(result2.toJSON());
					[result, result2].forEach((r) => {
						expectChai(r.id).to.eql(1);
						expectChai(r.name).to.eql("Charlie 2");
						expectChai(r.createdAt).to.be.a("number");
						expectChai(r.createdAt).to.be.within(date1 - 10, date1 + 10);
						expectChai(r.updatedAt).to.be.a("number");
						expectChai(r.updatedAt).to.be.within(date2 - 10, date2 + 10);
					});
				});
			});
		});
	});

	describe("model.batchPut()", () => {
		let User, params, promiseFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			dynamoose.aws.ddb.set({
				"batchWriteItem": (paramsB) => {
					params = paramsB;
					return promiseFunction();
				}
			});
		});
		afterEach(() => {
			User = null;
			params = null;
			promiseFunction = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expectChai(User.batchPut).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.batchPut},
			{"name": "Callback", "func": (Model) => util.promisify(Model.batchPut)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should should send correct parameters to batchWriteItem", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					await callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": [
								{
									"PutRequest": {
										"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}
									}
								},
								{
									"PutRequest": {
										"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}
									}
								}
							]
						}
					});
				});

				it("Should return correct result from batchPut with no UnprocessedItems", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					const result = await callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}]);
					expectChai(result).to.eql({
						"unprocessedItems": []
					});
				});

				it("Should return correct result from batchPut with UnprocessedItems", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {"User": [{"PutRequest": {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}}}]}});
					const result = await callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}]);
					expectChai(result).to.eql({
						"unprocessedItems": [{"id": 1, "name": "Charlie"}]
					});
				});

				it("Should return correct result from batchPut with UnprocessedItems in wrong order", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {"User": [{"PutRequest": {"Item": {"id": {"N": "3"}, "name": {"S": "Tim"}}}}, {"PutRequest": {"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}}}]}});
					const result = await callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}, {"id": 3, "name": "Tim"}]);
					expectChai(result).to.eql({
						"unprocessedItems": [{"id": 1, "name": "Charlie"}, {"id": 3, "name": "Tim"}]
					});
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}], {"return": "request"});
					expectChai(params).to.not.exist;
					expectChai(result).to.eql({
						"RequestItems": {
							"User": [
								{
									"PutRequest": {
										"Item": {"id": {"N": "1"}, "name": {"S": "Charlie"}}
									}
								},
								{
									"PutRequest": {
										"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}
									}
								}
							]
						}
					});
				});

				it("Should should send correct parameters to batchWriteItem with combine atttribute", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)([{"id": 1, "data1": "hello", "data2": "world"}, {"id": 2, "data1": "hello", "data2": "universe"}]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": [
								{
									"PutRequest": {
										"Item": {"id": {"N": "1"}, "data1": {"S": "hello"}, "data2": {"S": "world"}, "combine": {"S": "hello,world"}}
									}
								},
								{
									"PutRequest": {
										"Item": {"id": {"N": "2"}, "data1": {"S": "hello"}, "data2": {"S": "universe"}, "combine": {"S": "hello,universe"}}
									}
								}
							]
						}
					});
				});

				it("Should throw error if error is returned from DynamoDB", () => {
					promiseFunction = () => Promise.reject({"error": "ERROR"});

					return expect(callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}, {"id": 2, "name": "Bob"}])).rejects.toEqual({"error": "ERROR"});
				});
			});
		});
	});

	describe("model.update()", () => {
		let User, updateItemParams, updateItemFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String, "age": Number});
			new dynamoose.Table("User", [User]);
			dynamoose.aws.ddb.set({
				"updateItem": (params) => {
					updateItemParams = params;
					return updateItemFunction();
				}
			});
		});
		afterEach(() => {
			User = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expectChai(User.update).to.be.a("function");
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
					expectChai(response).to.be.an("object");
					expectChai(response).to.eql({
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

				it("Should send correct params to updateItem for trying to update unknown properties with saveUnknown", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String, "age": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "random": "hello world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "random"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"S": "hello world"
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

				it("Should send correct params to updateItem for trying to update unknown properties", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "random": "hello world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem for trying to pass string as key", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)("id", {"name": "Charlie", "random": "hello world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
								"S": "id"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem for trying to pass number as key", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)(1, {"name": "Charlie", "random": "hello world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem for trying to update unknown list properties with saveUnknown", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String, "age": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "random": ["hello world"]});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "random"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"L": [{"S": "hello world"}]
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

				it("Should send correct params to updateItem for trying to update unknown list properties with saveUnknown as $ADD", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String, "age": Number}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": "Charlie"}, "$ADD": {"random": ["hello world"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "random"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"L": [{"S": "hello world"}]
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = list_append(#a1, :v1)",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem for trying to update unknown list properties", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie", "random": ["hello world"]});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem for single object update with rangeKey", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"pk": Number, "sk": {"type": Number, "rangeKey": true}, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"pk": 1, "sk": 1, "name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
							"pk": {
								"N": "1"
							},
							"sk": {
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem for single object update with multiple updates with rangeKey", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"pk": Number, "sk": {"type": Number, "rangeKey": true}, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"pk": 1, "sk": 1, "name": "Charlie", "age": 5});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
							"pk": {
								"N": "1"
							},
							"sk": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with separate key and update objects", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem with separate key and update objects with rangeKey", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"pk": Number, "sk": {"type": Number, "rangeKey": true}, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"pk": 1, "sk": 1}, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
							"pk": {
								"N": "1"
							},
							"sk": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with separate key and update objects and multiple updates", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie", "age": 5});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem with separate key and update objects and multiple updates with rangeKey", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"pk": Number, "sk": {"type": Number, "rangeKey": true}, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"pk": 1, "sk": 1}, {"name": "Charlie", "age": 5});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
							"pk": {
								"N": "1"
							},
							"sk": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem when using undefined to restore to default property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": () => "Charlie"}, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": undefined});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem when using undefined to delete default property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": undefined});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
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

				it("Should send correct params to updateItem when using dynamoose.type.UNDEFINED to delete default property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": () => "Charlie"}, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": dynamoose.type.UNDEFINED});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
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

				it("Should send correct params to updateItem when using dynamoose.type.UNDEFINED to delete default property using $REMOVE", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": () => "Charlie"}, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": {"name": dynamoose.type.UNDEFINED}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
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

				it("Should send correct params to updateItem when using dynamoose.type.UNDEFINED to delete default property using $SET", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": () => "Charlie"}, "age": Number});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": dynamoose.type.UNDEFINED}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
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

				it("Should send correct params to updateItem with $SET update expression", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": "Tim"}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem with $SET update expression and multiple property updates", async () => {
					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": "Charlie", "age": 5}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should send correct params to updateItem with $SET update expression for list", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"friends": ["Bob"]});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": "Tim"}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim", "Charlie"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age"
						},
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

				it("Should send correct params to updateItem with $REMOVE saveUnknown property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String}, {"saveUnknown": ["age"]}));
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": {"age": null}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age"
						},
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
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "age"
						},
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
					User = dynamoose.model("User", {"id": Number, "birthday": Date});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"birthday": date});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "birthday": Date});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"birthday": 0});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "birthday": Date});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"birthday": 1000}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String}, {"timestamps": true}));
					new dynamoose.Table("User", [User]);
					const date = Date.now();
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					expectChai(parseInt(updateItemParams.ExpressionAttributeValues[":v0"].N)).to.be.within(date - 10, date + 10);
				});

				it("Should send correct params to updateItem for timestamps with updateAt with custom parameter names", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": "created", "updatedAt": "updated"}}));
					new dynamoose.Table("User", [User]);
					const date = Date.now();
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "updated",
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
					expectChai(parseInt(updateItemParams.ExpressionAttributeValues[":v0"].N)).to.be.within(date - 10, date + 10);
				});

				it("Should send correct params to updateItem for timestamps with updateAt with multiple custom parameter names", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String}, {"timestamps": {"createdAt": ["a1", "a2"], "updatedAt": ["b1", "b2"]}}));
					new dynamoose.Table("User", [User]);
					const date = Date.now();
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "b1",
							"#a1": "b2",
							"#a2": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": updateItemParams.ExpressionAttributeValues[":v0"].N
							},
							":v1": {
								"N": updateItemParams.ExpressionAttributeValues[":v1"].N
							},
							":v2": {
								"S": "Charlie"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1, #a2 = :v2",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
					expectChai(parseInt(updateItemParams.ExpressionAttributeValues[":v0"].N)).to.be.within(date - 10, date + 10);
					expectChai(parseInt(updateItemParams.ExpressionAttributeValues[":v1"].N)).to.be.within(date - 10, date + 10);
					expectChai(parseInt(updateItemParams.ExpressionAttributeValues[":v0"].N)).to.eql(parseInt(updateItemParams.ExpressionAttributeValues[":v1"].N));
				});

				it("Should send correct params to updateItem with conditional", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String, "active": Boolean}));
					new dynamoose.Table("User", [User]);
					const condition = new dynamoose.Condition("active").eq(true);
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"}, {condition});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a1": "name",
							"#a0": "active"
						},
						"ExpressionAttributeValues": {
							":v1": {
								"S": "Charlie"
							},
							":v0": {
								"BOOL": true
							}
						},
						"UpdateExpression": "SET #a1 = :v1",
						"ConditionExpression": "#a0 = :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem with returnValues", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "name": String, "active": Boolean}));
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"name": "Charlie"}, {"returnValues": "NONE"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
						"ReturnValues": "NONE"
					});
				});

				it("Should send correct params to updateItem if we have a set setting for key property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": String, "age": Number});
					new dynamoose.Table("User", [User]);

					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)(1, {"name": "Charlie", "random": "hello world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
								"N": "2"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct params to updateItem if we have a set setting for set property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": {"type": String, "set": (val) => val + " Test"}, "age": Number});
					new dynamoose.Table("User", [User]);

					updateItemFunction = () => Promise.resolve({});
					await callType.func(User).bind(User)(1, {"name": "Charlie"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie Test"
							}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"Key": {
							"id": {
								"N": "2"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", () => {
					updateItemFunction = () => Promise.resolve({});
					return expect(callType.func(User).bind(User)("random", {"name": "Charlie"})).rejects.toEqual(new CustomError.TypeMismatch("Expected id to be of type number, instead found type string."));
				});

				it("Should return updated item upon success", async () => {
					updateItemFunction = () => Promise.resolve({"Attributes": {"id": {"N": "1"}, "name": {"S": "Charlie"}}});
					const result = await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(result.constructor.name).to.eql("User");
					expectChai({...result}).to.eql({
						"id": 1,
						"name": "Charlie"
					});
				});

				it("Should return updated item with object property upon success", async () => {
					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					updateItemFunction = () => Promise.resolve({"Attributes": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					const result = await callType.func(User).bind(User)({"id": 1, "address": {"zip": 12345, "country": "world"}});
					expectChai(result.constructor.name).to.eql("User");
					expectChai({...result}).to.eql({
						"id": 1,
						"address": {"zip": 12345, "country": "world"}
					});
				});

				it("Should not delete keys from object", async () => {
					const obj = {"id": 1, "address": {"zip": 12345, "country": "world"}};

					User = dynamoose.model("User", new dynamoose.Schema({"id": Number, "address": Object}, {"saveUnknown": true}));
					new dynamoose.Table("User", [User]);
					updateItemFunction = () => Promise.resolve({"Attributes": {"id": {"N": "1"}, "address": {"M": {"zip": {"N": "12345"}, "country": {"S": "world"}}}}});
					await callType.func(User).bind(User)(obj);
					expectChai(obj).to.deep.eql({"id": 1, "address": {"zip": 12345, "country": "world"}});
				});

				it("Should not throw error if validation passes", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "myNumber": {"type": Number, "validate": (val) => val > 10}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"myNumber": 11})).resolves.toEqual();
				});

				it("Should not throw error if validation doesn't pass when using $ADD", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "myNumber": {"type": Number, "validate": (val) => val > 10}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$ADD": {"myNumber": 5}})).resolves.toEqual();
				});

				it("Should throw error if validation doesn't pass", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "validate": (val) => val.length > 10}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"name": "Bob"})).rejects.toEqual(new CustomError.ValidationError("name with a value of Bob had a validation error when trying to save the item"));
				});

				it("Should throw error if value not in enum", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "enum": ["Bob", "Tim"]}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"name": "Todd"})).rejects.toEqual(new CustomError.ValidationError("name must equal [\"Bob\",\"Tim\"], but is set to Todd"));
				});

				it("Should not throw error if value is in enum", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "enum": ["Bob", "Tim"]}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"name": "Bob"})).resolves.toEqual();
				});

				it("Should throw error for type mismatch for set", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});

					return expect(callType.func(User).bind(User)({"id": 1}, {"name": false})).rejects.toEqual(new CustomError.TypeMismatch("Expected name to be of type string, instead found type boolean."));
				});

				it("Should throw error for type mismatch for add", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "myNumber": Number});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$ADD": {"myNumber": false}})).rejects.toEqual(new CustomError.TypeMismatch("Expected myNumber to be of type number, instead found type boolean."));
				});

				it("Should throw error for one item list append type mismatch", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": false}})).rejects.toEqual(new CustomError.TypeMismatch("Expected friends.0 to be of type string, instead found type boolean."));
				});

				it("Should throw error for multiple item list append type mismatch", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "name": String, "friends": {"type": Array, "schema": [String]}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": [1, 5]}})).rejects.toEqual(new CustomError.TypeMismatch("Expected friends.0 to be of type string, instead found type number."));
				});

				it("Should throw error if trying to remove required property", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "required": true}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]})).rejects.toEqual(new CustomError.ValidationError("name is a required property but has no value when trying to save item"));
				});

				it("Should not throw error if trying to modify required property", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "required": true}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"name": "Bob"})).resolves.toEqual();
				});

				it("Should not throw error if not modifying required property", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "required": true}, "friends": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"friends": ["Bob"]})).resolves.toEqual();
				});

				it("Should throw error if trying to replace object without nested required property", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data": {"type": Object, "schema": {"name": String, "age": {"type": Number, "required": true}}}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"data": {"name": "Charlie"}})).rejects.toEqual(new CustomError.ValidationError("data.age is a required property but has no value when trying to save item"));
				});

				it("Should throw error if trying to replace object with $SET without nested required property", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data": {"type": Object, "schema": {"name": String, "age": {"type": Number, "required": true}}}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"$SET": {"data": {"name": "Charlie"}}})).rejects.toEqual(new CustomError.ValidationError("data.age is a required property but has no value when trying to save item"));
				});

				it("Should use default value if deleting property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob"}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob"}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"name": "Tim"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob"}, "data": String});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"data": "test"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$REMOVE": ["name"]});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"name": "Tim"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Set, "schema": [String], "default": ["Bob"], "forceDefault": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "friends": {"type": Array, "schema": [String], "default": ["Bob"], "forceDefault": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"friends": ["Tim"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "default": "Bob", "forceDefault": true}, "data": String});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"data": "test"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Shouldn't conform to enum if property isn't being updated", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "enum": ["Bob", "Tim"]}, "data": String});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"data": "test"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should call set modifier if setting property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": (val) => `${val}-set`}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"name": "Bob"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Bob-set"
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

				it("Should call set modifier if setting property using $SET", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "set": (val) => `${val}-set`}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"name": "Bob"}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Bob-set"
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

				it("Should not call set modifier if adding to property", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "age": {"type": Number, "set": (val) => val * 10}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
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

				it("Should throw error if updating one combine property", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"data1": "Charlie"})).rejects.toEqual(new CustomError.InvalidParameter("You must update all or none of the combine attributes when running Model.update. Missing combine attributes: data2."));
				});

				it("Shouldn't throw error if update with property allowing multiple types as first type", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data": [String, Number]});
					new dynamoose.Table("User", [User]);

					await callType.func(User).bind(User)({"id": 1}, {"data": "Bob"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data"
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

				it("Shouldn't throw error if update with property allowing multiple types as second type", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data": [String, Number]});
					new dynamoose.Table("User", [User]);

					await callType.func(User).bind(User)({"id": 1}, {"data": 2});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"N": "2"
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

				it("Should throw error if using multiple types with combine type", () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": ["Combine", "String"]});
					new dynamoose.Table("User", [User]);

					return expect(callType.func(User).bind(User)({"id": 1}, {"data1": "Charlie", "data2": "Fish"})).rejects.toEqual(new CustomError.InvalidType("Combine type is not allowed to be used with multiple types."));
				});

				it("Should send correct parameters when updating all combine properties", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"data1": "hello", "data2": "world"});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1",
							"#a1": "data2",
							"#a2": "combine"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "hello"
							},
							":v1": {
								"S": "world"
							},
							":v2": {
								"S": "hello,world"
							}
						},
						"UpdateExpression": "SET #a0 = :v0, #a1 = :v1, #a2 = :v2",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct parameters when updating or removing all combine properties", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": String, "data2": String, "combine": {"type": {"value": "Combine", "settings": {"attributes": ["data1", "data2"]}}}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$SET": {"data1": "hello"}, "$REMOVE": {"data2": "world"}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1",
							"#a1": "data2",
							"#a2": "combine"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "hello"
							},
							":v2": {
								"S": "hello"
							}
						},
						"UpdateExpression": "REMOVE #a1 SET #a0 = :v0, #a2 = :v2",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct parameters when adding an element to a set", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"data1": ["test1"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["test1"]
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

				it("Should send correct parameters when adding multiple elements to a Set", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$ADD": {"data1": ["test1", "test2"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["test1", "test2"]
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

				it("Should send correct parameters when removing an element from a Set", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$DELETE": {"data1": ["test1"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["test1"]
							}
						},
						"UpdateExpression": "DELETE #a0 :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct parameters when removing multiple elements from a Set", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": {"type": Set, "schema": [String]}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$DELETE": {"data1": ["test1", "test2"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["test1", "test2"]
							}
						},
						"UpdateExpression": "DELETE #a0 :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should send correct parameters when removing an element from a Set with other required parameters", async () => {
					updateItemFunction = () => Promise.resolve({});
					User = dynamoose.model("User", {"id": Number, "data1": {"type": Set, "schema": [String]}, "data2": {"type": String, "required": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1}, {"$DELETE": {"data1": ["test1"]}});
					expectChai(updateItemParams).to.be.an("object");
					expectChai(updateItemParams).to.eql({
						"ExpressionAttributeNames": {
							"#a0": "data1"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"SS": ["test1"]
							}
						},
						"UpdateExpression": "DELETE #a0 :v0",
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ReturnValues": "ALL_NEW"
					});
				});

				it("Should throw error if AWS throws error", () => {
					updateItemFunction = () => Promise.reject({"error": "ERROR"});

					return expect(callType.func(User).bind(User)({"id": 1}, {"$ADD": {"age": 5}, "name": "Bob"})).rejects.toEqual({"error": "ERROR"});
				});
			});
		});
	});

	describe("model.delete()", () => {
		let User, deleteItemParams, deleteItemFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			dynamoose.aws.ddb.set({
				"deleteItem": (params) => {
					deleteItemParams = params;
					return deleteItemFunction();
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
			expectChai(User.delete).to.be.a("function");
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
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
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
					await callType.func(User).bind(User)({"id": 1});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to deleteItem if we pass in an object with range key", async () => {
					deleteItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
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

				it("Should send correct params to deleteItem if we pass in an entire object with unnecessary attributes", async () => {
					deleteItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1, "name": "Charlie"});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User"
					});
				});

				it("Should send correct params to deleteItem if we pass in an entire object with unnecessary attributes with range key", async () => {
					deleteItemFunction = () => Promise.resolve();
					User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User).bind(User)({"id": 1, "type": "bar", "name": "Charlie"});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
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

				it("Should send correct params to deleteItem if we have a set setting for property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": String});
					new dynamoose.Table("User", [User]);

					deleteItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "2"
							}
						},
						"TableName": "User"
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", () => {
					deleteItemFunction = () => Promise.resolve();
					return expect(callType.func(User).bind(User)({"id": "random"})).rejects.toEqual(new CustomError.TypeMismatch("Expected id to be of type number, instead found type string."));
				});

				it("Should successfully add a condition if a condition is passed in", async () => {
					const condition = new dynamoose.Condition().filter("id").exists();
					deleteItemFunction = () => Promise.resolve();
					await callType.func(User).bind(User)({"id": 1}, {"condition": condition});
					expectChai(deleteItemParams).to.be.an("object");
					expectChai(deleteItemParams).to.eql({
						"Key": {
							"id": {
								"N": "1"
							}
						},
						"TableName": "User",
						"ConditionExpression": "attribute_exists (#a0)",
						"ExpressionAttributeNames": {
							"#a0": "id"
						}
					});
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)(1, {"return": "request"});
					expectChai(deleteItemParams).to.not.exist;
					expectChai(result).to.eql({
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					});
				});

				it("Should throw error if error is returned from DynamoDB", () => {
					deleteItemFunction = () => Promise.reject({"error": "ERROR"});

					return expect(callType.func(User).bind(User)({"id": 1, "name": "Charlie"})).rejects.toEqual({"error": "ERROR"});
				});
			});
		});

		it("Should send correct params to deleteItem if we pass in an entire object with unnecessary attributes with range key", async () => {
			deleteItemFunction = () => Promise.resolve();

			const schema = {
				"PK": {"type": String, "hashKey": true},
				"SK": {"type": String, "rangeKey": true},
				"someAttribute": {"type": String}
			};
			const ExampleModel = dynamoose.model("TestTable", schema);
			new dynamoose.Table("TestTable", [ExampleModel]);

			const example = new ExampleModel({
				"PK": "primarKey",
				"SK": "sortKey",
				"someAttribute": "someValue"
			});

			const func = (Model) => Model.delete;
			await func(ExampleModel).bind(ExampleModel)(example);
			expectChai(deleteItemParams).to.be.an("object");
			expectChai(deleteItemParams).to.eql({
				"Key": {
					"PK": {
						"S": "primarKey"
					},
					"SK": {
						"S": "sortKey"
					}
				},
				"TableName": "TestTable"
			});
		});
	});

	describe("model.batchDelete()", () => {
		let User, params, promiseFunction;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
			dynamoose.aws.ddb.set({
				"batchWriteItem": (paramsB) => {
					params = paramsB;
					return promiseFunction();
				}
			});
		});
		afterEach(() => {
			User = null;
			params = null;
			promiseFunction = null;
			dynamoose.aws.ddb.revert();
		});

		it("Should be a function", () => {
			expectChai(User.batchDelete).to.be.a("function");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (Model) => Model.batchDelete},
			{"name": "Callback", "func": (Model) => util.promisify(Model.batchDelete)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should should send correct parameters to batchWriteItem", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					await callType.func(User).bind(User)([1, 2]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": [
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "1"}}
									}
								},
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "2"}}
									}
								}
							]
						}
					});
				});

				it("Should should send correct parameters to batchWriteItem if we have a set setting for property", async () => {
					User = dynamoose.model("User", {"id": {"type": Number, "set": (val) => val + 1}, "name": String});
					new dynamoose.Table("User", [User]);

					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					await callType.func(User).bind(User)([1, 2]);
					expectChai(params).to.be.an("object");
					expectChai(params).to.eql({
						"RequestItems": {
							"User": [
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "2"}}
									}
								},
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "3"}}
									}
								}
							]
						}
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					expect(callType.func(User).bind(User)(["hello", "world"])).rejects.toEqual(new CustomError.InvalidType("test"));
				});

				it("Should return correct result from batchDelete with no UnprocessedItems", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.eql({
						"unprocessedItems": []
					});
				});

				it("Should return correct result from batchDelete with UnprocessedItems", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {"User": [{"DeleteRequest": {"Key": {"id": {"N": "1"}}}}]}});
					const result = await callType.func(User).bind(User)([1, 2]);
					expectChai(result).to.eql({
						"unprocessedItems": [{"id": 1}]
					});
				});

				it("Should return correct result from batchDelete with UnprocessedItems in wrong order", async () => {
					promiseFunction = () => Promise.resolve({"UnprocessedItems": {"User": [{"DeleteRequest": {"Key": {"id": {"N": "3"}}}}, {"DeleteRequest": {"Key": {"id": {"N": "1"}}}}]}});
					const result = await callType.func(User).bind(User)([1, 2, 3]);
					expectChai(result).to.eql({
						"unprocessedItems": [{"id": 1}, {"id": 3}]
					});
				});

				it("Should return request if return request setting is set", async () => {
					const result = await callType.func(User).bind(User)([1, 2], {"return": "request"});
					expectChai(params).to.not.exist;
					expectChai(result).to.eql({
						"RequestItems": {
							"User": [
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "1"}}
									}
								},
								{
									"DeleteRequest": {
										"Key": {"id": {"N": "2"}}
									}
								}
							]
						}
					});
				});

				it("Should throw error if error is returned from DynamoDB", () => {
					promiseFunction = () => Promise.reject({"error": "ERROR"});

					return expect(callType.func(User).bind(User)([{"id": 1, "name": "Charlie"}])).rejects.toEqual({"error": "ERROR"});
				});
			});
		});
	});

	describe("model.transaction", () => {
		let User;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			new dynamoose.Table("User", [User]);
		});
		afterEach(() => {
			User = null;
		});

		it("Should be an object", () => {
			expectChai(User.transaction).to.be.an("object");
		});

		describe("Model.transaction.get", () => {
			it("Should be a function", () => {
				expectChai(User.transaction.get).to.be.a("function");
			});

			it("Should return an object", async () => {
				expectChai(await User.transaction.get(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expectChai(await User.transaction.get(1)).to.eql({
					"Get": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.get(1, utils.empty_function);
				console.warn = oldWarn;

				expectChai(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.create", () => {
			it("Should be a function", () => {
				expectChai(User.transaction.create).to.be.a("function");
			});

			it("Should return an object", async () => {
				expectChai(await User.transaction.create({"id": 1})).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expectChai(await User.transaction.create({"id": 1})).to.eql({
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

			it("Should return correct result with overwrite set to true", async () => {
				expectChai(await User.transaction.create({"id": 1}, {"overwrite": true})).to.eql({
					"Put": {
						"Item": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should return correct result with overwrite set to false", async () => {
				expectChai(await User.transaction.create({"id": 1}, {"overwrite": false})).to.eql({
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

			it("Should print warning if passing callback", () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.create({"id": 1}, {"overwrite": false}, utils.empty_function);
				console.warn = oldWarn;

				expectChai(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});

		describe("Model.transaction.delete", () => {
			it("Should be a function", () => {
				expectChai(User.transaction.delete).to.be.a("function");
			});

			it("Should return an object", async () => {
				expectChai(await User.transaction.delete(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expectChai(await User.transaction.delete(1)).to.eql({
					"Delete": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.delete(1, utils.empty_function);
				console.warn = oldWarn;

				expectChai(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});

			it("Should keep range keys with 0 value", async () => {
				User = dynamoose.model("User", {"id": String, "order": {"type": Number, "rangeKey": true}});
				new dynamoose.Table("User", [User]);
				expectChai(await User.transaction.delete({"id": "foo", "order": 0})).to.eql({
					"Delete": {
						"Key": {"id": {"S": "foo"}, "order": {"N": "0"}},
						"TableName": "User"
					}
				});
			});
		});

		describe("Model.transaction.update", () => {
			it("Should be a function", () => {
				expectChai(User.transaction.update).to.be.a("function");
			});

			it("Should return an object", async () => {
				expectChai(await User.transaction.update({"id": 1, "name": "Bob"})).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expectChai(await User.transaction.update({"id": 1, "name": "Bob"})).to.eql({
					"Update": {
						"Key": {"id": {"N": "1"}},
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "Bob"}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"TableName": "User"
					}
				});
			});

			it("Should return correct result with settings", async () => {
				expectChai(await User.transaction.update({"id": 1}, {"name": "Bob"}, {"return": "request"})).to.eql({
					"Update": {
						"Key": {"id": {"N": "1"}},
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "Bob"}
						},
						"UpdateExpression": "SET #a0 = :v0",
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.update({"id": 1, "name": "Bob"}, utils.empty_function);
				console.warn = oldWarn;

				expectChai(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});

			it("Should not delete keys from object", () => {
				const obj = {"id": 1, "name": "Bob"};
				User.transaction.update(obj, utils.empty_function);
				expectChai(obj).to.eql({"id": 1, "name": "Bob"});
			});
		});

		describe("Model.transaction.condition", () => {
			it("Should be a function", () => {
				expectChai(User.transaction.condition).to.be.a("function");
			});

			it("Should return an object", async () => {
				expectChai(await User.transaction.condition(1)).to.be.an("object");
			});

			it("Should return correct result", async () => {
				expectChai(await User.transaction.condition(1)).to.eql({
					"ConditionCheck": {
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should return correct result for object based key", async () => {
				User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});
				new dynamoose.Table("User", [User]);
				expectChai(await User.transaction.condition({"id": 1, "name": "Bob"})).to.eql({
					"ConditionCheck": {
						"Key": {"id": {"N": "1"}, "name": {"S": "Bob"}},
						"TableName": "User"
					}
				});
			});

			it("Should return correct result with conditional", async () => {
				expectChai(await User.transaction.condition(1, new dynamoose.Condition("age").gt(13))).to.eql({
					"ConditionCheck": {
						"ConditionExpression": "#a0 > :v0",
						"ExpressionAttributeNames": {
							"#a0": "age"
						},
						"ExpressionAttributeValues": {
							":v0": {"N": "13"}
						},
						"Key": {"id": {"N": "1"}},
						"TableName": "User"
					}
				});
			});

			it("Should print warning if passing callback", () => {
				let result;
				const oldWarn = console.warn;
				console.warn = (warning) => result = warning;
				User.transaction.condition(1, utils.empty_function);
				console.warn = oldWarn;

				expectChai(result).to.eql("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
			});
		});
	});

	describe("Serializer", () => {
		let User;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String, "friend": {"type": Object, "schema": {"id": Number, "name": String}}});
		});
		afterEach(() => {
			User = null;
		});

		describe("Model.serializer", () => {
			it("Should be an instance of Serializer", () => {
				expectChai(User.serializer).to.be.an.instanceOf(require("../dist/Serializer").Serializer);
			});

			describe("Model.serializer.add", () => {
				it("Should be a function", () => {
					expectChai(User.serializer.add).to.be.a("function");
				});

				it("Should throw an error if calling with no parameters", () => {
					expectChai(() => User.serializer.add()).to.throw("Field name is required and should be of type string");
				});

				it("Should throw an error if calling with object as first parameter", () => {
					expectChai(() => User.serializer.add({})).to.throw("Field name is required and should be of type string");
				});

				it("Should throw an error if calling with number as first parameter", () => {
					expectChai(() => User.serializer.add(1)).to.throw("Field name is required and should be of type string");
				});

				it("Should throw an error if calling with only first parameter", () => {
					expectChai(() => User.serializer.add("mySerializer")).to.throw("Field options is required and should be an object or array");
				});

				it("Should throw an error if calling with string as second parameter", () => {
					expectChai(() => User.serializer.add("mySerializer", "hello world")).to.throw("Field options is required and should be an object or array");
				});

				it("Should throw an error if calling with number as second parameter", () => {
					expectChai(() => User.serializer.add("mySerializer", 1)).to.throw("Field options is required and should be an object or array");
				});
			});

			describe("Model.serializer.delete", () => {
				it("Should be a function", () => {
					expectChai(User.serializer.delete).to.be.a("function");
				});

				it("Should throw an error if calling with no parameters", () => {
					expectChai(() => User.serializer.delete()).to.throw("Field name is required and should be of type string");
				});

				it("Should throw an error if calling with number as first parameter", () => {
					expectChai(() => User.serializer.delete(1)).to.throw("Field name is required and should be of type string");
				});

				it("Should throw an error if trying to delete primary default serializer", () => {
					expectChai(() => User.serializer.delete("_default")).to.throw("Can not delete primary default serializer");
				});
			});

			describe("Model.serializer.default.set", () => {
				it("Should be a function", () => {
					expectChai(User.serializer.default.set).to.be.a("function");
				});

				it("Should throw an error if calling with number as first parameter", () => {
					expectChai(() => User.serializer.default.set(1)).to.throw("Field name is required and should be of type string");
				});
			});
		});

		const serializeTests = [
			{"input": [[]], "output": []},
			{"input": [], "output": []},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]], "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], ["name"]], "output": [{"name": "Bob"}, {"name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], ["id"]], "output": [{"id": 1}, {"id": 2}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"include": ["name"]}], "output": [{"name": "Bob"}, {"name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"include": ["id"]}], "output": [{"id": 1}, {"id": 2}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["name"]}], "output": [{"id": 1}, {"id": 2}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["id"]}], "output": [{"name": "Bob"}, {"name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["id", "name"]}], "output": [{}, {}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"include": []}], "output": [{}, {}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["id"], "include": ["id"]}], "output": [{}, {}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["id"], "include": ["id", "name"]}], "output": [{"name": "Bob"}, {"name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], {"exclude": ["name"], "include": ["id", "name"]}], "output": [{"id": 1}, {"id": 2}]},
			{"input": [[{"id": 1, "name": "Bob", "friend": {"id": 3, "name": "Tom"}}, {"id": 2, "name": "Tim", "friend": {"id": 3, "name": "Tom"}}], {"exclude": ["friend"]}], "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": [[{"id": 1, "name": "Bob", "friend": {"id": 3, "name": "Tom"}}, {"id": 2, "name": "Tim", "friend": {"id": 3, "name": "Tom"}}], {"exclude": ["friend.id"]}], "output": [{"id": 1, "name": "Bob", "friend": {"name": "Tom"}}, {"id": 2, "name": "Tim", "friend": {"name": "Tom"}}]},
			{"input": [[{"id": 1, "name": "Bob", "friend": {"id": 3, "name": "Tom"}}, {"id": 2, "name": "Tim", "friend": {"id": 3, "name": "Tom"}}], {"include": ["friend.name"]}], "output": [{"friend": {"name": "Tom"}}, {"friend": {"name": "Tom"}}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["name"]);
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], "mySerializer"];
			}, "output": [{"name": "Bob"}, {"name": "Tim"}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], "mySerializer"];
			}, "output": [{"id": 1}, {"id": 2}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.default.set("mySerializer");
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]];
			}, "output": [{"id": 1}, {"id": 2}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.default.set("mySerializer");
				User.serializer.default.set();
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]];
			}, "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.default.set("random");
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]];
			}, "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.delete("mySerializer");
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], "mySerializer"];
			}, "error": "Field options is required and should be an object or array"},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.delete("random");
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]];
			}, "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("mySerializer", ["id"]);
				User.serializer.default.set("mySerializer");
				User.serializer.delete("mySerializer");
				return [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]];
			}, "output": [{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("isActive", {
					"modify": (serialized, original) => {
						serialized.isActive = original.status === "active";
						return serialized;
					}
				});
				return [[{"id": 1, "status": "active", "name": "Bob"}, {"id": 2, "status": "not_active", "name": "Tim"}], "isActive"];
			}, "output": [{"id": 1, "status": "active", "isActive": true, "name": "Bob"}, {"id": 2, "status": "not_active", "isActive": false, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("isActive", {
					"exclude": ["status"],
					"modify": (serialized, original) => {
						serialized.isActive = original.status === "active";
						return serialized;
					}
				});
				return [[{"id": 1, "status": "active", "name": "Bob"}, {"id": 2, "status": "not_active", "name": "Tim"}], "isActive"];
			}, "output": [{"id": 1, "isActive": true, "name": "Bob"}, {"id": 2, "isActive": false, "name": "Tim"}]},
			{"input": () => {
				User.serializer.add("isActive", {
					"include": ["id"],
					"modify": (serialized, original) => {
						serialized.isActive = original.status === "active";
						return serialized;
					}
				});
				return [[{"id": 1, "status": "active", "name": "Bob"}, {"id": 2, "status": "not_active", "name": "Tim"}], "isActive"];
			}, "output": [{"id": 1, "isActive": true}, {"id": 2, "isActive": false}]},
			{"input": [[{"id": 1, "name": "Bob"}, {"id": 2, "name": "Tim"}], "random"], "error": "Field options is required and should be an object or array"},
			{"input": [{"id": 1, "name": "Bob"}], "error": "itemsArray must be an array of item objects"}
		];
		describe("Model.serializeMany", () => {
			it("Should be a function", () => {
				expectChai(User.serializeMany).to.be.a("function");
			});

			serializeTests.forEach((test) => {
				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
					const input = typeof test.input === "function" ? test.input() : test.input;
					if (test.error) {
						expectChai(() => User.serializeMany(...input)).to.throw(test.error);
					} else {
						expectChai(User.serializeMany(...input)).to.eql(test.output);
					}
				});

				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)} when using item instance`, () => {
					const input = typeof test.input === "function" ? test.input() : test.input;
					if (Array.isArray(input[0])) {
						input[0] = input[0].map((obj) => new User(obj));
					}

					if (test.error) {
						expectChai(() => User.serializeMany(...input)).to.throw(test.error);
					} else {
						expectChai(User.serializeMany(...input)).to.eql(test.output);
					}
				});
			});
		});

		describe("model.serialize", () => {
			it("Should be a function", () => {
				expectChai(new User().serialize).to.be.a("function");
			});

			serializeTests.forEach((test) => {
				it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
					const input = typeof test.input === "function" ? test.input() : test.input;

					if (Array.isArray(input[0])) {
						input[0].forEach((object, index) => {
							const item = new User(object);

							if (test.error) {
								expectChai(() => item.serialize(input[1])).to.throw(test.error);
							} else {
								expectChai(item.serialize(input[1])).to.eql(test.output[index]);
							}
						});
					}
				});

				if (!test.error) {
					it(`Should return same output as item.toJSON() for ${JSON.stringify(test.input)}`, () => {
						const input = typeof test.input === "function" ? test.input() : test.input;

						if (Array.isArray(input[0])) {
							input[0].forEach((object) => {
								const item = new User(object);
								User.serializer.default.set();
								expectChai(item.serialize()).to.eql(item.toJSON());
							});
						}
					});
				}
			});
		});
	});

	describe("Model.methods", () => {
		let User, user;
		beforeEach(() => {
			User = dynamoose.model("User", {"id": Number, "name": String});
			user = new User();
		});
		afterEach(() => {
			User = null;
			user = null;
		});

		it("Should be an object", () => {
			expectChai(User.methods).to.be.an("object");
		});

		function customMethodTests (settings) {
			describe(`${settings.prefixName}.set`, () => {
				it("Should be a function", () => {
					expectChai(settings.methodEntryPoint().set).to.be.a("function");
				});

				it("Should not throw an error when being called", () => {
					expectChai(() => settings.methodEntryPoint().set("random", utils.empty_function)).to.not.throw();
				});

				it("Should set correct method on model", () => {
					settings.methodEntryPoint().set("random", utils.empty_function);
					expectChai(settings.testObject().random).to.be.a("function");
				});

				it("Should not overwrite internal methods", () => {
					const originalMethod = settings.testObject()[settings.existingMethod];
					const newMethod = utils.empty_function;
					settings.methodEntryPoint().set(settings.existingMethod, newMethod);
					expectChai(settings.testObject()[settings.existingMethod]).to.eql(originalMethod);
					expectChai(settings.testObject()[settings.existingMethod]).to.not.eql(newMethod);
				});

				it("Should overwrite methods if Internal.General.internalProperties exists but type doesn't", () => {
					const originalMethod = settings.testObject()[settings.existingMethod];
					const newMethod = utils.empty_function;
					settings.testObject().random = originalMethod;
					settings.testObject().random[Internal.General.internalProperties] = {};
					settings.methodEntryPoint().set(settings.existingMethod, newMethod);
					expectChai(settings.testObject().random).to.eql(originalMethod);
					expectChai(settings.testObject().random).to.not.eql(newMethod);
				});

				const methodTypes = [
					{"name": "Callback", "func": (func) => {
						return function (...args) {
							const cb = args[args.length - 1];
							func.bind(this)(...args).then((result) => cb(null, result)).catch((err) => cb(err));
						};
					}},
					{"name": "Promise", "func": (func) => func}
				];
				methodTypes.forEach((methodType) => {
					describe(`Method Type - ${methodType.name}`, () => {
						const callerTypes = [
							{"name": "Callback", "func": util.promisify},
							{"name": "Promise", "func": (func) => func}
						];
						callerTypes.forEach((callerType) => {
							describe(`Caller Type - ${callerType.name}`, () => {
								let methodTypeCallDetails = [], methodTypeCallResult = {};
								beforeEach(() => {
									settings.methodEntryPoint().set("action", methodType.func(async function (...args) {
										methodTypeCallDetails.push({"arguments": [...args], "this": this});
										if (methodTypeCallResult.error) {
											throw methodTypeCallResult.error;
										} else if (methodTypeCallResult.result) {
											return methodTypeCallResult.result;
										}
									}));
								});
								afterEach(() => {
									methodTypeCallDetails = [];
									methodTypeCallResult = {};
								});

								it("Should call custom method with correct arguments", async () => {
									methodTypeCallResult.result = "Success";
									await callerType.func(settings.testObject().action)();
									expectChai(methodTypeCallDetails.length).to.eql(1);
									expectChai(methodTypeCallDetails[0].arguments.length).to.eql(1);
									expectChai(methodTypeCallDetails[0].arguments[0]).to.be.a("function");
								});

								it("Should call custom method with correct arguments if passing in one argument", async () => {
									await callerType.func(settings.testObject().action)("Hello World");
									expectChai(methodTypeCallDetails.length).to.eql(1);
									expectChai(methodTypeCallDetails[0].arguments.length).to.eql(2);
									expectChai(methodTypeCallDetails[0].arguments[0]).to.eql("Hello World");
									expectChai(methodTypeCallDetails[0].arguments[1]).to.be.a("function");
								});

								it("Should call custom method with correct arguments if passing in two arguments", async () => {
									await callerType.func(settings.testObject().action)("Hello", "World");
									expectChai(methodTypeCallDetails.length).to.eql(1);
									expectChai(methodTypeCallDetails[0].arguments.length).to.eql(3);
									expectChai(methodTypeCallDetails[0].arguments[0]).to.eql("Hello");
									expectChai(methodTypeCallDetails[0].arguments[1]).to.eql("World");
									expectChai(methodTypeCallDetails[0].arguments[2]).to.be.a("function");
								});

								it("Should call custom method with correct `this`", async () => {
									methodTypeCallResult.result = "Success";
									// Not sure why we have to bind here
									// Through manual testing tho, you do not need to bind anything and in production use this works as described in the documentation
									// Would be nice to figure out why this is only necessary for our test suite and fix it
									await callerType.func(settings.testObject().action).bind(settings.testObject())();
									expectChai(methodTypeCallDetails[0].this).to.eql(settings.testObject());
								});

								it("Should return correct response that custom method returns", async () => {
									methodTypeCallResult.result = "Success";
									const result = await callerType.func(settings.testObject().action)();
									expectChai(result).to.eql("Success");
								});

								it("Should throw error if custom method throws error", async () => {
									methodTypeCallResult.error = "ERROR";
									let result, error;
									try {
										result = await callerType.func(settings.testObject().action)();
									} catch (e) {
										error = e;
									}
									expectChai(result).to.not.exist;
									expectChai(error).to.eql("ERROR");
								});
							});
						});
					});
				});
			});
			describe(`${settings.prefixName}.delete`, () => {
				it("Should be a function", () => {
					expectChai(settings.methodEntryPoint().delete).to.be.a("function");
				});

				it("Should not delete internal methods", () => {
					settings.methodEntryPoint().delete(settings.existingMethod);
					expectChai(settings.testObject()[settings.existingMethod]).to.be.a("function");
				});

				it("Should not throw error for deleting unknown method", () => {
					expectChai(() => settings.methodEntryPoint().delete("randomHere123")).to.not.throw();
				});

				it("Should delete custom method", () => {
					settings.methodEntryPoint().set("myMethod", utils.empty_function);
					expectChai(settings.testObject().myMethod).to.be.a("function");
					settings.methodEntryPoint().delete("myMethod");
					expectChai(settings.testObject().myMethod).to.eql(undefined);
				});
			});
		}

		customMethodTests({"prefixName": "Model.methods", "methodEntryPoint": () => User.methods, "testObject": () => User, "existingMethod": "get"});
		describe("Model.methods.item", () => {
			customMethodTests({"prefixName": "Model.methods.item", "methodEntryPoint": () => User.methods.item, "testObject": () => user, "existingMethod": "save"});
		});
	});
});

describe("Model Item Instance", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
	});

	let Cat;
	beforeEach(() => {
		const schema = new dynamoose.Schema({"name": String});
		Cat = dynamoose.model("Cat", schema);
	});

	it("Should allow creating instance of Model", () => {
		expectChai(() => new Cat({"name": "Bob"})).to.not.throw();
	});
});