const {expect} = require("chai");
const dynamoose = require("../lib");
const util = require("util");

describe("Scan", () => {
	beforeEach(() => {
		dynamoose.model.defaults = {"create": false, "waitForActive": false};
	});
	afterEach(() => {
		dynamoose.model.defaults = {};
	});

	let scanPromiseResolver, scanParams;
	beforeEach(() => {
		dynamoose.aws.ddb.set({
			"scan": (request) => {
				scanParams = request;
				return {"promise": scanPromiseResolver};
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
		Model = new dynamoose.model("Cat", {"id": Number, "name": String});
	});

	describe("Model.scan", () => {
		it("Should return a function", () => {
			expect(Model.scan).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should have correct class name", () => {
			expect(Model.scan().constructor.name).to.eql("Scan");
		});

		it("Should set pending key if string passed into scan function", () => {
			const id = "id";
			const scan = Model.scan(id);
			expect(scan.settings.pending).to.eql({"key": id});
		});

		it("Should set filters correctly for object passed into scan function", () => {
			const scan = Model.scan({"name": {"eq": "Charlie"}, "id": {"le": 5}});
			expect(scan.settings.filters).to.eql({"id": {"type": "LE", "value": 5}, "name": {"type": "EQ", "value": "Charlie"}});
		});

		it("Should throw error if unknown comparison operator is passed in", () => {
			expect(() => Model.scan({"name": {"unknown": "Charlie"}})).to.throw("The type: unknown is invalid for the scan operation.");
		});
	});

	describe("scan.exec", () => {
		it("Should be a function", () => {
			expect(Model.scan().exec).to.be.a("function");
		});

		it("Should return a promise", () => {
			scanPromiseResolver = () => ({"Items": []});
			expect(Model.scan().exec()).to.be.a("promise");
		});

		const functionCallTypes = [
			{"name": "Promise", "func": (func) => func},
			{"name": "Callback", "func": (func) => util.promisify(func)}
		];
		functionCallTypes.forEach((callType) => {
			describe(callType.name, () => {
				it("Should return correct result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}]});
					expect((await callType.func(Model.scan().exec).bind(Model.scan())()).map((item) => ({...item}))).to.eql([{"id": 1, "name": "Charlie"}]);
				});

				it("Should return correct metadata in result", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(result.lastKey).to.eql(undefined);
					expect(result.count).to.eql(1);
					expect(result.scannedCount).to.eql(1);
					expect(result.timesScanned).to.eql(1);
				});

				it("Should return correct lastKey", async () => {
					scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
					const result = await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(result.lastKey).to.eql({"id": 5});
				});

				it("Should send correct request on scan.exec", async () => {
					scanPromiseResolver = () => ({"Items": []});
					await callType.func(Model.scan().exec).bind(Model.scan())();
					expect(scanParams).to.eql({"ScanFilter": {}, "TableName": "Cat"});
				});

				it("Should send correct request on scan.exec with filters", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan().filter("id").eq("test");
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).to.eql({"ScanFilter": {
						"id": {
							"ComparisonOperator": "EQ",
							"AttributeValueList": [
								{"S": "test"}
							]
						}
					}, "TableName": "Cat"});
				});

				it("Should send correct request on scan.exec with filters and multiple values", async () => {
					scanPromiseResolver = () => ({"Items": []});
					const scan = Model.scan().filter("id").between(1, 3);
					await callType.func(scan.exec).bind(scan)();
					expect(scanParams).to.eql({"ScanFilter": {
						"id": {
							"ComparisonOperator": "BETWEEN",
							"AttributeValueList": [
								{"N": "1"},
								{"N": "3"}
							]
						}
					}, "TableName": "Cat"});
				});

				it("Should throw error from AWS", async () => {
					scanPromiseResolver = () => {
						throw {"error": "Error"};
					};
					let result, error;
					try {
						result = await callType.func(Model.scan().exec).bind(Model.scan())();
					} catch (e) {
						error = e;
					}
					expect(result).to.not.exist;
					expect(error).to.eql({"error": "Error"});
				});
			});
		});
	});

	describe("scan.and", () => {
		it("Should be a function", () => {
			expect(Model.scan().and).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().and()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should return same object as Model.scan()", async () => {
			expect(Model.scan().and()).to.eql(Model.scan());
		});
	});

	describe("scan.not", () => {
		it("Should be a function", () => {
			expect(Model.scan().not).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().not()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct property", () => {
			expect(Model.scan().settings.pending.not).to.be.undefined;
			expect(Model.scan().not().settings.pending.not).to.be.true;
			expect(Model.scan().not().not().settings.pending.not).to.be.false;
		});
	});

	describe("scan.where", () => {
		it("Should be a function", () => {
			expect(Model.scan().where).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().where()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should be an alias of scan.filter", () => {
			expect(Model.scan().where).to.eql(Model.scan().filter);
		});
	});

	describe("scan.filter", () => {
		it("Should be a function", () => {
			expect(Model.scan().filter).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().filter()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct property", () => {
			expect(Model.scan().settings.pending).to.eql({});
			expect(Model.scan().filter("id").settings.pending).to.eql({"key": "id"});
			expect(Model.scan().filter("id").filter("name").settings.pending).to.eql({"key": "name"});
		});
	});

	describe("scan.null", () => {
		it("Should be a function", () => {
			expect(Model.scan().null).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().null()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").null();
			expect(scan.settings.filters).to.eql({"id": {"type": "NULL", "value": []}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().null();
			expect(scan.settings.filters).to.eql({"id": {"type": "NOT_NULL", "value": []}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.eq", () => {
		it("Should be a function", () => {
			expect(Model.scan().eq).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().eq()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").eq("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "EQ", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().eq("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "NE", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should have same options as scan.null for empty string, null, or undefined as value", () => {
			expect(Model.scan().filter("id").eq().settings.filters).to.eql(Model.scan().filter("id").null().settings.filters);
			expect(Model.scan().filter("id").eq("").settings.filters).to.eql(Model.scan().filter("id").null().settings.filters);
			expect(Model.scan().filter("id").eq(null).settings.filters).to.eql(Model.scan().filter("id").null().settings.filters);
			expect(Model.scan().filter("id").eq(undefined).settings.filters).to.eql(Model.scan().filter("id").null().settings.filters);
		});
	});

	describe("scan.lt", () => {
		it("Should be a function", () => {
			expect(Model.scan().lt).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().lt()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").lt("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "LT", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().lt("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "GE", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.le", () => {
		it("Should be a function", () => {
			expect(Model.scan().le).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().le()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").le("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "LE", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().le("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "GT", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.gt", () => {
		it("Should be a function", () => {
			expect(Model.scan().gt).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().gt()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").gt("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "GT", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().gt("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "LE", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.ge", () => {
		it("Should be a function", () => {
			expect(Model.scan().ge).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().ge()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").ge("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "GE", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().ge("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "LT", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.beginsWith", () => {
		it("Should be a function", () => {
			expect(Model.scan().beginsWith).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().beginsWith()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").beginsWith("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "BEGINS_WITH", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().beginsWith("test");
			expect(scan).to.throw("BEGINS_WITH can not follow not()");
		});
	});

	describe("scan.contains", () => {
		it("Should be a function", () => {
			expect(Model.scan().contains).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().contains()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").contains("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "CONTAINS", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should set correct settings on the scan object with not()", () => {
			const scan = Model.scan().filter("id").not().contains("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "NOT_CONTAINS", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});
	});

	describe("scan.in", () => {
		it("Should be a function", () => {
			expect(Model.scan().in).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().in()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").in("test");
			expect(scan.settings.filters).to.eql({"id": {"type": "IN", "value": "test"}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().in("test");
			expect(scan).to.throw("IN can not follow not()");
		});
	});

	describe("scan.between", () => {
		it("Should be a function", () => {
			expect(Model.scan().between).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().between()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct settings on the scan object", () => {
			const scan = Model.scan().filter("id").between(1, 2);
			expect(scan.settings.filters).to.eql({"id": {"type": "BETWEEN", "value": [1, 2]}});
			expect(scan.settings.pending).to.eql({});
		});

		it("Should throw error with not()", () => {
			const scan = () => Model.scan().filter("id").not().between(1, 2);
			expect(scan).to.throw("BETWEEN can not follow not()");
		});
	});

	describe("scan.limit", () => {
		it("Should be a function", () => {
			expect(Model.scan().limit).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().limit(5);
			expect(scan.settings.limit).to.eql(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().limit(5).exec();
			expect(scanParams.Limit).to.eql(5);
		});
	});

	describe("scan.startAt", () => {
		it("Should be a function", () => {
			expect(Model.scan().startAt).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().startAt({"id": 5});
			expect(scan.settings.startAt).to.eql({"id": 5});
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": 5}).exec();
			expect(scanParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});

		it("Should set correct setting on scan instance if passing in DynamoDB object", async () => {
			const scan = Model.scan().startAt({"id": {"N": "5"}});
			expect(scan.settings.startAt).to.eql({"id": {"N": "5"}});
		});

		it("Should send correct request on scan.exec if passing in DynamoDB object", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().startAt({"id": {"N": "5"}}).exec();
			expect(scanParams.ExclusiveStartKey).to.eql({"id": {"N": "5"}});
		});
	});

	describe("scan.attributes", () => {
		it("Should be a function", () => {
			expect(Model.scan().attributes).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().attributes(["id"]);
			expect(scan.settings.attributes).to.eql(["id"]);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().attributes(["id"]).exec();
			expect(scanParams.AttributesToGet).to.eql(["id"]);
		});
	});

	describe("scan.parallel", () => {
		it("Should be a function", () => {
			expect(Model.scan().parallel).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().parallel(5);
			expect(scan.settings.parallel).to.eql(5);
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().parallel(5).exec();
			expect(scanParams.TotalSegments).to.eql(5);
		});

		it("Should return correct result on scan.exec", async () => {
			let count = 0;
			scanPromiseResolver = () => ({"Items": [{"id": `${count * 50}`, "name": "Test"}, {"id": `${count * 100}`, "name": "Test 2"}], "Count": 2, "ScannedCount": 3, "LastEvaluatedKey": {"id": {"N": `${count++}`}}});
			const result = await Model.scan().parallel(5).exec();
			expect(count).to.eql(5);
			expect(result.lastKey).to.eql([{"id": 0}, {"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]);
			expect(result.scannedCount).to.eql(15);
			expect(result.count).to.eql(10);
			expect(result.timesScanned).to.eql(5);
			expect(scanParams.Segment).to.eql(4);
		});
	});

	describe("scan.count", () => {
		it("Should be a function", () => {
			expect(Model.scan().count).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().count();
			expect(scan.settings.count).to.be.true;
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().count().exec();
			expect(scanParams.Select).to.eql("COUNT");
		});

		it("Should return correct result on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": [{"id": {"N": "1"}, "name": {"S": "Charlie"}}], "Count": 1, "ScannedCount": 1, "LastEvaluatedKey": {"id": {"N": "5"}}});
			const result = await Model.scan().count().exec();
			expect(result).to.eql({"count": 1, "scannedCount": 1});
		});
	});

	describe("scan.consistent", () => {
		it("Should be a function", () => {
			expect(Model.scan().consistent).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().consistent();
			expect(scan.settings.consistent).to.be.true;
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().consistent().exec();
			expect(scanParams.ConsistentRead).to.be.true;
		});
	});

	describe("scan.using", () => {
		it("Should be a function", () => {
			expect(Model.scan().using).to.be.a("function");
		});

		it("Should set correct setting on scan instance", async () => {
			const scan = Model.scan().using("customIndex");
			expect(scan.settings.index).to.eql("customIndex");
		});

		it("Should send correct request on scan.exec", async () => {
			scanPromiseResolver = () => ({"Items": []});
			await Model.scan().using("customIndex").exec();
			expect(scanParams.IndexName).to.eql("customIndex");
		});
	});

	describe("scan.all", () => {
		it("Should be a function", () => {
			expect(Model.scan().all).to.be.a("function");
		});

		it("Should return an instance of scan", () => {
			expect(Model.scan().all()).to.be.a.instanceof(Model.scan.carrier);
		});

		it("Should set correct default options", () => {
			expect(Model.scan().all().settings.all).to.eql({"delay": 0, "max": 0});
		});

		it("Should set correct option for delay", () => {
			expect(Model.scan().all(5).settings.all).to.eql({"delay": 5, "max": 0});
		});

		it("Should set correct option for max", () => {
			expect(Model.scan().all(0, 5).settings.all).to.eql({"delay": 0, "max": 5});
		});

		it("Should handle delay correctly on scan.exec", async () => {
			scanPromiseResolver = async () => ({"Items": [], "LastEvaluatedKey": {"id": {"S": "test"}}});

			const start = Date.now();
			await Model.scan().all(50, 2).exec();
			const end = Date.now();
			expect(end - start).to.be.above(99);
		});

		it("Should send correct result on scan.exec", async () => {
			let count = 0;
			scanPromiseResolver = async () => {
				const obj = ({"Items": [{"id": ++count}], "Count": 1, "ScannedCount": 2});
				if (count < 2) {
					obj["LastEvaluatedKey"] = {"id": {"N": `${count}`}};
				}
				return obj;
			};

			const result = await Model.scan().all().exec();
			expect(result.map((item) => ({...item}))).to.eql([{"id": 1}, {"id": 2}]);
			expect(result.count).to.eql(2);
			expect(result.scannedCount).to.eql(4);
			expect(result.lastKey).to.not.exist;
		});
	});
});
