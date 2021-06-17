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
			expect(canUseIndexOfTable("hashKey", null, {"key1": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", null, {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
		});

		it("Should be correct for hash key and range key", () => {
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "rangeKey": {"type": "EQ"}, "key3": {"type": "EQ"}})).to.be.true;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"hashKey": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "key2": {"type": "EQ"}})).to.be.false;
			expect(canUseIndexOfTable("hashKey", "rangeKey", {"key1": {"type": "EQ"}, "rangeKey": {"type": "EQ"}})).to.be.false;
		});
	});
});
