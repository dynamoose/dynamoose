const {expect} = require("chai");
const utils = require("../../../lib/utils");

describe("utils.object.pick", () => {
	it("Should be a function", () => {
		expect(utils.object.pick).to.be.a("function");
	});

	const tests = [
		{
			"input": [{"hello": "world"}, ["hello"]],
			"output": {"hello": "world"}
		},
		{
			"input": [{"hello": "world"}, ["hello", "world"]],
			"output": {"hello": "world"}
		},
		{
			"input": [{"hello": "world", "obj": 1}, ["hello"]],
			"output": {"hello": "world"}
		},
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.object.pick(...test.input)).to.eql(test.output);
		});
	});
});
