const {expect} = require("chai");
const utils = require("../../dist/utils");

describe("utils.all_elements_match", () => {
	it("Should be a function", () => {
		expect(utils.all_elements_match).to.be.a("function");
	});

	const tests = [
		{
			"input": [],
			"output": true
		},
		{
			"input": ["hello"],
			"output": true
		},
		{
			"input": ["hello", "hello"],
			"output": true
		},
		{
			"input": ["hello", "world"],
			"output": false
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.all_elements_match(test.input)).to.eql(test.output);
		});
	});
});
