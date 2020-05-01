const {expect} = require("chai");
const utils = require("../../dist/utils");

describe("utils.empty_function", () => {
	it("Should be a function", () => {
		expect(utils.empty_function).to.be.a("function");
	});

	it("Should equal an empty function", () => {
		expect(utils.empty_function.toString().replace(/\s/gu, "").replace(/cov_.{9,10}\(\)\.f\[0\]\+\+;/gu, "")).to.eql("()=>{}");
	});
});
