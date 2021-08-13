const {expect} = require("chai");
const {can_use_index_of_table} = require("../../../dist/utils");

describe("utils.can_use_index_of_table", () => {
	it("Should be correct for only hash key", () => {
		expect(can_use_index_of_table("hashKey", null, {"hashKey": {"type": "EQ"}})).to.be.true;
		expect(can_use_index_of_table("hashKey", null, {"hashKey": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", null, {"hashKey": {"type": "GE"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", null, {"key1": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", null, {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
	});

	it("Should be correct for hash key and range key", () => {
		expect(can_use_index_of_table("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}})).to.be.true;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.true;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}, "key3": {"type": "EQ"}})).to.be.true;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"hashKey": {"type": "GE"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"rangeKey": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"key1": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
		expect(can_use_index_of_table("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.false;
	});
});
