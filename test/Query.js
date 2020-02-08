const {expect} = require("chai");
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
		Model = new dynamoose.Model("Cat", {"id": Number, "name": String});
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
			expect(query.settings.pending).to.eql({"key": id});
		});

		it("Should set filters correctly for object passed into query function", () => {
			const query = Model.query({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expect(query.settings.filters).to.eql({"id": {"type": "LE", "value": 5}, "name": {"type": "EQ", "value": "Charlie"}});
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
			expect(Model.query().exec()).to.be.a("promise");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.query().exec).bind(Model.query())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if unknown properties are in DynamoDB", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "age": {"N": "1"}}]});
					expect((await callType.func(Model.query().exec).bind(Model.query())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct result if using custom types", async () => {
					Model = new dynamoose.Model("Cat", {"id": Number, "name": String, "birthday": Date});
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}, "birthday": {"N": "1"}}]});
					expect((await callType.func(Model.query().exec).bind(Model.query())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie", "birthday": new Date(1)}]);
				});

				it("Should return correct metadata in result", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1});
					const result = await callType.func(Model.query().exec).bind(Model.query())();
					expect(result.lastKey).to.eql(undefined);
					expect(result.count).to.eql(1);
					expect(result.queriedCount).to.eql(1);
					expect(result.timesQueried).to.eql(1);
				});

				it("Should return correct lastKey", async () => {
					queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.query().exec).bind(Model.query())();
					expect(result.lastKey).to.eql({"id": 5});
				});

				it("Should send correct request on query.exec", async () => {
					queryPromiseResolver = () => ({"Items": []});
					await callType.func(Model.query().exec).bind(Model.query())();
					expect(queryParams).to.eql({"QueryFilter": {}, "TableName": "Cat", "KeyConditions": {}});
				});

				it("Should send correct request on query.exec with filters", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query().filter("id").eq("test");
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({"QueryFilter": {
						"id": {
							"ComparisonOperator": "EQ",
							"AttributeValueList": [
								{"S": "test"}
							]
						}
					}, "TableName": "Cat", "KeyConditions": {}});
				});

				it("Should send correct request on query.exec with filters and multiple values", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query().filter("id").between(1, 3);
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({"QueryFilter": {
						"id": {
							"ComparisonOperator": "BETWEEN",
							"AttributeValueList": [
								{"N": "1"},
								{"N": "3"}
							]
						}
					}, "TableName": "Cat", "KeyConditions": {}});
				});

				it("Should send correct request on query.exec with query condition", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query().where("id").eq("test");
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({"KeyConditions": {
						"id": {
							"ComparisonOperator": "EQ",
							"AttributeValueList": [
								{"S": "test"}
							]
						}
					}, "TableName": "Cat", "QueryFilter": {}});
				});

				it("Should send correct request on query.exec with query condition and multiple values", async () => {
					queryPromiseResolver = () => ({"Items": []});
					const query = Model.query().where("id").between(1, 3);
					await callType.func(query.exec).bind(query)();
					expect(queryParams).to.eql({"KeyConditions": {
						"id": {
							"ComparisonOperator": "BETWEEN",
							"AttributeValueList": [
								{"N": "1"},
								{"N": "3"}
							]
						}
					}, "TableName": "Cat", "QueryFilter": {}});
				});

				it("Should throw error from AWS", async () => {
					queryPromiseResolver = () => {
						throw {"error": "Error"};
					};
					let result, error;
					try {
						result = await callType.func(Model.query().exec).bind(Model.query())();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql({"error": "Error"});
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

		it("Should return same object as Model.query()", async () => {
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
			expect(Model.query().settings.pending.not).to.be.undefined;
			expect(Model.query().not().settings.pending.not).to.be.true;
			expect(Model.query().not().not().settings.pending.not).to.be.false;
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
			expect(Model.query().settings.pending).to.eql({});
			expect(Model.query().where("id").settings.pending).to.eql({"key": "id", "queryCondition": true});
			expect(Model.query().where("id").where("name").settings.pending).to.eql({"key": "name", "queryCondition": true});
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
			expect(Model.query().settings.pending).to.eql({});
			expect(Model.query().filter("id").settings.pending).to.eql({"key": "id"});
			expect(Model.query().filter("id").filter("name").settings.pending).to.eql({"key": "name"});
		});
	});

	describe("query.null", () => {
		it("Should be a function", () => {
			expect(Model.query().null).to.be.a("function");
		});

		it("Should return an instance of query", () => {
			expect(Model.query().null()).to.be.a.instanceof(Model.query.carrier);
		});

		it("Should set correct settings on the query object", () => {
			const query = Model.query().filter("id").null();
			expect(query.settings.filters).to.eql({"id": {"type": "NULL", "value": []}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().null();
			expect(query.settings.filters).to.eql({"id": {"type": "NOT_NULL", "value": []}});
			expect(query.settings.pending).to.eql({});
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
			expect(query.settings.filters).to.eql({"id": {"type": "EQ", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().eq("test");
			expect(query.settings.filters).to.eql({"id": {"type": "NE", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should have same options as query.null for empty string, null, or undefined as value", () => {
			expect(Model.query().filter("id").eq().settings.filters).to.eql(Model.query().filter("id").null().settings.filters);
			expect(Model.query().filter("id").eq("").settings.filters).to.eql(Model.query().filter("id").null().settings.filters);
			expect(Model.query().filter("id").eq(null).settings.filters).to.eql(Model.query().filter("id").null().settings.filters);
			expect(Model.query().filter("id").eq(undefined).settings.filters).to.eql(Model.query().filter("id").null().settings.filters);
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
			expect(query.settings.filters).to.eql({"id": {"type": "LT", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().lt("test");
			expect(query.settings.filters).to.eql({"id": {"type": "GE", "value": "test"}});
			expect(query.settings.pending).to.eql({});
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
			expect(query.settings.filters).to.eql({"id": {"type": "LE", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().le("test");
			expect(query.settings.filters).to.eql({"id": {"type": "GT", "value": "test"}});
			expect(query.settings.pending).to.eql({});
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
			expect(query.settings.filters).to.eql({"id": {"type": "GT", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().gt("test");
			expect(query.settings.filters).to.eql({"id": {"type": "LE", "value": "test"}});
			expect(query.settings.pending).to.eql({});
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
			expect(query.settings.filters).to.eql({"id": {"type": "GE", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().ge("test");
			expect(query.settings.filters).to.eql({"id": {"type": "LT", "value": "test"}});
			expect(query.settings.pending).to.eql({});
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
			expect(query.settings.filters).to.eql({"id": {"type": "BEGINS_WITH", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().beginsWith("test");
			expect(query).to.throw("BEGINS_WITH can not follow not()");
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
			expect(query.settings.filters).to.eql({"id": {"type": "CONTAINS", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should set correct settings on the query object with not()", () => {
			const query = Model.query().filter("id").not().contains("test");
			expect(query.settings.filters).to.eql({"id": {"type": "NOT_CONTAINS", "value": "test"}});
			expect(query.settings.pending).to.eql({});
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
			const query = Model.query().filter("id").in("test");
			expect(query.settings.filters).to.eql({"id": {"type": "IN", "value": "test"}});
			expect(query.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const query = () => Model.query().filter("id").not().in("test");
			expect(query).to.throw("IN can not follow not()");
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
			expect(query.settings.filters).to.eql({"id": {"type": "BETWEEN", "value": [1, 2]}});
			expect(query.settings.pending).to.eql({});
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

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().limit(5);
			expect(query.settings.limit).to.eql(5);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().limit(5).exec();
			expect(queryParams.Limit).to.eql(5);
		});
	});

	describe("query.startAt", () => {
		it("Should be a function", () => {
			expect(Model.query().startAt).to.be.a("function");
		});

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().startAt({"id": 5});
			expect(query.settings.startAt).to.eql({"id": 5});
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().startAt({"id": 5}).exec();
			expect(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});

		it("Should set correct setting on query instance if passing in DynamoDB object", async () => {
			const query = Model.query().startAt({"id": {"N": "5"}});
			expect(query.settings.startAt).to.eql({"id": {"N": "5"}});
		});

		it("Should send correct request on query.exec if passing in DynamoDB object", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().startAt({"id": {"N": "5"}}).exec();
			expect(queryParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});
	});

	describe("query.attributes", () => {
		it("Should be a function", () => {
			expect(Model.query().attributes).to.be.a("function");
		});

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().attributes(["id"]);
			expect(query.settings.attributes).to.eql(["id"]);
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().attributes(["id"]).exec();
			expect(queryParams.AttributesToGet).to.eql(["id"]);
		});
	});

	describe("query.parallel", () => {
		it("Should not be a function", () => {
			expect(Model.query().parallel).to.not.be.a("function");
		});

		it("Should not exist", async () => {
			expect(Model.query().parallel).to.not.exist;
		});
	});

	describe("query.count", () => {
		it("Should be a function", () => {
			expect(Model.query().count).to.be.a("function");
		});

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().count();
			expect(query.settings.count).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().count().exec();
			expect(queryParams.Select).to.eql("COUNT");
		});

		it("Should return correct result on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "QueriedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.query().count().exec();
			expect(result).to.eql({"count": 1, "queriedCount": 1});
		});
	});

	describe("query.consistent", () => {
		it("Should be a function", () => {
			expect(Model.query().consistent).to.be.a("function");
		});

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().consistent();
			expect(query.settings.consistent).to.be.true;
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().consistent().exec();
			expect(queryParams.ConsistentRead).to.be.true;
		});
	});

	describe("query.using", () => {
		it("Should be a function", () => {
			expect(Model.query().using).to.be.a("function");
		});

		it("Should set correct setting on query instance", async () => {
			const query = Model.query().using("customIndex");
			expect(query.settings.index).to.eql("customIndex");
		});

		it("Should send correct request on query.exec", async () => {
			queryPromiseResolver = () => ({"Items": []});
			await Model.query().using("customIndex").exec();
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
			await Model.query().all(50, 2).exec();
			const end = Date.now();
			expect(end - start).to.be.above(99);
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

			const result = await Model.query().all().exec();
			expect(result.map((item) => ({...item}))).to.eql([{"id": 1}, {"id": 2}]);
			expect(result.count).to.eql(2);
			expect(result.queriedCount).to.eql(4);
			expect(result.lastKey).to.not.exist;
		});
	});
});
