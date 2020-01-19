const {expect} = require("chai");
const utils = require("../../lib/utils");

describe("utils.capitalize_first_letter", () => {
	it("Should be a function", () => {
		expect(utils.capitalize_first_letter).to.be.a("function");
	});

	const tests = [
		{
			"input": "hello",
			"output": "Hello"
		},
		{
			"input": "HELLO",
			"output": "HELLO"
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.capitalize_first_letter(test.input)).to.eql(test.output);
		});
	});
});
