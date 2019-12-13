const {expect} = require("chai");
const Document = require("../lib/Document");

describe("Document", () => {
	it("Should be a function", () => {
		expect(Document).to.be.an("function");
	});
});
