const dynamoose = require("../dist");
const util = require("util");
const {Scan} = require("../dist/ItemRetriever");
const {internalProperties} = require("../dist/Internal").default.General;
const CustomError = require("../dist/Error").default;

describe("Scan", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
	});

	let scanPromiseResolver, scanParams;
	beforeEach(() => {
		dynamoose.aws.ddb.set({
			"scan": (request) => {
				scanParams = request;
				return scanPromiseResolver();
			}
		});
	});
	afterEach(() => {
		dynamoose.aws.ddb.revert();
		scanPromiseResolver = null;
		scanParams = null;
	});

	let Model;
	beforeEach(() => {
		Model = dynamoose.model("Cat", {"id": Number, "name": String, "favoriteNumber": Number});
		new dynamoose.Table("Cat", [Model]);
	});

	describe("Model.scan", () => {
		it("Should return a function", () => {
			expect(Model.scan).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan()).toBeInstanceOf(Scan);
		});

		it("Should have correct class name", () => {
			expect(Model.scan().constructor.name).toEqual("Scan");
		});

		it("Should set pending key if string passed into scan function", () => {
			const id = "id";
			const scan = Model.scan(id);
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({"key": id});
		});

		it("Should set filters correctly for object passed into scan function", () => {
			const scan = Model.scan({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"name": {"type": "EQ", "value": "Charlie"}}, {"id": {"type": "LE", "value": 5}}]);
		});

		it("Should throw error if unknown comparison operator is passed in", () => {
			expect(() => Model.scan({"name": {"unknown": "Charlie"}})).toThrow("The type: unknown is invalid for the scan operation.");
		});
	});

	describe("scan.exec", () => {
		it("Should be a function", () => {
			expect(Model.scan().exec).toBeInstanceOf(Function);
		});

		it("Should return a promise", () => {
			scanPromiseResolver = () => ({"Items": []});
			expect(Model.scan().exec()).toBeInstanceOf(Promise);
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should should throw an error if table not initialized", async () => {
					const Movie = dynamoose.model("Movie", {"id": Number, "name": String});
					new dynamoose.Table("Movie", [Movie], {
						"initialize": false
					});

					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					await expect(callType.func(Movie.scan().exec).bind(Movie.scan())()).rejects.toThrow("Table Movie has not been initialized.");
				});

				it("Should return correct result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result when passing in raw condition", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					const condition = new dynamoose.Condition({
						"FilterExpression": "id = :id",
						"ExpressionAttributeValues": {
							":id": {"N": "1"}
						},
						"ExpressionAttributeNames": {
							"#id": "id"
						}
					});
					expect((await callType.func(Model.scan(condition).exec).bind(Model.scan(condition))()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return undefined for expired object", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([]);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000}});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "ttl": new Date(1000)}]);
				});

				it("Should return correct result if unknown properties are in DynamoDB", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": "1"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if using custom types", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "name": String, "birthday": Date});
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie", "birthday": new Date(1)}]);
				});

				it("Should return correct result for saveUnknown", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct metadata in result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(result.lastKey).toEqual(undefined);
					expect(result.count).toEqual(1);
					expect(result.scannedCount).toEqual(1);
					expect(result.timesScanned).toEqual(1);
				});

				it("Should return correct lastKey", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(result.lastKey).toEqual({"id": 5});
				});

				it("Should send correct request on scan.exec", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(scanParams).toEqual({"TableName": "Cat"});
				});

				it("Should send correct request on scan.exec using string if scanning main key with aliased name", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const User = dynamoose.model("User", {"pk": {"type": String, "alias": "email"}});
					new dynamoose.Table("User", [User]);
					await callType.func(User.scan("email").eq("john@john.com").exec).bind(User.scan("email").eq("john@john.com"))();
					expect(scanParams).toEqual({
						"TableName": "User",
						"ExpressionAttributeNames": {
							"#a0": "pk"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "john@john.com"}
						},
						"FilterExpression": "#a0 = :v0"
					});
				});

				it("Should send correct request on scan.exec using object if scanning main key with aliased name", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const User = dynamoose.model("User", {"pk": {"type": String, "alias": "email"}});
					new dynamoose.Table("User", [User]);
					await callType.func(User.scan({"email": {"eq": "john@john.com"}}).exec).bind(User.scan({"email": {"eq": "john@john.com"}}))();
					expect(scanParams).toEqual({
						"TableName": "User",
						"ExpressionAttributeNames": {
							"#a0": "pk"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "john@john.com"}
						},
						"FilterExpression": "#a0 = :v0"
					});
				});

				it("Should send correct request on scan.exec using string if scanning main key with range key using aliased names", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const User = dynamoose.model("User", {"pk": {"type": String, "alias": "email"}, "sk": {"type": String, "alias": "name", "rangeKey": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User.scan("email").eq("john@john.com").where("name").eq("John").exec).bind(User.scan("email").eq("john@john.com").where("name").eq("John"))();
					expect(scanParams).toEqual({
						"TableName": "User",
						"ExpressionAttributeNames": {
							"#a0": "pk",
							"#a1": "sk"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "john@john.com"},
							":v1": {"S": "John"}
						},
						"FilterExpression": "#a0 = :v0 AND #a1 = :v1"
					});
				});

				it("Should send correct request on scan.exec using object if scanning main key with range key using aliased names", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const User = dynamoose.model("User", {"pk": {"type": String, "alias": "email"}, "sk": {"type": String, "alias": "name", "rangeKey": true}});
					new dynamoose.Table("User", [User]);
					await callType.func(User.scan({"email": {"eq": "john@john.com"}, "name": {"eq": "John"}}).exec).bind(User.scan({"email": {"eq": "john@john.com"}, "name": {"eq": "John"}}))();
					expect(scanParams).toEqual({
						"TableName": "User",
						"ExpressionAttributeNames": {
							"#a0": "pk",
							"#a1": "sk"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "john@john.com"},
							":v1": {"S": "John"}
						},
						"FilterExpression": "#a0 = :v0 AND #a1 = :v1"
					});
				});

				it("Should send correct request on scan.exec for one object passed in", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan({"name": "Charlie"}).exec).bind(Model.scan({"name": "Charlie"}))();
					expect(scanParams).toEqual({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "Charlie"}
						},
						"FilterExpression": "#a0 = :v0"
					});
				});

				it("Should send correct request on scan.exec for one object passed in", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan({"id": {"le": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.scan({"id": {"le": 5}, "name": {"eq": "Charlie"}}))();
					expect(scanParams).toEqual({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#a0": "id",
							"#a1": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"N": "5"},
							":v1": {"S": "Charlie"}
						},
						"FilterExpression": "#a0 <= :v0 AND #a1 = :v1"
					});
				});

				it("Should send correct request on scan.exec with filters", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan().filter("id").eq("test");
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).toEqual({
						"ExpressionAttributeNames": {
							"#a0": "id"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "test"}
						},
						"FilterExpression": "#a0 = :v0",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on scan.exec with filters and multiple values", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan().filter("id").between(1, 3);
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).toEqual({
						"ExpressionAttributeNames": {
							"#a0": "id"
						},
						"ExpressionAttributeValues": {
							":v0_1": {"N": "1"},
							":v0_2": {"N": "3"}
						},
						"FilterExpression": "#a0 BETWEEN :v0_1 AND :v0_2",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on scan.exec when using nested groups with OR", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan({"name": "Charlie"}).and().where("favoriteNumber").le(18).parenthesis((a) => a.where("id").eq(1).or().where("id").eq(2));
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).toEqual({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "favoriteNumber",
							"#a2": "id",
							"#a3": "id"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"N": "18"
							},
							":v2": {
								"N": "1"
							},
							":v3": {
								"N": "2"
							}
						},
						"FilterExpression": "#a0 = :v0 AND #a1 <= :v1 AND (#a2 = :v2 OR #a3 = :v3)",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on scan.exec when using nested groups with AND", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan({"name": "Charlie"}).and().where("favoriteNumber").le(18).parenthesis((a) => a.where("id").eq(1).and().where("id").eq(2));
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).toEqual({
						"ExpressionAttributeNames": {
							"#a0": "name",
							"#a1": "favoriteNumber",
							"#a2": "id",
							"#a3": "id"
						},
						"ExpressionAttributeValues": {
							":v0": {
								"S": "Charlie"
							},
							":v1": {
								"N": "18"
							},
							":v2": {
								"N": "1"
							},
							":v3": {
								"N": "2"
							}
						},
						"FilterExpression": "#a0 = :v0 AND #a1 <= :v1 AND (#a2 = :v2 AND #a3 = :v3)",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on scan.exec if we have a set setting for property", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "set": (val) => val + " Test"}, "favoriteNumber": Number});
					new dynamoose.Table("Cat", [Model]);

					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan({"name": "Charlie"});
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).toEqual({
						"ExpressionAttributeNames": {
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":v0": {"S": "Charlie Test"}
						},
						"FilterExpression": "#a0 = :v0",
						"TableName": "Cat"
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", async () => {
					scanPromiseResolver = () => ({"Items": []});
					expect(callType.func(Model.scan("name").eq(5).exec).bind(Model.scan("name").eq(5))()).rejects.toEqual(new CustomError.InvalidType("test"));
				});

				it("Should not include - in filter expression", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan().filter("id").between(1, 3);
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams.FilterExpression).not.toMatch("-");
				});

				it("Should return correct result for get function on attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "get": (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie-get"}]);
				});

				it("Should return correct result for async get function on attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "get": async (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).toEqual([{"id": 1, "name": "Charlie-get"}]);
				});

				describe("Populate", () => {
					it("Should have populate function on response", async () => {
						scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
						const response = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(response.populate).toBeInstanceOf(Function);
					});

					it("Should populate when calling populate function", async () => {
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": dynamoose.type.THIS});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(result.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": 2
						}]);
						const populatedResult = await result.populate();
						expect(populatedResult.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": {
								"id": 2,
								"name": "Bob"
							}
						}]);
					});

					it("Should populate when calling populate function with different model", async () => {
						const Model2 = dynamoose.model("Dog", {"id": Number, "name": String});
						new dynamoose.Table("Dog", [Model2]);
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": Model2});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(result.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": 2
						}]);
						const populatedResult = await result.populate();
						expect(populatedResult.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": {
								"id": 2,
								"name": "Bob"
							}
						}]);
					});

					it("Should populate when calling populate function with array of different models", async () => {
						const Model2 = dynamoose.model("Dog", {"id": Number, "name": String});
						new dynamoose.Table("Dog", [Model2]);
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": {"type": Array, "schema": [Model2]}});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(result.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						}]);
						const populatedResult = await result.populate();
						expect(populatedResult.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": [{
								"id": 2,
								"name": "Bob"
							}]
						}]);
					});

					it("Should populate when calling populate function with array of different models with multiple items", async () => {
						const Model2 = dynamoose.model("Dog", {"id": Number, "name": String});
						new dynamoose.Table("Dog", [Model2]);
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": {"type": Array, "schema": [Model2]}});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								return params.Key.id.N === "2" ? {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}} : {"Item": {"id": {"N": "3"}, "name": {"S": "Tim"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}, {"N": "3"}]}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(result.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": [2, 3]
						}]);
						const populatedResult = await result.populate();
						expect(populatedResult.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": [{
								"id": 2,
								"name": "Bob"
							}, {
								"id": 3,
								"name": "Tim"
							}]
						}]);
					});

					it("Should populate when calling populate function with set of different models", async () => {
						const Model2 = dynamoose.model("Dog", {"id": Number, "name": String});
						new dynamoose.Table("Dog", [Model2]);
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": {"type": Set, "schema": [Model2]}});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(Object.keys(result[0].toJSON())).toEqual(["id", "name", "parent"]);
						expect(result[0].toJSON().id).toEqual(1);
						expect(result[0].toJSON().name).toEqual("Charlie");
						expect([...result[0].parent]).toEqual([2]);

						const populatedResult = await result.populate();
						expect(Object.keys(populatedResult[0].toJSON())).toEqual(["id", "name", "parent"]);
						expect(populatedResult[0].toJSON().id).toEqual(1);
						expect(populatedResult[0].toJSON().name).toEqual("Charlie");
						expect(populatedResult[0].parent.length).toEqual(1);
						expect([...populatedResult[0].parent][0].toJSON()).toEqual({"id": 2, "name": "Bob"});
					});

					it("Should populate when calling populate function with set of different models with multiple items", async () => {
						const Model2 = dynamoose.model("Dog", {"id": Number, "name": String});
						new dynamoose.Table("Dog", [Model2]);
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": {"type": Set, "schema": [Model2]}});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": (params) => {
								return params.Key.id.N === "2" ? {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}} : {"Item": {"id": {"N": "3"}, "name": {"S": "Tim"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2", "3"]}}]};
							}
						});
						const result = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expect(Object.keys(result[0].toJSON())).toEqual(["id", "name", "parent"]);
						expect(result[0].toJSON().id).toEqual(1);
						expect(result[0].toJSON().name).toEqual("Charlie");
						expect([...result[0].parent]).toEqual([2, 3]);

						const populatedResult = await result.populate();
						expect(Object.keys(populatedResult[0].toJSON())).toEqual(["id", "name", "parent"]);
						expect(populatedResult[0].toJSON().id).toEqual(1);
						expect(populatedResult[0].toJSON().name).toEqual("Charlie");
						expect(populatedResult[0].parent.length).toEqual(2);
						expect([...populatedResult[0].parent][0].toJSON()).toEqual({"id": 2, "name": "Bob"});
						expect([...populatedResult[0].parent][1].toJSON()).toEqual({"id": 3, "name": "Tim"});
					});

					it("Should autopopulate if model settings have populate set", async () => {
						Model = dynamoose.model("Cat", {"id": Number, "name": String, "parent": dynamoose.type.THIS});
						new dynamoose.Table("Cat", [Model], {"populate": "*"});
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"scan": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.scan().exec).bind(Model.scan())();
						expect(result.toJSON()).toEqual([{
							"id": 1,
							"name": "Charlie",
							"parent": {
								"id": 2,
								"name": "Bob"
							}
						}]);
					});
				});

				it("Should throw error from AWS", () => {
					scanPromiseResolver = () => {
						throw {"error": "Error"};
					};

					return expect(callType.func(Model.scan().exec).bind(Model.scan())()).rejects.toEqual({"error": "Error"});
				});
			});
		});
	});

	describe("scan.and", () => {
		it("Should be a function", () => {
			expect(Model.scan().and).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().and()).toBeInstanceOf(Scan);
		});

		it("Should return same object as Model.scan()", () => {
			expect(Model.scan().and()).toEqual(Model.scan());
		});
	});

	describe("scan.not", () => {
		it("Should be a function", () => {
			expect(Model.scan().not).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().not()).toBeInstanceOf(Scan);
		});

		it("Should set correct property", () => {
			expect(Model.scan().getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending.not).toEqual(undefined);
			expect(Model.scan().not().getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending.not).toEqual(true);
			expect(Model.scan().not().not().getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending.not).toEqual(false);
		});
	});

	describe("scan.where", () => {
		it("Should be a function", () => {
			expect(Model.scan().where).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().where()).toBeInstanceOf(Scan);
		});

		it("Should set correct property", () => {
			expect(Model.scan().getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({});
			expect(Model.scan().where("id").getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({"key": "id"});
			expect(Model.scan().where("id").where("name").getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({"key": "name"});
		});
	});

	describe("scan.filter", () => {
		it("Should be a function", () => {
			expect(Model.scan().filter).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().filter()).toBeInstanceOf(Scan);
		});

		it("Should set correct property", () => {
			expect(Model.scan().getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({});
			expect(Model.scan().filter("id").getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({"key": "id"});
			expect(Model.scan().filter("id").filter("name").getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.pending).toEqual({"key": "name"});
		});
	});

	describe("scan.eq", () => {
		it("Should be a function", () => {
			expect(Model.scan().eq).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().eq()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").eq("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "EQ", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().eq("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "NE", "value": "test"}}]);
		});
	});

	describe("scan.exists", () => {
		it("Should be a function", () => {
			expect(Model.scan().exists).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().exists()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").exists();
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "EXISTS", "value": undefined}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().exists();
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "NOT_EXISTS", "value": undefined}}]);
		});
	});

	describe("scan.lt", () => {
		it("Should be a function", () => {
			expect(Model.scan().lt).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().lt()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").lt("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "LT", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().lt("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "GE", "value": "test"}}]);
		});
	});

	describe("scan.le", () => {
		it("Should be a function", () => {
			expect(Model.scan().le).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().le()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").le("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "LE", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().le("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "GT", "value": "test"}}]);
		});
	});

	describe("scan.gt", () => {
		it("Should be a function", () => {
			expect(Model.scan().gt).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().gt()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").gt("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "GT", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().gt("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "LE", "value": "test"}}]);
		});
	});

	describe("scan.ge", () => {
		it("Should be a function", () => {
			expect(Model.scan().ge).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().ge()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").ge("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "GE", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().ge("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "LT", "value": "test"}}]);
		});
	});

	describe("scan.beginsWith", () => {
		it("Should be a function", () => {
			expect(Model.scan().beginsWith).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().beginsWith()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").beginsWith("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "BEGINS_WITH", "value": "test"}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().beginsWith("test");
			expect(scan).toThrow("BEGINS_WITH can not follow not()");
		});
	});

	describe("scan.contains", () => {
		it("Should be a function", () => {
			expect(Model.scan().contains).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().contains()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").contains("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "CONTAINS", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().contains("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "NOT_CONTAINS", "value": "test"}}]);
		});
	});

	describe("scan.in", () => {
		it("Should be a function", () => {
			expect(Model.scan().in).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().in()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").in("test");
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "IN", "value": "test"}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().in("test");
			expect(scan).toThrow("IN can not follow not()");
		});
	});

	describe("scan.between", () => {
		it("Should be a function", () => {
			expect(Model.scan().between).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().between()).toBeInstanceOf(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").between(1, 2);
			expect(scan.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).settings.conditions).toEqual([{"id": {"type": "BETWEEN", "value": [1, 2]}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().between(1, 2);
			expect(scan).toThrow("BETWEEN can not follow not()");
		});
	});

	describe("scan.limit", () => {
		it("Should be a function", () => {
			expect(Model.scan().limit).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().limit(5);
			expect(scan.getInternalProperties(internalProperties).settings.limit).toEqual(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().limit(5).exec();
			expect(scanParams.Limit).toEqual(5);
		});
	});

	describe("scan.startAt", () => {
		it("Should be a function", () => {
			expect(Model.scan().startAt).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().startAt({"id": 5});
			expect(scan.getInternalProperties(internalProperties).settings.startAt).toEqual({"id": 5});
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": 5}).exec();
			expect(scanParams.ExclusiveStartKey).toEqual({"id": {"N": "5"}});
		});

		it("Should set correct setting on scan instance if passing in DynamoDB object", () => {
			const scan = Model.scan().startAt({"id": {"N": "5"}});
			expect(scan.getInternalProperties(internalProperties).settings.startAt).toEqual({"id": {"N": "5"}});
		});

		it("Should send correct request on scan.exec if passing in DynamoDB object", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": {"N": "5"}}).exec();
			expect(scanParams.ExclusiveStartKey).toEqual({"id": {"N": "5"}});
		});
	});

	describe("scan.attributes", () => {
		it("Should be a function", () => {
			expect(Model.scan().attributes).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().attributes(["id"]);
			expect(scan.getInternalProperties(internalProperties).settings.attributes).toEqual(["id"]);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id"]).exec();
			expect(scanParams.ProjectionExpression).toEqual("#a1");
			expect(scanParams.ExpressionAttributeNames).toEqual({"#a0": "name", "#a1": "id"});
		});

		it("Should send correct request on scan.exec with multiple attributes", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id", "name"]).exec();
			expect(scanParams.ProjectionExpression).toEqual("#a0, #a1");
			expect(scanParams.ExpressionAttributeNames).toEqual({"#a0": "name", "#a1": "id"});
		});

		it("Should send correct request on scan.exec with multiple attributes no filters", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().attributes(["id", "name", "favoriteNumber"]).exec();
			expect(scanParams.ProjectionExpression).toEqual("#a1, #a2, #a3");
			expect(scanParams.ExpressionAttributeNames).toEqual({"#a1": "id", "#a2": "name", "#a3": "favoriteNumber"});
		});

		it("Should send correct request on scan.exec with multiple attributes and one filter", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id", "name", "favoriteNumber"]).exec();
			expect(scanParams.ProjectionExpression).toEqual("#a0, #a1, #a2");
			expect(scanParams.ExpressionAttributeNames).toEqual({"#a0": "name", "#a1": "id", "#a2": "favoriteNumber"});
		});

		it("Should send correct request on scan.exec with multiple attributes and two filters", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").where("favoriteNumber").eq(1).attributes(["id", "name", "favoriteNumber"]).exec();
			expect(scanParams.ProjectionExpression).toEqual("#a0, #a1, #a2");
			expect(scanParams.ExpressionAttributeNames).toEqual({"#a0": "name", "#a1": "favoriteNumber", "#a2": "id"});
		});
	});

	describe("scan.parallel", () => {
		it("Should be a function", () => {
			expect(Model.scan().parallel).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().parallel(5);
			expect(scan.getInternalProperties(internalProperties).settings.parallel).toEqual(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().parallel(5).exec();
			expect(scanParams.TotalSegments).toEqual(5);
		});

		it("Should return correct result on scan.exec", async () => {
			let count = 0;
			scanPromiseResolver = () => ({"Items": [{"id": count * 50, "name": "Test"}, {"id": count * 100, "name": "Test 2"}], "Count": 2, "ScannedCount": 3, "LastEvaluatedKey": {"id": {"N": `${count++}`}}});
			const result = await Model.scan().parallel(5).exec();
			expect(count).toEqual(5);
			expect(result.lastKey).toEqual([{"id": 0}, {"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]);
			expect(result.scannedCount).toEqual(15);
			expect(result.count).toEqual(10);
			expect(result.timesScanned).toEqual(5);
			expect(scanParams.Segment).toEqual(4);
		});
	});

	describe("scan.count", () => {
		it("Should be a function", () => {
			expect(Model.scan().count).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().count();
			expect(scan.getInternalProperties(internalProperties).settings.count).toEqual(true);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().count().exec();
			expect(scanParams.Select).toEqual("COUNT");
		});

		it("Should return correct result on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.scan().count().exec();
			expect(result).toEqual({"count": 1, "scannedCount": 1});
		});
	});

	describe("scan.consistent", () => {
		it("Should be a function", () => {
			expect(Model.scan().consistent).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().consistent();
			expect(scan.getInternalProperties(internalProperties).settings.consistent).toEqual(true);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().consistent().exec();
			expect(scanParams.ConsistentRead).toEqual(true);
		});
	});

	describe("scan.using", () => {
		it("Should be a function", () => {
			expect(Model.scan().using).toBeInstanceOf(Function);
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().using("customIndex");
			expect(scan.getInternalProperties(internalProperties).settings.index).toEqual("customIndex");
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().using("customIndex").exec();
			expect(scanParams.IndexName).toEqual("customIndex");
		});
	});

	describe("scan.all", () => {
		it("Should be a function", () => {
			expect(Model.scan().all).toBeInstanceOf(Function);
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().all()).toBeInstanceOf(Scan);
		});

		it("Should set correct default options", () => {
			expect(Model.scan().all().getInternalProperties(internalProperties).settings.all).toEqual({"delay": 0, "max": 0});
		});

		it("Should set correct option for delay", () => {
			expect(Model.scan().all(5).getInternalProperties(internalProperties).settings.all).toEqual({"delay": 5, "max": 0});
		});

		it("Should set correct option for max", () => {
			expect(Model.scan().all(0, 5).getInternalProperties(internalProperties).settings.all).toEqual({"delay": 0, "max": 5});
		});

		it("Should handle delay correctly on scan.exec", async () => {
			scanPromiseResolver = async () => ({"Items": [], "LastEvaluatedKey": {"id": {"S": "test"}}});

			const start = Date.now();
			await Model.scan().all(10, 2).exec();
			const end = Date.now();
			expect(end - start).toBeGreaterThan(19);
		});

		it("Should send correct result on scan.exec", async () => {
			let count = 0;
			scanPromiseResolver = async () => {
				const obj = {"Items": [{"id": ++count}], "Count": 1, "ScannedCount": 2};
				if (count < 2) {
					obj["LastEvaluatedKey"] = {"id": {"N": `${count}`}};
				}
				return obj;
			};

			const result = await Model.scan().all().exec();
			expect(result.map((item) => ({...item}))).toEqual([{"id": 1}, {"id": 2}]);
			expect(result.count).toEqual(2);
			expect(result.scannedCount).toEqual(4);
			expect(result.lastKey).not.toBeDefined();
		});
	});
});
