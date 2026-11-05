const utils = require("../../dist/utils").default;
const {find_best_index} = utils;

describe("utils.find_best_index", () => {
	it("Should find the best index with one GSI", () => {
		const indexes = {
			"TableIndex": {
				"KeySchema": [{"AttributeName": "tableHashKey", "KeyType": "HASH"}]
			},
			"GlobalSecondaryIndexes": [
				{
					"IndexName": "MyGSI1",
					"KeySchema": [{"AttributeName": "attr1", "KeyType": "HASH"}]
				}
			]
		};

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI1"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"tableHashKey": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": true, "indexName": null});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"tableHashKey": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": true, "indexName": null});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"tableHashKey": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});
	});

	it("Should find the best index with multiple GSI", () => {
		const indexes = {
			"TableIndex": {
				"KeySchema": [{"AttributeName": "tableHashKey", "KeyType": "HASH"}, {"AttributeName": "tableRangeKey", "KeyType": "RANGE"}]
			},
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
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI1"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI2"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI3"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"},
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI2"});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI4"});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI4"});

		expect(find_best_index(indexes, {
			"attr2": {"type": "GE"},
			"attr3": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI5"});

		expect(find_best_index(indexes, {
			"attr3": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI5"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"},
			"tableHashKey": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": true, "indexName": null});

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"},
			"tableHashKey": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr1": {"type": "GE"},
			"attr2": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr2": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});

		expect(find_best_index(indexes, {
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});
	});

	it("Should find the best index with one GSI and one LSI", () => {
		const indexes = {
			"TableIndex": {
				"KeySchema": [{"AttributeName": "tableHashKey", "KeyType": "HASH"}]
			},
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
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI1"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyLSI1"});
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
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI1"});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr4": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI1"});

		expect(find_best_index(indexes, {
			"attr2": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyGSI2"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr2": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyLSI1"});

		expect(find_best_index(indexes, {
			"attr1": {"type": "EQ"},
			"attr3": {"type": "GE"}
		})).toStrictEqual({"tableIndex": false, "indexName": "MyLSI2"});

		expect(find_best_index(indexes, {
			"attr3": {"type": "EQ"}
		})).toStrictEqual({"tableIndex": false, "indexName": null});
	});

	describe("find_best_index (multi-attribute)", () => {
		it("selects an index only when ALL multi-attribute partition keys are EQ", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [{
					"IndexName": "TRI",
					"KeySchema": [
						{"AttributeName": "tournamentId", "KeyType": "HASH"},
						{"AttributeName": "region", "KeyType": "HASH"},
						{"AttributeName": "round", "KeyType": "RANGE"}
					]
				}]
			};
			// Only tournamentId is conditioned -> must NOT pick TRI (region missing)
			const partial = {"tournamentId": {"type": "EQ"}};
			expect(find_best_index(indexes, partial).indexName).toBeNull();

			const full = {"tournamentId": {"type": "EQ"}, "region": {"type": "EQ"}};
			expect(find_best_index(indexes, full).indexName).toBe("TRI");
		});

		it("prefers the index with the longest left-to-right sort-key prefix conditioned", () => {
			const indexes = {
				"GlobalSecondaryIndexes": [
					{"IndexName": "A", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}]},
					{"IndexName": "B", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}, {"AttributeName": "sk2", "KeyType": "RANGE"}]}
				]
			};
			const chart = {"pk": {"type": "EQ"}, "sk1": {"type": "EQ"}, "sk2": {"type": "EQ"}};
			expect(find_best_index(indexes, chart).indexName).toBe("B");
		});

		it("treats an inequality on a sort attr as a valid last condition but stops the prefix there", () => {
			const indexes = {"GlobalSecondaryIndexes": [
				{"IndexName": "C", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}, {"AttributeName": "sk2", "KeyType": "RANGE"}]}
			]};
			// sk1 EQ, sk2 GT -> prefix length 2 (sk1 eq, sk2 inequality-last)
			const chart = {"pk": {"type": "EQ"}, "sk1": {"type": "EQ"}, "sk2": {"type": "GT"}};
			expect(find_best_index(indexes, chart).indexName).toBe("C");
		});

		it("does not over-count a second consecutive sort-key inequality", () => {
			// A's prefix is 1 (sk1 inequality). B's prefix is also 1 once the over-count is
			// fixed (sk1 inequality ends the prefix; sk2 must not extend it). Before the fix,
			// B over-counted to 2 and was wrongly selected; after the fix it ties A and the
			// first-inserted usable index (A) is chosen.
			const indexes = {"GlobalSecondaryIndexes": [
				{"IndexName": "A", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}]},
				{"IndexName": "B", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}, {"AttributeName": "sk2", "KeyType": "RANGE"}]}
			]};
			const chart = {"pk": {"type": "EQ"}, "sk1": {"type": "GT"}, "sk2": {"type": "GT"}};
			expect(find_best_index(indexes, chart).indexName).toBe("A");
		});

		it("does not extend the prefix when an equality follows a sort-key inequality", () => {
			// sk1 inequality (GT) sets sawInequality; a following sk2 EQ must break the
			// prefix loop (an inequality must be the last conditioned sort attr) instead of
			// wrongly counting sk2 and over-selecting index B.
			const indexes = {"GlobalSecondaryIndexes": [
				{"IndexName": "A", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}]},
				{"IndexName": "B", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk1", "KeyType": "RANGE"}, {"AttributeName": "sk2", "KeyType": "RANGE"}]}
			]};
			const chart = {"pk": {"type": "EQ"}, "sk1": {"type": "GT"}, "sk2": {"type": "EQ"}};
			expect(find_best_index(indexes, chart).indexName).toBe("A");
		});
	});
});
