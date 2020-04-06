const {expect} = require("chai");
const utils = require("../../lib/utils");

describe("utils.empty_function", () => {
	it("Should be a function", () => {
		expect(utils.empty_function).to.be.a("function");
	});

	it("Should equal an empty function", () => {
		expect(utils.empty_function.toString().replace(/\s/gu, "")).to.eql("()=>{}");
	});
});
