const {expect} = require("chai");
const utils = require("../../dist/utils");

describe("utils.array_flatten", () => {
	it("Should be a function", () => {
		expect(utils.array_flatten).to.be.a("function");
	});

	const tests = [
		{
			"input": ["hello"],
			"output": ["hello"]
		},
		{
			"input": [["hello"]],
			"output": ["hello"]
		},
		{
			"input": [1, 2, 3, 4],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [1, [2, 3, 4]],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, 2], 3, 4],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, 2], [3, 4]],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, [2, 3]], 4],
			"output": [1, [2, 3], 4]
		},
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.array_flatten(test.input)).to.eql(test.output);
		});
	});
});
