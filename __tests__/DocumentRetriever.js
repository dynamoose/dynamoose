const {expect} = require("chai");
const ItemRetriever = require("../dist/ItemRetriever");

describe("ItemRetriever", () => {
	it("Should return an object", () => {
		expect(ItemRetriever).to.be.an("object");
	});

	it("Should return an object with Scan property", () => {
		expect(ItemRetriever.Scan).to.exist;
	});

	it("Should return an object with Query property", () => {
		expect(ItemRetriever.Query).to.exist;
	});
});
