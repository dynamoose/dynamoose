const {expect} = require("chai");
const rewire = require("rewire");
const DocumentRetriever = rewire("../../dist/DocumentRetriever");

describe("DocumentRetriever", () => {
	it("Should return an object", () => {
		expect(DocumentRetriever).to.be.an("object");
	});

	it("Should return an object with Scan property", () => {
		expect(DocumentRetriever.Scan).to.exist;
	});

	it("Should return an object with Query property", () => {
		expect(DocumentRetriever.Query).to.exist;
	});

	describe("canUseIndexOfTable", () => {
		const canUseIndexOfTable = DocumentRetriever.__get__("canUseIndexOfTable");

		it("Should be correct for only hash key", () => {
			expect(canUseIndexOfTable("hashKey", null, {"hashKey": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", null, {"hashKey": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", null, {"hashKey": {"type": "GE"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", null, {"key1": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", null, {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
		});

		it("Should be correct for hash key and range key", () => {
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}, "key3": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "GE"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"rangeKey": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.false;
		});
	});

	describe("findBestIndex", () => {
		const findBestIndex = DocumentRetriever.__get__("findBestIndex");

		it("Should find the best index with one GSI", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "MyGSI1",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}]
					}
				]
			};

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"}
			})).to.eq("MyGSI1");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "GE"}
			})).to.be.null;

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"}
			})).to.be.null;
		});

		it("Should find the best index with multiple GSI", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "MyGSI1",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}]
					},
					{
						"IndexName": "MyGSI2",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}, {"AttributeName": "attr2", "KeyType": "RANGE"}]
					},
					{
						"IndexName": "MyGSI3",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}, {"AttributeName": "attr3", "KeyType": "RANGE"}]
					},
					{
						"IndexName": "MyGSI4",
						"KeySchema": [{"AttributeName": "attr2", "KeyType": "HASH"}]
					},
					{
						"IndexName": "MyGSI5",
						"KeySchema": [{"AttributeName": "attr3", "KeyType": "HASH"}]
					}
				]
			};

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"}
			})).to.eq("MyGSI1");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr2": {"type": "GE"}
			})).to.eq("MyGSI2");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr3": {"type": "GE"}
			})).to.eq("MyGSI3");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr2": {"type": "GE"},
				"attr3": {"type": "GE"}
			})).to.eq("MyGSI2");

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"}
			})).to.eq("MyGSI4");

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"},
				"attr3": {"type": "GE"}
			})).to.eq("MyGSI4");

			expect(findBestIndex(indexes, {
				"attr2": {"type": "GE"},
				"attr3": {"type": "EQ"}
			})).to.eq("MyGSI5");

			expect(findBestIndex(indexes, {
				"attr3": {"type": "EQ"}
			})).to.eq("MyGSI5");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "GE"}
			})).to.be.null;

			expect(findBestIndex(indexes, {
				"attr1": {"type": "GE"},
				"attr2": {"type": "GE"}
			})).to.be.null;

			expect(findBestIndex(indexes, {
				"attr2": {"type": "GE"}
			})).to.be.null;

			expect(findBestIndex(indexes, {
				"attr3": {"type": "GE"}
			})).to.be.null;
		});

		it("Should find the best index with one GSI and one LSI", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "MyGSI1",
						"KeySchema": [{"AttributeName": "attr2", "KeyType": "HASH"}]
					}
				],
				"LocalSecondaryIndexes": [
					{
						"IndexName": "MyLSI1",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}, {"AttributeName": "attr2", "KeyType": "RANGE"}]
					}
				]
			};

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"}
			})).to.eq("MyGSI1");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr2": {"type": "GE"}
			})).to.eq("MyLSI1");
		});

		it("Should find the best index with multiple GSI and LSI", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [
					{
						"IndexName": "MyGSI1",
						"KeySchema": [{"AttributeName": "attr2", "KeyType": "HASH"}]
					},
					{
						"IndexName": "MyGSI2",
						"KeySchema": [{"AttributeName": "attr2", "KeyType": "HASH"}, {"AttributeName": "attr3", "KeyType": "RANGE"}]
					}
				],
				"LocalSecondaryIndexes": [
					{
						"IndexName": "MyLSI1",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}, {"AttributeName": "attr2", "KeyType": "RANGE"}]
					},
					{
						"IndexName": "MyLSI2",
						"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}, {"AttributeName": "attr3", "KeyType": "RANGE"}]
					}
				]
			};

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"}
			})).to.eq("MyGSI1");

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"},
				"attr4": {"type": "EQ"}
			})).to.eq("MyGSI1");

			expect(findBestIndex(indexes, {
				"attr2": {"type": "EQ"},
				"attr3": {"type": "GE"}
			})).to.eq("MyGSI2");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr2": {"type": "GE"}
			})).to.eq("MyLSI1");

			expect(findBestIndex(indexes, {
				"attr1": {"type": "EQ"},
				"attr3": {"type": "GE"}
			})).to.eq("MyLSI2");

			expect(findBestIndex(indexes, {
				"attr3": {"type": "EQ"}
			})).to.be.null;
		});
	});
});
