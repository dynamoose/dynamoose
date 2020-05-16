const {expect} = require("chai");
const DocumentRetriever = require("../dist/DocumentRetriever");

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
});
