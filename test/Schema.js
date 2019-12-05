const {expect} = require("chai");
const Schema = require("../lib/Schema");

describe("Schema", () => {
	it("Should be a function", () => {
		expect(Schema).to.be.a("function");
	});

	it("Should throw an error if nothing passed in", () => {
		expect(() => new Schema()).to.throw();
	});

	it("Should throw an error if empty object passed in", () => {
		expect(() => new Schema({})).to.throw();
	});
});
