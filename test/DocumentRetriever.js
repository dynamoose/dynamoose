const {expect} = require("chai");
const DocumentRetriever = require("../dist/DocumentRetriever");

describe("DocumentRetriever", () => {
	it("Should be a function", () => {
		expect(DocumentRetriever).to.be.a("function");
	});

	it("Should throw if invalid type passed in", () => {
		expect(() => DocumentRetriever("random")).to.throw("The type: random for setting up a document retriever is invalid.");
	});
});
