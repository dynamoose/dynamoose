const chai = require("chai");
const {expect} = chai;
const utils = require("../../dist/utils");

describe("unique_array_elements", () => {
	it("Should be a function", () => {
		expect(utils.unique_array_elements).to.be.a("function");
	});

	const tests = [
		{"input": [], "output": []},
		{"input": [1, 1], "output": [1]},
		{"input": [1, 2, 3, 1], "output": [1, 2, 3]},
		{"input": ["test", "TEST", "tesT", "test"], "output": ["test", "TEST", "tesT"]}
	];
	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.unique_array_elements(test.input)).to.eql(test.output);
		});
	});
});
