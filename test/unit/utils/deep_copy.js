const {expect} = require("chai");
const utils = require("../../../dist/utils");

describe("utils.deep_copy", () => {
	it("Should be a function", () => {
		expect(utils.deep_copy).to.be.a("function");
	});

	it("Should return a copy of the object", () => {
		const original = {"a": 1, "b": "test", "c": {"d": 100, "e": 200}};
		const copy = utils.deep_copy(original);
		expect(copy).to.deep.equal({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});

		delete original.a;
		delete original.c.d;

		expect(original).to.deep.equal({"b": "test", "c": {"e": 200}});
		expect(copy).to.deep.equal({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});
	});
});
