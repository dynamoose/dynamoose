const {expect} = require("chai");
const Schema = require("../lib/Schema");

describe("Schema", () => {
	it("Should be a function", () => {
		expect(Schema).to.be.a("function");
	});

	// TODO: enable this test below
	it.skip("Should throw an error if nothing passed in", () => {
		expect(() => new Schema()).to.throw();
	});
});
