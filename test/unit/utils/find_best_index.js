const {expect} = require("chai");
const {find_best_index} = require("../../../dist/utils");

describe("utils.find_best_index", () => {
	it("Should find the best index with one GSI", () => {
		const indexes = {
			"GlobalSecondaryIndexes": [
				{
					"IndexName": "MyGSI1",
					"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}]
				}
			]
		};

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"}
		})).to.eq("MyGSI1");

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"}
		})).to.be.null;

		expect(find_best_index(indexes, {
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

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"}
		})).to.eq("MyGSI1");

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"}
		})).to.eq("MyGSI2");

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).to.eq("MyGSI3");

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"},
			"attr3": {"type": "GE"}
		})).to.eq("MyGSI2");

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"}
		})).to.eq("MyGSI4");

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).to.eq("MyGSI4");

		expect(find_best_index(indexes, {
			"attr2": {"type": "GE"},
			"attr3": {"type": "EQ"}
		})).to.eq("MyGSI5");

		expect(find_best_index(indexes, {
			"attr3": {"type": "EQ"}
		})).to.eq("MyGSI5");

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"}
		})).to.be.null;

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"},
			"attr2": {"type": "GE"}
		})).to.be.null;

		expect(find_best_index(indexes, {
			"attr2": {"type": "GE"}
		})).to.be.null;

		expect(find_best_index(indexes, {
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

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"}
		})).to.eq("MyGSI1");

		expect(find_best_index(indexes, {
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

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"}
		})).to.eq("MyGSI1");

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr4": {"type": "EQ"}
		})).to.eq("MyGSI1");

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).to.eq("MyGSI2");

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"}
		})).to.eq("MyLSI1");

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).to.eq("MyLSI2");

		expect(find_best_index(indexes, {
			"attr3": {"type": "EQ"}
		})).to.be.null;
	});
});
