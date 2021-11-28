const {"expect": expectChai} = require("chai");
const dynamoose = require("../dist");
const util = require("util");
const {Query} = require("../dist/ItemRetriever");
const {internalProperties} = require("../dist/Internal").General;
const CustomError = require("../dist/Error");

describe("Query", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
	});

	let queryPromiseResolver, queryParams;
	beforeEach(() => {
		dynamoose.aws.ddb.set({
			"query": (request) => {
				queryParams = request;
				return queryPromiseResolver();
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
		Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "favoriteNumber": Number});
		new dynamoose.Table("Cat", [Model]);
	});

	describe("Model.query", () => {
		it("Should return a function", () => {
			expectChai(Model.query).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query()).to.be.a.instanceof(Query);
		});

		it("Should have correct class name", () => {
			expectChai(Model.query().constructor.name).to.eql("Query");
		});

		it("Should set pending key if string passed into query function", () => {
			const id = "id";
			const query = Model.query(id);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": id});
		});

		it("Should set filters correctly for object passed into query function", () => {
			const query = Model.query({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"name": {"type": "EQ", "value": "Charlie"}}, {"id": {"type": "LE", "value": 5}}]);
		});

		it("Should throw error if unknown comparison operator is passed in", () => {
			expectChai(() => Model.query({"name": {"unknown": "Charlie"}})).to.throw("The type: unknown is invalid for the query operation.");
		});
	});

	describe("query.exec", () => {
		it("Should be a function", () => {
			expectChai(Model.query().exec).to.be.a("function");
		});

		it("Should return a promise", () => {
			queryPromiseResolver = () => ({"Items": []});
			expectChai(Model.query("name").eq("Charlie").exec()).to.be.a("promise");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return undefined for expired object", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000, "items": {"returnExpired": false}}});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([]);
				});

				it("Should return expired object if returnExpired is not set", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "ttl": {"N": "1"}}]});
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}});
					new dynamoose.Table("Cat", [Model], {"expires": {"ttl": 1000}});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "ttl": new Date(1000)}]);
				});

				it("Should return correct result if unknown properties are in DynamoDB", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": "1"}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if using custom types", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "birthday": Date});
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "birthday": new Date(1)}]);
				});

				it("Should return correct result for saveUnknown", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"type": "global"}}}, {"saveUnknown": true}));
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": 10}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "age": 10}]);
				});

				it("Should return correct metadata in result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1});
					const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expectChai(result.lastKey).to.eql(undefined);
					expectChai(result.count).to.eql(1);
					expectChai(result.queriedCount).to.eql(1);
					expectChai(result.timesQueried).to.eql(1);
				});

				it("Should return correct lastKey", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expectChai(result.lastKey).to.eql({"id": 5});
				});

				it("Should send correct request on query.exec", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expectChai(queryParams).to.eql({
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

				it("Should send correct request on query.exec if querying main key", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": String, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("id").eq("HelloWorld").exec).bind(Model.query("id").eq("HelloWorld"))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#qha": "id"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "HelloWorld"}
						},
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec if querying main key with range key", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "rangeKey": true}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("id").eq("HelloWorld").where("name").eq("Charlie").exec).bind(Model.query("id").eq("HelloWorld").where("name").eq("Charlie"))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#qha": "id",
							"#qra": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "HelloWorld"},
							":qrv": {"S": "Charlie"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
					});
				});

				it("Should send correct request on query.exec if querying main key with range key as less than comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": String, "age": {"type": Number, "rangeKey": true}});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("id").eq("HelloWorld").where("age").lt(10).exec).bind(Model.query("id").eq("HelloWorld").where("age").lt(10))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#qha": "id",
							"#qra": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "HelloWorld"},
							":qrv": {"N": "10"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra < :qrv"
					});
				});

				it("Should send correct request on query.exec using range key as less than comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").lt(10).exec).bind(Model.query("name").eq("Charlie").where("age").lt(10))();
					expectChai(queryParams).to.eql({
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
						"KeyConditionExpression": "#qha = :qhv AND #qra < :qrv"
					});
				});

				it("Should send correct request on query.exec using range key as between comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").between(10, 20).exec).bind(Model.query("name").eq("Charlie").where("age").between(10, 20))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#qra": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":qrv_1": {"N": "10"},
							":qrv_2": {"N": "20"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra BETWEEN :qrv_1 AND :qrv_2"
					});
				});

				it("Should send correct request on query.exec using range key as exists comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").exists().exec).bind(Model.query("name").eq("Charlie").where("age").exists())();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "attribute_exists (#a1)"
					});
				});

				it("Should send correct request on query.exec using range key as contains comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").contains(10).exec).bind(Model.query("name").eq("Charlie").where("age").contains(10))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1": {"N": "10"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "contains (#a1, :v1)"
					});
				});

				it("Should send correct request on query.exec using range key as beginsWith comparison", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").beginsWith(10).exec).bind(Model.query("name").eq("Charlie").where("age").beginsWith(10))();
					expectChai(queryParams).to.eql({
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
						"KeyConditionExpression": "#qha = :qhv AND begins_with (#qra, :qrv)"
					});
				});

				it("Should send correct request on query.exec using array of indexes", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": [{"type": "global", "rangeKey": "age", "name": "NameAgeIndex"}, {"type": "global", "rangeKey": "breed", "name": "NameBreedIndex"}]}, "age": Number, "breed": String});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("age").gt(10).exec).bind(Model.query("name").eq("Charlie").where("age").gt(10))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "NameAgeIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#qra": "age"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":qrv": {"N": "10"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra > :qrv"
					});

					await callType.func(Model.query("name").eq("Charlie").where("breed").eq("calico").exec).bind(Model.query("name").eq("Charlie").where("breed").eq("calico"))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "NameBreedIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#qra": "breed"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":qrv": {"S": "calico"}
						},
						"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
					});
				});

				it("Should send correct request on query.exec using array of indexes and unknown range key", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": String, "name": {"type": String, "index": [{"type": "global", "name": "NameIndex"}, {"type": "global", "rangeKey": "age", "name": "NameAgeIndex"}]}, "age": Number, "breed": String});
					new dynamoose.Table("Cat", [Model]);
					await callType.func(Model.query("name").eq("Charlie").where("breed").eq("calico").exec).bind(Model.query("name").eq("Charlie").where("breed").eq("calico"))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "NameIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "breed"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1": {"S": "calico"}
						},
						"KeyConditionExpression": "#qha = :qhv",
						"FilterExpression": "#a1 = :v1"
					});
				});

				it("Should send correct request on query.exec for one object passed in", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"name": "Charlie"}).exec).bind(Model.query({"name": "Charlie"}))();
					expectChai(queryParams).to.eql({
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
					expectChai(queryParams).to.eql({
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
					Model = dynamoose.model("Cat", {"id": Number, "age": {"type": Number, "index": {"type": "global"}}, "name": {"type": String, "index": {"type": "global"}}});
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"age": {"le": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.query({"age": {"le": 5}, "name": {"eq": "Charlie"}}))();
					expectChai(queryParams).to.eql({
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
					Model = dynamoose.model("Cat", {"id": Number, "age": {"type": Number, "index": {"type": "global"}}, "name": {"type": String, "index": {"type": "global"}}});
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query({"age": {"eq": 5}, "name": {"eq": "Charlie"}}).exec).bind(Model.query({"age": {"eq": 5}, "name": {"eq": "Charlie"}}))();
					expectChai(queryParams).to.eql({
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
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"ExpressionAttributeNames": {
							"#qha": "id",
							"#a0": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "test"},
							":v0": {"S": "Charlie"}
						},
						"FilterExpression": "#a0 = :v0",
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should send correct request on query.exec with multiple filters", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "age": Number, "breed": String});
					new dynamoose.Table("Cat", [Model]);
					const query = Model.query("name").eq("Charlie").filter("breed").eq("Cat").and().filter("age").gt(2);
					await callType.func(query.exec).bind(query)();
					expectChai(queryParams).to.eql({
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
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name",
							"#a1": "id"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie"},
							":v1_1": {"N": "1"},
							":v1_2": {"N": "3"}
						},
						"FilterExpression": "#a1 BETWEEN :v1_1 AND :v1_2",
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it("Should not include - in filter expression", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query("name").eq("Charlie").filter("id").between(1, 3);
					await callType.func(query.exec).bind(query)();
					expectChai(queryParams.FilterExpression).to.not.include("-");
				});

				it("Should send correct request on query.exec with query condition", async () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global", "rangeKey": "age"}}, "age": Number});
					new dynamoose.Table("Cat", [Model]);
					const query = Model.query("name").eq("Charlie").where("age").eq(10);
					await callType.func(query.exec).bind(query)();
					expectChai(queryParams).to.eql({
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
					Model = dynamoose.model("Cat", {"id": Number, "age": {"type": Number, "index": {"type": "global", "rangeKey": "name"}}, "name": String});
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query("age").eq(1).exec).bind(Model.query("age").eq(1))();
					expectChai(queryParams).to.eql({
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

				it("Should send correct request on query.exec when using nested groups with OR", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query({"name": "Charlie"}).and().where("favoriteNumber").le(18).parenthesis((a) => a.where("id").eq(1).or().where("id").eq(2));
					await callType.func(query.exec).bind(query)();
					expectChai(queryParams).to.eql({
						"ExpressionAttributeNames": {
							"#a1": "favoriteNumber",
							"#a2": "id",
							"#a3": "id",
							"#qha": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {
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
						"FilterExpression": "#a1 <= :v1 AND (#a2 = :v2 OR #a3 = :v3)",
						"IndexName": "nameGlobalIndex",
						"KeyConditionExpression": "#qha = :qhv",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on query.exec when using nested groups with AND", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query({"name": "Charlie"}).and().where("favoriteNumber").le(18).parenthesis((a) => a.where("id").eq(1).and().where("id").eq(2));
					await callType.func(query.exec).bind(query)();
					expectChai(queryParams).to.eql({
						"ExpressionAttributeNames": {
							"#a1": "favoriteNumber",
							"#a2": "id",
							"#a3": "id",
							"#qha": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {
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
						"FilterExpression": "#a1 <= :v1 AND (#a2 = :v2 AND #a3 = :v3)",
						"IndexName": "nameGlobalIndex",
						"KeyConditionExpression": "#qha = :qhv",
						"TableName": "Cat"
					});
				});

				it("Should send correct request on query.exec if we have a set setting for property", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}, "set": (val) => val + " Test"}, "favoriteNumber": Number});
					new dynamoose.Table("Cat", [Model]);

					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
					expectChai(queryParams).to.eql({
						"TableName": "Cat",
						"IndexName": "nameGlobalIndex",
						"ExpressionAttributeNames": {
							"#qha": "name"
						},
						"ExpressionAttributeValues": {
							":qhv": {"S": "Charlie Test"}
						},
						"KeyConditionExpression": "#qha = :qhv"
					});
				});

				it.skip("Should throw an error when passing in incorrect type in key", async () => {
					queryPromiseResolver = () => ({"Items": []});
					expect(callType.func(Model.query("name").eq(5).exec).bind(Model.query("name").eq(5))()).rejects.toEqual(new CustomError.InvalidType("test"));
				});

				it("Should return correct result with get function for attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"type": "global"}, "get": (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				it("Should return correct result with async get function for attribute", async () => {
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": {"type": String, "index": {"type": "global"}, "get": async (val) => `${val}-get`}}));
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expectChai((await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie-get"}]);
				});

				describe("Populate", () => {
					it("Should have populate function on response", async () => {
						queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
						const response = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
						expectChai(response.populate).to.be.a("function");
					});

					it("Should populate when calling populate function", async () => {
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": dynamoose.type.THIS});
						new dynamoose.Table("Cat", [Model]);
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}]}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"L": [{"N": "2"}, {"N": "3"}]}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2"]}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"NS": ["2", "3"]}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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
						Model = dynamoose.model("Cat", {"id": Number, "name": {"type": String, "index": {"type": "global"}}, "parent": dynamoose.type.THIS});
						new dynamoose.Table("Cat", [Model], {"populate": "*"});
						dynamoose.aws.ddb.set({
							"getItem": () => {
								return {"Item": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
							},
							"query": () => {
								return {"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "parent": {"N": "2"}}]};
							}
						});
						const result = await callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))();
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

				it("Should throw error if no indexes exist on model", () => {
					queryPromiseResolver = () => ({"Items": []});
					Model = dynamoose.model("Cat", new dynamoose.Schema({"id": Number, "name": String}));
					new dynamoose.Table("Cat", [Model]);

					return expect(callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).rejects.toEqual(new CustomError.InvalidParameter("Index can't be found for query."));
				});

				it("Should throw error if not querying index hash key", async () => {
					Model = dynamoose.model("Cat", {"id": Number, "age": {"type": Number, "index": {"type": "global", "rangeKey": "name"}}, "name": String});
					new dynamoose.Table("Cat", [Model]);
					queryPromiseResolver = () => ({"Items": []});
					return expect(callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).rejects.toEqual(new CustomError.InvalidParameter("Index can't be found for query."));
				});

				it("Should throw error from AWS", () => {
					queryPromiseResolver = () => {
						throw {"error": "Error"};
					};

					return expect(callType.func(Model.query("name").eq("Charlie").exec).bind(Model.query("name").eq("Charlie"))()).rejects.toEqual({"error": "Error"});
				});
			});
		});
	});

	describe("query.and", () => {
		it("Should be a function", () => {
			expectChai(Model.query().and).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().and()).to.be.a.instanceof(Query);
		});

		it("Should return same object as Model.query()", () => {
			expectChai(Model.query().and()).to.eql(Model.query());
		});
	});

	describe("query.not", () => {
		it("Should be a function", () => {
			expectChai(Model.query().not).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().not()).to.be.a.instanceof(Query);
		});

		it("Should set correct property", () => {
			expectChai(Model.query()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.undefined;
			expectChai(Model.query().not()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.true;
			expectChai(Model.query().not().not()[internalProperties].settings.condition[internalProperties].settings.pending.not).to.be.false;
		});
	});

	describe("query.where", () => {
		it("Should be a function", () => {
			expectChai(Model.query().where).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().where()).to.be.a.instanceof(Query);
		});

		it("Should not be an alias of query.filter", () => {
			expectChai(Model.query().where).to.not.eql(Model.query().filter);
		});

		it("Should set correct property", () => {
			expectChai(Model.query()[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
			expectChai(Model.query().where("id")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "id"});
			expectChai(Model.query().where("id").where("name")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "name"});
		});
	});

	describe("query.filter", () => {
		it("Should be a function", () => {
			expectChai(Model.query().filter).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().filter()).to.be.a.instanceof(Query);
		});

		it("Should set correct property", () => {
			expectChai(Model.query()[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
			expectChai(Model.query().filter("id")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "id"});
			expectChai(Model.query().filter("id").filter("name")[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({"key": "name"});
		});
	});

	describe("query.eq", () => {
		it("Should be a function", () => {
			expectChai(Model.query().eq).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().eq()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").eq("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "EQ", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().eq("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NE", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").eq(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(queryParams).to.eql({
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

		describe("Using index of table", () => {
			let LSIModel;

			beforeEach(() => {
				queryPromiseResolver = () => ({"Items": []});
				LSIModel = dynamoose.model("Cat", {
					"id": {
						"type": Number,
						"hashKey": true,
						"index": {
							"name": "myGSI",
							"rangeKey": "favoriteColor",
							"type": "global"
						}
					},
					"name": {
						"type": String,
						"rangeKey": true
					},
					"favoriteNumber": {
						"type": Number,
						"index": {
							"name": "myLSI",
							"type": "local"
						}
					},
					"favoriteColor": String,
					"favoriteShape": String
				});
				new dynamoose.Table("Cat", [LSIModel]);
			});

			it("Should send correct request with only hash key", async () => {
				await LSIModel.query("id").eq(7).exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"ExpressionAttributeNames": {
						"#qha": "id"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"}
					},
					"KeyConditionExpression": "#qha = :qhv"
				});
			});

			it("Should send correct request with hash+range key", async () => {
				await LSIModel.query("id").eq(7).where("name").eq("Charlie").exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"ExpressionAttributeNames": {
						"#qha": "id",
						"#qra": "name"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"},
						":qrv": {"S": "Charlie"}
					},
					"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
				});
			});

			it("Should send correct request with LSI and EQ on rangeKey", async () => {
				await LSIModel.query("id").eq(7).where("favoriteNumber").eq(2).exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"IndexName": "myLSI",
					"ExpressionAttributeNames": {
						"#qha": "id",
						"#qra": "favoriteNumber"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"},
						":qrv": {"N": "2"}
					},
					"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
				});
			});

			it("Should send correct request with LSI and GE on rangeKey", async () => {
				await LSIModel.query("id").eq(7).where("favoriteNumber").ge(2).exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"IndexName": "myLSI",
					"ExpressionAttributeNames": {
						"#qha": "id",
						"#qra": "favoriteNumber"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"},
						":qrv": {"N": "2"}
					},
					"KeyConditionExpression": "#qha = :qhv AND #qra >= :qrv"
				});
			});

			it("Should send correct request with GSI", async () => {
				await LSIModel.query("id").eq(7).where("favoriteColor").eq("red").exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"IndexName": "myGSI",
					"ExpressionAttributeNames": {
						"#qha": "id",
						"#qra": "favoriteColor"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"},
						":qrv": {"S": "red"}
					},
					"KeyConditionExpression": "#qha = :qhv AND #qra = :qrv"
				});
			});

			it("Should send correct request with hash key and filter", async () => {
				await LSIModel.query("id").eq(7).filter("favoriteShape").eq("square").exec();
				expectChai(queryParams).to.eql({
					"TableName": "Cat",
					"ExpressionAttributeNames": {
						"#qha": "id",
						"#a1": "favoriteShape"
					},
					"ExpressionAttributeValues": {
						":qhv": {"N": "7"},
						":v1": {"S": "square"}
					},
					"FilterExpression": "#a1 = :v1",
					"KeyConditionExpression": "#qha = :qhv"
				});
			});
		});
	});

	describe("query.exists", () => {
		it("Should be a function", () => {
			expectChai(Model.query().exists).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().exists()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").exists("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "EXISTS", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().exists("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NOT_EXISTS", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").exists().exec();
			expectChai(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"}
				},
				"FilterExpression": "attribute_exists (#a1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request with not()", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").not().exists().exec();
			expectChai(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"}
				},
				"FilterExpression": "attribute_not_exists (#a1)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.lt", () => {
		it("Should be a function", () => {
			expectChai(Model.query().lt).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().lt()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").lt("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LT", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().lt("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GE", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").lt(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().le).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().le()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").le("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LE", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().le("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GT", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").le(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().gt).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().gt()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").gt("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GT", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().gt("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LE", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").gt(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().ge).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().ge()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").ge("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "GE", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().ge("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "LT", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").ge(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().beginsWith).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().beginsWith()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").beginsWith("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "BEGINS_WITH", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().beginsWith("test");
			expectChai(query).to.throw("BEGINS_WITH can not follow not()");
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").beginsWith("test").exec();
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().contains).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().contains()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").contains("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "CONTAINS", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().contains("test");
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "NOT_CONTAINS", "value": "test"}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").contains(5).exec();
			expectChai(queryParams).to.eql({
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
			expectChai(queryParams).to.eql({
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
			expectChai(Model.query().in).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().in()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").in(["test", "other"]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "IN", "value": ["test", "other"]}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().in(["test", "other"]);
			expectChai(query).to.throw("IN can not follow not()");
		});

		it("Should send correct request", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").in([10, 20]).exec();
			expectChai(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1_1": {"N": "10"},
					":v1_2": {"N": "20"}
				},
				"FilterExpression": "#a1 IN (:v1_1, :v1_2)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});

		it("Should send correct request for many values", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").filter("age").in([10, 20, 30, 40]).exec();
			expectChai(queryParams).to.eql({
				"TableName": "Cat",
				"IndexName": "nameGlobalIndex",
				"ExpressionAttributeNames": {
					"#qha": "name",
					"#a1": "age"
				},
				"ExpressionAttributeValues": {
					":qhv": {"S": "Charlie"},
					":v1_1": {"N": "10"},
					":v1_2": {"N": "20"},
					":v1_3": {"N": "30"},
					":v1_4": {"N": "40"}
				},
				"FilterExpression": "#a1 IN (:v1_1, :v1_2, :v1_3, :v1_4)",
				"KeyConditionExpression": "#qha = :qhv"
			});
		});
	});

	describe("query.between", () => {
		it("Should be a function", () => {
			expectChai(Model.query().between).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().between()).to.be.a.instanceof(Query);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").between(1, 2);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.conditions).to.eql([{"id": {"type": "BETWEEN", "value": [1, 2]}}]);
			expectChai(query[internalProperties].settings.condition[internalProperties].settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().between(1, 2);
			expectChai(query).to.throw("BETWEEN can not follow not()");
		});
	});

	describe("query.limit", () => {
		it("Should be a function", () => {
			expectChai(Model.query().limit).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().limit(5);
			expectChai(query[internalProperties].settings.limit).to.eql(5);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").limit(5).exec();
			expectChai(queryParams.Limit).to.eql(5);
		});
	});

	describe("query.startAt", () => {
		it("Should be a function", () => {
			expectChai(Model.query().startAt).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().startAt({"id": 5});
			expectChai(query[internalProperties].settings.startAt).to.eql({"id": 5});
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").startAt({"id": 5}).exec();
			expectChai(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});

		it("Should set correct setting on query instance if passing in DynamoDB object", () => {
			const query = Model.query().startAt({"id": {"N": "5"}});
			expectChai(query[internalProperties].settings.startAt).to.eql({"id": {"N": "5"}});
		});

		it("Should send correct request on query.exec if passing in DynamoDB object", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").startAt({"id": {"N": "5"}}).exec();
			expectChai(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});
	});

	describe("query.attributes", () => {
		it("Should be a function", () => {
			expectChai(Model.query().attributes).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().attributes(["id"]);
			expectChai(query[internalProperties].settings.attributes).to.eql(["id"]);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").attributes(["id"]).exec();
			expectChai(queryParams.ProjectionExpression).to.eql("#a1");
			expectChai(queryParams.ExpressionAttributeNames).to.eql({"#a1": "id", "#qha": "name"});
		});

		it("Should send correct request on query.exec with multiple attributes", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").attributes(["id", "name"]).exec();
			expectChai(queryParams.ProjectionExpression).to.eql("#a1, #qha");
			expectChai(queryParams.ExpressionAttributeNames).to.eql({"#a1": "id", "#qha": "name"});
		});

		it("Should send correct request on query.exec with multiple attributes and one filter", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").attributes(["id", "name", "favoriteNumber"]).exec();
			expectChai(queryParams.ProjectionExpression).to.eql("#a1, #a2, #qha");
			expectChai(queryParams.ExpressionAttributeNames).to.eql({"#a1": "id", "#a2": "favoriteNumber", "#qha": "name"});
		});

		it("Should send correct request on scan.exec with multiple attributes and two filters", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").where("favoriteNumber").eq(1).attributes(["id", "name", "favoriteNumber"]).exec();
			expectChai(queryParams.ProjectionExpression).to.eql("#a1, #a2, #qha");
			expectChai(queryParams.ExpressionAttributeNames).to.eql({"#a1": "favoriteNumber", "#a2": "id", "#qha": "name"});
		});
	});

	describe("query.parallel", () => {
		it("Should not be a function", () => {
			expectChai(Model.query().parallel).to.not.be.a("function");
		});

		it("Should not exist", () => {
			expectChai(Model.query().parallel).to.not.exist;
		});
	});

	describe("query.count", () => {
		it("Should be a function", () => {
			expectChai(Model.query().count).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().count();
			expectChai(query[internalProperties].settings.count).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").count().exec();
			expectChai(queryParams.Select).to.eql("COUNT");
		});

		it("Should return correct result on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.query("name").eq("Charlie").count().exec();
			expectChai(result).to.eql({"count": 1, "queriedCount": 1});
		});
	});

	describe("query.consistent", () => {
		it("Should be a function", () => {
			expectChai(Model.query().consistent).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().consistent();
			expectChai(query[internalProperties].settings.consistent).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").consistent().exec();
			expectChai(queryParams.ConsistentRead).to.be.true;
		});
	});

	describe("query.using", () => {
		it("Should be a function", () => {
			expectChai(Model.query().using).to.be.a("function");
		});

		it("Should set correct setting on query instance", () => {
			const query = Model.query().using("customIndex");
			expectChai(query[internalProperties].settings.index).to.eql("customIndex");
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").using("customIndex").exec();
			expectChai(queryParams.IndexName).to.eql("customIndex");
		});
	});

	describe("query.sort", () => {
		it("Should be a function", () => {
			expectChai(Model.query().sort).to.be.a("function");
		});

		it("Should set correct setting on query instance for nothing", () => {
			const query = Model.query();
			expectChai(query[internalProperties].settings.sort).to.not.exist;
		});

		it("Should set correct setting on query instance for ascending", () => {
			const query = Model.query().sort("ascending");
			expectChai(query[internalProperties].settings.sort).to.eql("ascending");
		});

		it("Should set correct setting on query instance for descending", () => {
			const query = Model.query().sort("descending");
			expectChai(query[internalProperties].settings.sort).to.eql("descending");
		});

		it("Should send correct request on query.exec for nothing", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").exec();
			expectChai(queryParams.ScanIndexForward).to.not.exist;
		});

		it("Should send correct request on query.exec for ascending", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").sort("ascending").exec();
			expectChai(queryParams.ScanIndexForward).to.not.exist;
		});

		it("Should send correct request on query.exec for descending", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query("name").eq("Charlie").sort("descending").exec();
			expectChai(queryParams.ScanIndexForward).to.eql(false);
		});
	});

	describe("query.all", () => {
		it("Should be a function", () => {
			expectChai(Model.query().all).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expectChai(Model.query().all()).to.be.a.instanceof(Query);
		});

		it("Should set correct default options", () => {
			expectChai(Model.query().all()[internalProperties].settings.all).to.eql({"delay": 0, "max": 0});
		});

		it("Should set correct option for delay", () => {
			expectChai(Model.query().all(5)[internalProperties].settings.all).to.eql({"delay": 5, "max": 0});
		});

		it("Should set correct option for max", () => {
			expectChai(Model.query().all(0, 5)[internalProperties].settings.all).to.eql({"delay": 0, "max": 5});
		});

		it("Should handle delay correctly on query.exec", async () => {
			queryPromiseResolver = async () => ({"Items": [], "LastEvaluatedKey": {"id": {"S": "test"}}});

			const start = Date.now();
			await Model.query("name").eq("Charlie").all(10, 2).exec();
			const end = Date.now();
			expectChai(end - start).to.be.at.least(19);
		});

		it("Should send correct result on query.exec", async () => {
			let count = 0;
			queryPromiseResolver = async () => {
				const obj = {"Items": [{"id": ++count}], "Count": 1, "QueriedCount": 2};
				if (count < 2) {
					obj["LastEvaluatedKey"] = {"id": {"N": `${count}`}};
				}
				return obj;
			};

			const result = await Model.query("name").eq("Charlie").all().exec();
			expectChai(result.map((item) => ({...item}))).to.eql([{"id": 1}, {"id": 2}]);
			expectChai(result.count).to.eql(2);
			expectChai(result.queriedCount).to.eql(4);
			expectChai(result.lastKey).to.not.exist;
		});
	});
});
