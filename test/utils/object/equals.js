const {expect} = require("chai");
const utils = require("../../../dist/utils");

describe("utils.object.equals", () => {
	it("Should be a function", () => {
		expect(utils.object.equals).to.be.a("function");
	});

	const tests = [
		{
			"input": [{"hello": "world"}, {"hello": "world"}],
			"output": true
		},
		{
			"input": [{"hello": "world"}, {"hello": "universe"}],
			"output": false
		},
		{
			"input": [{"hello": "universe"}, {"hello": "world"}],
			"output": false
		},
		{
			"input": [{"hello": {"item": "world"}}, {"hello": "world"}],
			"output": false
		},
		{
			"input": [{"hello": {"item": "world"}}, {"hello": {"item": "universe"}}],
			"output": false
		},
		{
			"input": [{"hello": {"item": "world"}}, {"hello": {"item": "world"}}],
			"output": true
		},
		{
			"input": [[1, 2, 3], [1, 2, 3]],
			"output": true
		},
		{
			"input": [[2, 1, 3], [1, 2, 3]],
			"output": false
		},
		{
			"input": [[2, 1], [2, 1, 3]],
			"output": false
		},
		{
			"input": [[2, 1, 3], [2, 1]],
			"output": false
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${JSON.stringify(test.input)}`, () => {
			expect(utils.object.equals(...test.input)).to.eql(test.output);
		});
	});
});
