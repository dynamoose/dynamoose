const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const {expect} = chai;
const dynamoose = require("../lib");
const util = require("util");

describe("Query", () => {
	beforeEach(() => {
		dynamoose.Model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.Model.defaults = {};
	});

	let queryPromiseResolver, queryParams;
	beforeEach(() => {
		dynamoose.aws.ddb.set({
			"query": (request) => {
				queryParams = request;
				return {"promise": queryPromiseResolver};
			}
		});
	});
	afterEach(() => {
		dynamoose.aws.ddb.revert();
		queryPromiseResolver = null;
		queryParams = null;
	});

	let Model;
	beforeEach(() => {
		Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true}}});
	});

	describe("Model.query", () => {
		it("Should return a function", () => {
			expect(Model.query).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should have correct class name", () => {
			expect(Model.query().constructor.name).to.eql("Query");
		});

		it("Should set pending key if string passed into query function", () => {
			const id = "id";
			const query = Model.query(id);
			expect(query.settings.condition.settings.pending).to.eql({"key": id});
		});

		it("Should set filters correctly for object passed into query function", () => {
			const query = Model.query({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expect(query.settings.condition.settings.conditions).to.eql([["name", {"type": "EQ", "value": "Charlie"}], ["id", {"type": "LE", "value": 5}]]);
		});

		it("Should throw error if unknown comparison operator is passed in", () => {
			expect(() => Model.query({"name": {"unknown": "Charlie"}})).to.throw("The type: unknown is invalid for the query operation.");
		});
	});

	describe("query.exec", () => {
		it("Should be a function", () => {
			expect(Model.query().exec).to.be.a("function");
		});

		it("Should return a promise", () => {
			queryPromiseResolver = () => ({"Items": []});
			expect(Model.query("name").eq("Charlie").exec()).to.be.a("promise");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return undefined for expired object", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "ttl": {"N": "1"}}]});
					Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true}}}, {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([]);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "ttl": {"N": "1"}}]});
					Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true}}}, {"expires": {"ttl": 1000}});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "ttl": new Date(1000)}]);
				});

				it("Should return correct result if unknown properties are in DynamoDB", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": "1"}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if using custom types", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true}}, "birthday": Date});
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "birthday": new Date(1)}]);
				});

				it("Should return correct result for saveUnknown", async () => {
					Model = new dynamoose.Model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"global": true}}}, {"saveUnknown": true}));
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": 10}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "age": 10}]);
				});

				it("Should return correct metadata in result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1});
					const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expect(result.lastKey).to.eql(undefined);
					expect(result.count).to.eql(1);
					expect(result.queriedCount).to.eql(1);
					expect(result.timesQueried).to.eql(1);
				});

				it("Should return correct lastKey", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expect(result.lastKey).to.eql({"id": 5});
				});

				it("Should send correct request on query.exec", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"}
						},
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec for one object passed in", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"name": "Charlie"}).exec).bind(Model.query({"name": "Charlie"}))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"}
						},
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec for one object passed in with multiple filters", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"id": {"le": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.query({"id": {"le": 5}, "name": {"eq": "Charlie"}}))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a0": "id"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v0": {"N": "5"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "#a0 <= :v0"
					});
				});

				it("Should send correct request on query.exec for one object passed in and multiple indexes but only one equals", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "age": {"type": Number, "index": {"global": true}}, "name": {"type": String, "index": {"global": true}}});
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"age": {"le": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.query({"age": {"le": 5}, "name": {"eq": "Charlie"}}))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a0": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v0": {"N": "5"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "#a0 <= :v0"
					});
				});

				it("Should send correct request on query.exec for one object passed in and multiple indexes and multiple equals", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "age": {"type": Number, "index": {"global": true}}, "name": {"type": String, "index": {"global": true}}});
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"age": {"eq": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.query({"age": {"eq": 5}, "name": {"eq": "Charlie"}}))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "ageGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "age",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"N": "5"},
							":v1": {"S": "Charlie"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "#a1 = :v1"
					});
				});

				it("Should send correct request on query.exec with filters", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query("name").eq("Charlie").filter("id").eq("test");
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "id"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1": {"S": "test"}
						},
						"FilterExpression": "#a1 = :v1",
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec with multiple filters", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true}}, "age": Number, "breed": String});
					const query = Model.query("name").eq("Charlie").filter("breed").eq("Cat").and().filter("age").gt(2);
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "breed",
							"#a2": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1": {"S": "Cat"},
							":v2": {"N": "2"}
						},
						"FilterExpression": "#a1 = :v1 AND #a2 > :v2",
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec with filters and multiple values", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query("name").eq("Charlie").filter("id").between(1, 3);
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "id"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1-1": {"N": "1"},
							":v1-2": {"N": "3"}
						},
						"FilterExpression": "#a1 BETWEEN :v1-1 AND :v1-2",
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec with query condition", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = new dynamoose.Model("Cat", {"id": Number, "name": {"type": String, "index": {"global": true, "rangeKey": "age"}}, "age": Number});
					const query = Model.query("name").eq("Charlie").where("age").eq(10);
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#qra": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":qrv": {"N": "10"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
					});
				});

				it("Should send correct request on query.exec for index with hash and range key but only querying hash key", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "age": {"type": Number, "index": {"global": true, "rangeKey": "name"}}, "name": String});
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query("age").eq(1).exec).bind(Model.query("age").eq(1))();
					expect(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "ageGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"N": "1"}
						},
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should return correct result with get function for attribute", async () => {
					Model = new dynamoose.Model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"global": true}, "get": (val) => `${val}-get`}}));
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				it("Should return correct result with async get function for attribute", async () => {
					Model = new dynamoose.Model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"global": true}, "get": async (val) => `${val}-get`}}));
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				it("Should throw error if no indexes exist on model", () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = new dynamoose.Model("Cat", new dynamoose.Schema({"id": Number, "name": String}));

					return expect(callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).to.be.rejectedWith("Index can't be found for query.");
				});

				it("Should throw error if not querying index hash key", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "age": {"type": Number, "index": {"global": true, "rangeKey": "name"}}, "name": String});
					queryPromiseResolver = () => ({"Items": []});
					return expect(callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).to.be.rejectedWith("Index can't be found for query.");
				});

				it("Should throw error from AWS", () => {
					queryPromiseResolver = () => {
						throw {"error": "Error"};
					};

					return expect(callType.func(Model.query().exec).bind(Model.query())()).to.be.rejectedWith({"error": "Error"});
				});
			});
		});
	});

	describe("query.and", () => {
		it("Should be a function", () => {
			expect(Model.query().and).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().and()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should return same object as Model.query()", () => {
			expect(Model.query().and()).to.eql(Model.query());
		});
	});

	describe("query.not", () => {
		it("Should be a function", () => {
			expect(Model.query().not).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().not()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct property", () => {
			expect(Model.query().settings.condition.settings.pending.not).to.be.undefined;
			expect(Model.query().not().settings.condition.settings.pending.not).to.be.true;
			expect(Model.query().not().not().settings.condition.settings.pending.not).to.be.false;
		});
	});

	describe("query.where", () => {
		it("Should be a function", () => {
			expect(Model.query().where).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().where()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should not be an alias of query.filter", () => {
			expect(Model.query().where).to.not.eql(Model.query().filter);
		});

		it("Should set correct property", () => {
			expect(Model.query().settings.condition.settings.pending).to.eql({});
			expect(Model.query().where("id").settings.condition.settings.pending).to.eql({"key": "id"});
			expect(Model.query().where("id").where("name").settings.condition.settings.pending).to.eql({"key": "name"});
		});
	});

	describe("query.filter", () => {
		it("Should be a function", () => {
			expect(Model.query().filter).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().filter()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct property", () => {
			expect(Model.query().settings.condition.settings.pending).to.eql({});
			expect(Model.query().filter("id").settings.condition.settings.pending).to.eql({"key": "id"});
			expect(Model.query().filter("id").filter("name").settings.condition.settings.pending).to.eql({"key": "name"});
		});
	});

	describe("query.eq", () => {
		it("Should be a function", () => {
			expect(Model.query().eq).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().eq()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").eq("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "EQ", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().eq("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "NE", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").eq(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 = :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request with not()", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").not().eq(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 <> :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.exists", () => {
		it("Should be a function", () => {
			expect(Model.query().exists).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().exists()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").exists("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "EXISTS", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().exists("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "NOT_EXISTS", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").exists().exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
				},
				"FilterExpression": "attribute_exists (#a1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request with not()", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").not().exists().exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
				},
				"FilterExpression": "attribute_not_exists (#a1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.lt", () => {
		it("Should be a function", () => {
			expect(Model.query().lt).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().lt()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").lt("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "LT", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().lt("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "GE", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").lt(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 < :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.le", () => {
		it("Should be a function", () => {
			expect(Model.query().le).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().le()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").le("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "LE", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().le("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "GT", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").le(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 <= :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.gt", () => {
		it("Should be a function", () => {
			expect(Model.query().gt).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().gt()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").gt("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "GT", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().gt("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "LE", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").gt(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 > :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.ge", () => {
		it("Should be a function", () => {
			expect(Model.query().ge).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().ge()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").ge("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "GE", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().ge("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "LT", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").ge(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "#a1 >= :v1",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.beginsWith", () => {
		it("Should be a function", () => {
			expect(Model.query().beginsWith).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().beginsWith()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").beginsWith("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "BEGINS_WITH", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().beginsWith("test");
			expect(query).to.throw("BEGINS_WITH can not follow not()");
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").beginsWith("test").exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"S": "test"}
				},
				"FilterExpression": "begins_with (#a1, :v1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.contains", () => {
		it("Should be a function", () => {
			expect(Model.query().contains).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().contains()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").contains("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "CONTAINS", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().contains("test");
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "NOT_CONTAINS", "value": "test"}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").contains(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "contains (#a1, :v1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request with not()", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").not().contains(5).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1": {"N": "5"}
				},
				"FilterExpression": "NOT contains (#a1, :v1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.in", () => {
		it("Should be a function", () => {
			expect(Model.query().in).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().in()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").in(["test", "other"]);
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "IN", "value": ["test", "other"]}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().in(["test", "other"]);
			expect(query).to.throw("IN can not follow not()");
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").in([10, 20]).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1-1": {"N": "10"},
					":v1-2": {"N": "20"}
				},
				"FilterExpression": "#a1 IN (:v1-1, :v1-2)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request for many values", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").in([10, 20, 30, 40]).exec();
			expect(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1-1": {"N": "10"},
					":v1-2": {"N": "20"},
					":v1-3": {"N": "30"},
					":v1-4": {"N": "40"}
				},
				"FilterExpression": "#a1 IN (:v1-1, :v1-2, :v1-3, :v1-4)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.between", () => {
		it("Should be a function", () => {
			expect(Model.query().between).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().between()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").between(1, 2);
			expect(query.settings.condition.settings.conditions).to.eql([["id", {"type": "BETWEEN", "value": [1, 2]}]]);
			expect(query.settings.condition.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().between(1, 2);
			expect(query).to.throw("BETWEEN can not follow not()");
		});
	});

	describe("query.limit", () => {
		it("Should be a function", () => {
			expect(Model.query().limit).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().limit(5);
			expect(query.settings.limit).to.eql(5);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").limit(5).exec();
			expect(queryParams.Limit).to.eql(5);
		});
	});

	describe("query.startAt", () => {
		it("Should be a function", () => {
			expect(Model.query().startAt).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().startAt({"id": 5});
			expect(query.settings.startAt).to.eql({"id": 5});
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").startAt({"id": 5}).exec();
			expect(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});

		it("Should set correct setting on query instance if passing in DynamoDB object", () => {
			const query = Model.query().startAt({"id": {"N": "5"}});
			expect(query.settings.startAt).to.eql({"id": {"N": "5"}});
		});

		it("Should send correct request on query.exec if passing in DynamoDB object", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").startAt({"id": {"N": "5"}}).exec();
			expect(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});
	});

	describe("query.attributes", () => {
		it("Should be a function", () => {
			expect(Model.query().attributes).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().attributes(["id"]);
			expect(query.settings.attributes).to.eql(["id"]);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").attributes(["id"]).exec();
			expect(queryParams.AttributesToGet).to.eql(["id"]);
		});
	});

	describe("query.parallel", () => {
		it("Should not be a function", () => {
			expect(Model.query().parallel).to.not.be.a("function");
		});

		it("Should not exist", () => {
			expect(Model.query().parallel).to.not.exist;
		});
	});

	describe("query.count", () => {
		it("Should be a function", () => {
			expect(Model.query().count).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().count();
			expect(query.settings.count).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").count().exec();
			expect(queryParams.Select).to.eql("COUNT");
		});

		it("Should return correct result on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.query("name").eq("Charlie").count().exec();
			expect(result).to.eql({"count": 1, "queriedCount": 1});
		});
	});

	describe("query.consistent", () => {
		it("Should be a function", () => {
			expect(Model.query().consistent).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().consistent();
			expect(query.settings.consistent).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").consistent().exec();
			expect(queryParams.ConsistentRead).to.be.true;
		});
	});

	describe("query.using", () => {
		it("Should be a function", () => {
			expect(Model.query().using).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().using("customIndex");
			expect(query.settings.index).to.eql("customIndex");
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").using("customIndex").exec();
			expect(queryParams.IndexName).to.eql("customIndex");
		});
	});

	describe("query.all", () => {
		it("Should be a function", () => {
			expect(Model.query().all).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().all()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct default options", () => {
			expect(Model.query().all().settings.all).to.eql({"delay": 0, "max": 0});
		});

		it("Should set correct option for delay", () => {
			expect(Model.query().all(5).settings.all).to.eql({"delay": 5, "max": 0});
		});

		it("Should set correct option for max", () => {
			expect(Model.query().all(0, 5).settings.all).to.eql({"delay": 0, "max": 5});
		});

		it("Should handle delay correctly on query.exec", async () => {
			queryPromiseResolver = async () => ({"Items": [], "LastEvaluatedKey": {"id": {"S": "test"}}});

			const start = Date.now();
			await Model.query("name").eq("Charlie").all(10, 2).exec();
			const end = Date.now();
			expect(end - start).to.be.above(19);
		});

		it("Should send correct result on query.exec", async () => {
			let count = 0;
			queryPromiseResolver = async () => {
				const obj = ({"Items": [{"id": ++count}], "Count": 1, "QueriedCount": 2});
				if (count < 2) {
					obj["LastEvaluatedKey"] = {"id": {"N": `${count}`}};
				}
				return obj;
			};

			const result = await Model.query("name").eq("Charlie").all().exec();
			expect(result.map((item) => ({...item}))).to.eql([{"id": 1}, {"id": 2}]);
			expect(result.count).to.eql(2);
			expect(result.queriedCount).to.eql(4);
			expect(result.lastKey).to.not.exist;
		});
	});
});
