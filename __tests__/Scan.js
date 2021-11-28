const {"expect": expectChai} = require("chai");
const dynamoose = require("../dist");
const util = require("util");
const {Scan} = require("../dist/ItemRetriever");
const {internalProperties} = require("../dist/Internal").General;
const CustomError = require("../dist/Error");

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
			expectChai(Model.scan).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan()).to.be.a.instanceof(Scan);
		});

		it("Should have correct class name", () => {
			expectChai(Model.scan().constructor.name).to.eql("Scan");
		});

		it("Should set pending key if string passed into scan function", () => {
			const id = "id";
			const scan = Model.scan(id);
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": id});
		});

		it("Should set filters correctly for object passed into scan function", () => {
			const scan = Model.scan({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"name": {"type": "EQ", "value": "Charlie"}}, {"id": {"type": "LE", "value": 5}}]);
		});

		it("Should throw error if unknown comparison operator is passed in", () => {
			expectChai(() => Model.scan({"name": {"unknown": "Charlie"}})).to.throw("The type: unknown is invalid for the scan operation.");
		});
	});

	describe("scan.exec", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().exec).to.be.a("function");
		});

		it("Should return a promise", () => {
			scanPromiseResolver = () => ({"Items": []});
			expectChai(Model.scan().exec()).to.be.a("promise");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return undefined for expired object", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([]);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000}});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "ttl": new Date(1000)}]);
				});

				it("Should return correct result if unknown properties are in DynamoDB", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": "1"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if using custom types", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "name": String, "birthday": Date});
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "birthday": new Date(1)}]);
				});

				it("Should return correct result for saveUnknown", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number}, {"saveUnknown": true}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct metadata in result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expectChai(result.lastKey).to.eql(undefined);
					expectChai(result.count).to.eql(1);
					expectChai(result.scannedCount).to.eql(1);
					expectChai(result.timesScanned).to.eql(1);
				});

				it("Should return correct lastKey", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expectChai(result.lastKey).to.eql({"id": 5});
				});

				it("Should send correct request on scan.exec", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan().exec).bind(Model.scan())();
					expectChai(scanParams).to.eql({"TableName": "Cat"});
				});

				it("Should send correct request on scan.exec for one object passed in", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan({"name": "Charlie"}).exec).bind(Model.scan({"name": "Charlie"}))();
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams).to.eql({
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
					expectChai(scanParams.FilterExpression).to.not.include("-");
				});

				it("Should return correct result for get function on attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "get": (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				it("Should return correct result for async get function on attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "get": async (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				describe("Populate", () => {
					it("Should have populate function on response", async () => {
						scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
						const response = await callType.func(Model.scan("name").eq("Charlie").exec).bind(Model.scan("name").eq("Charlie"))();
						expectChai(response.populate).to.be.a("function");
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
						expectChai(result.toJSON()).to.eql([{
							"id": 1,
							"name": "Charlie",
							"parent": 2
						}]);
						const populatedResult = await result.populate();
						expectChai(populatedResult.toJSON()).to.eql([{
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
						expectChai(result.toJSON()).to.eql([{
							"id": 1,
							"name": "Charlie",
							"parent": 2
						}]);
						const populatedResult = await result.populate();
						expectChai(populatedResult.toJSON()).to.eql([{
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
						expectChai(result.toJSON()).to.eql([{
							"id": 1,
							"name": "Charlie",
							"parent": [2]
						}]);
						const populatedResult = await result.populate();
						expectChai(populatedResult.toJSON()).to.eql([{
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
						expectChai(result.toJSON()).to.eql([{
							"id": 1,
							"name": "Charlie",
							"parent": [2, 3]
						}]);
						const populatedResult = await result.populate();
						expectChai(populatedResult.toJSON()).to.eql([{
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
						expectChai(Object.keys(result[0].toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(result[0].toJSON().id).to.eql(1);
						expectChai(result[0].toJSON().name).to.eql("Charlie");
						expectChai([...result[0].parent]).to.eql([2]);

						const populatedResult = await result.populate();
						expectChai(Object.keys(populatedResult[0].toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(populatedResult[0].toJSON().id).to.eql(1);
						expectChai(populatedResult[0].toJSON().name).to.eql("Charlie");
						expectChai(populatedResult[0].parent.length).to.eql(1);
						expectChai([...populatedResult[0].parent][0].toJSON()).to.eql({"id": 2, "name": "Bob"});
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
						expectChai(Object.keys(result[0].toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(result[0].toJSON().id).to.eql(1);
						expectChai(result[0].toJSON().name).to.eql("Charlie");
						expectChai([...result[0].parent]).to.eql([2, 3]);

						const populatedResult = await result.populate();
						expectChai(Object.keys(populatedResult[0].toJSON())).to.eql(["id", "name", "parent"]);
						expectChai(populatedResult[0].toJSON().id).to.eql(1);
						expectChai(populatedResult[0].toJSON().name).to.eql("Charlie");
						expectChai(populatedResult[0].parent.length).to.eql(2);
						expectChai([...populatedResult[0].parent][0].toJSON()).to.eql({"id": 2, "name": "Bob"});
						expectChai([...populatedResult[0].parent][1].toJSON()).to.eql({"id": 3, "name": "Tim"});
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
			expectChai(Model.scan().and).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().and()).to.be.a.instanceof(Scan);
		});

		it("Should return same object as Model.scan()", () => {
			expectChai(Model.scan().and()).to.eql(Model.scan());
		});
	});

	describe("scan.not", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().not).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().not()).to.be.a.instanceof(Scan);
		});

		it("Should set correct property", () => {
			expectChai(Model.scan()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.undefined;
			expectChai(Model.scan().not()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.true;
			expectChai(Model.scan().not().not()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.false;
		});
	});

	describe("scan.where", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().where).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().where()).to.be.a.instanceof(Scan);
		});

		it("Should set correct property", () => {
			expectChai(Model.scan()[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
			expectChai(Model.scan().where("id")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "id"});
			expectChai(Model.scan().where("id").where("name")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "name"});
		});
	});

	describe("scan.filter", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().filter).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().filter()).to.be.a.instanceof(Scan);
		});

		it("Should set correct property", () => {
			expectChai(Model.scan()[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
			expectChai(Model.scan().filter("id")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "id"});
			expectChai(Model.scan().filter("id").filter("name")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "name"});
		});
	});

	describe("scan.eq", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().eq).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().eq()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").eq("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "EQ", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().eq("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NE", "value": "test"}}]);
		});
	});

	describe("scan.exists", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().exists).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().exists()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").exists();
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "EXISTS", "value": undefined}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().exists();
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NOT_EXISTS", "value": undefined}}]);
		});
	});

	describe("scan.lt", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().lt).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().lt()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").lt("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LT", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().lt("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GE", "value": "test"}}]);
		});
	});

	describe("scan.le", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().le).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().le()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").le("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LE", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().le("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GT", "value": "test"}}]);
		});
	});

	describe("scan.gt", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().gt).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().gt()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").gt("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GT", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().gt("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LE", "value": "test"}}]);
		});
	});

	describe("scan.ge", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().ge).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().ge()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").ge("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GE", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().ge("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LT", "value": "test"}}]);
		});
	});

	describe("scan.beginsWith", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().beginsWith).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().beginsWith()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").beginsWith("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "BEGINS_WITH", "value": "test"}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().beginsWith("test");
			expectChai(scan).to.throw("BEGINS_WITH can not follow not()");
		});
	});

	describe("scan.contains", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().contains).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().contains()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").contains("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "CONTAINS", "value": "test"}}]);
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().contains("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NOT_CONTAINS", "value": "test"}}]);
		});
	});

	describe("scan.in", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().in).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().in()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").in("test");
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "IN", "value": "test"}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().in("test");
			expectChai(scan).to.throw("IN can not follow not()");
		});
	});

	describe("scan.between", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().between).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().between()).to.be.a.instanceof(Scan);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").between(1, 2);
			expectChai(scan[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "BETWEEN", "value": [1, 2]}}]);
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().between(1, 2);
			expectChai(scan).to.throw("BETWEEN can not follow not()");
		});
	});

	describe("scan.limit", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().limit).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().limit(5);
			expectChai(scan[internalProperties].settings.limit).to.eql(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().limit(5).exec();
			expectChai(scanParams.Limit).to.eql(5);
		});
	});

	describe("scan.startAt", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().startAt).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().startAt({"id": 5});
			expectChai(scan[internalProperties].settings.startAt).to.eql({"id": 5});
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": 5}).exec();
			expectChai(scanParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});

		it("Should set correct setting on scan instance if passing in DynamoDB object", () => {
			const scan = Model.scan().startAt({"id": {"N": "5"}});
			expectChai(scan[internalProperties].settings.startAt).to.eql({"id": {"N": "5"}});
		});

		it("Should send correct request on scan.exec if passing in DynamoDB object", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": {"N": "5"}}).exec();
			expectChai(scanParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});
	});

	describe("scan.attributes", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().attributes).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().attributes(["id"]);
			expectChai(scan[internalProperties].settings.attributes).to.eql(["id"]);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id"]).exec();
			expectChai(scanParams.ProjectionExpression).to.eql("#a1");
			expectChai(scanParams.ExpressionAttributeNames).to.eql({"#a0": "name", "#a1": "id"});
		});

		it("Should send correct request on scan.exec with multiple attributes", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id", "name"]).exec();
			expectChai(scanParams.ProjectionExpression).to.eql("#a0, #a1");
			expectChai(scanParams.ExpressionAttributeNames).to.eql({"#a0": "name", "#a1": "id"});
		});

		it("Should send correct request on scan.exec with multiple attributes no filters", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().attributes(["id", "name", "favoriteNumber"]).exec();
			expectChai(scanParams.ProjectionExpression).to.eql("#a1, #a2, #a3");
			expectChai(scanParams.ExpressionAttributeNames).to.eql({"#a1": "id", "#a2": "name", "#a3": "favoriteNumber"});
		});

		it("Should send correct request on scan.exec with multiple attributes and one filter", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").attributes(["id", "name", "favoriteNumber"]).exec();
			expectChai(scanParams.ProjectionExpression).to.eql("#a0, #a1, #a2");
			expectChai(scanParams.ExpressionAttributeNames).to.eql({"#a0": "name", "#a1": "id", "#a2": "favoriteNumber"});
		});

		it("Should send correct request on scan.exec with multiple attributes and two filters", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan("name").eq("Charlie").where("favoriteNumber").eq(1).attributes(["id", "name", "favoriteNumber"]).exec();
			expectChai(scanParams.ProjectionExpression).to.eql("#a0, #a1, #a2");
			expectChai(scanParams.ExpressionAttributeNames).to.eql({"#a0": "name", "#a1": "favoriteNumber", "#a2": "id"});
		});
	});

	describe("scan.parallel", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().parallel).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().parallel(5);
			expectChai(scan[internalProperties].settings.parallel).to.eql(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().parallel(5).exec();
			expectChai(scanParams.TotalSegments).to.eql(5);
		});

		it("Should return correct result on scan.exec", async () => {
			let count = 0;
			scanPromiseResolver = () => ({"Items": [{"id": count * 50, "name": "Test"}, {"id": count * 100, "name": "Test 2"}], "Count": 2, "ScannedCount": 3, "LastEvaluatedKey": {"id": {"N": `${count++}`}}});
			const result = await Model.scan().parallel(5).exec();
			expectChai(count).to.eql(5);
			expectChai(result.lastKey).to.eql([{"id": 0}, {"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]);
			expectChai(result.scannedCount).to.eql(15);
			expectChai(result.count).to.eql(10);
			expectChai(result.timesScanned).to.eql(5);
			expectChai(scanParams.Segment).to.eql(4);
		});
	});

	describe("scan.count", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().count).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().count();
			expectChai(scan[internalProperties].settings.count).to.be.true;
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().count().exec();
			expectChai(scanParams.Select).to.eql("COUNT");
		});

		it("Should return correct result on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.scan().count().exec();
			expectChai(result).to.eql({"count": 1, "scannedCount": 1});
		});
	});

	describe("scan.consistent", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().consistent).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().consistent();
			expectChai(scan[internalProperties].settings.consistent).to.be.true;
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().consistent().exec();
			expectChai(scanParams.ConsistentRead).to.be.true;
		});
	});

	describe("scan.using", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().using).to.be.a("function");
		});

		it("Should set correct setting on scan instance", () => {
			const scan = Model.scan().using("customIndex");
			expectChai(scan[internalProperties].settings.index).to.eql("customIndex");
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().using("customIndex").exec();
			expectChai(scanParams.IndexName).to.eql("customIndex");
		});
	});

	describe("scan.all", () => {
		it("Should be a function", () => {
			expectChai(Model.scan().all).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expectChai(Model.scan().all()).to.be.a.instanceof(Scan);
		});

		it("Should set correct default options", () => {
			expectChai(Model.scan().all()[internalProperties].settings.all).to.eql({"delay": 0, "max": 0});
		});

		it("Should set correct option for delay", () => {
			expectChai(Model.scan().all(5)[internalProperties].settings.all).to.eql({"delay": 5, "max": 0});
		});

		it("Should set correct option for max", () => {
			expectChai(Model.scan().all(0, 5)[internalProperties].settings.all).to.eql({"delay": 0, "max": 5});
		});

		it("Should handle delay correctly on scan.exec", async () => {
			scanPromiseResolver = async () => ({"Items": [], "LastEvaluatedKey": {"id": {"S": "test"}}});

			const start = Date.now();
			await Model.scan().all(10, 2).exec();
			const end = Date.now();
			expectChai(end - start).to.be.at.least(19);
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
			expectChai(result.map((item) => ({...item}))).to.eql([{"id": 1}, {"id": 2}]);
			expectChai(result.count).to.eql(2);
			expectChai(result.scannedCount).to.eql(4);
			expectChai(result.lastKey).to.not.exist;
		});
	});
});
