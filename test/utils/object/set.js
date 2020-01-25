const {expect} = require("chai");
const utils = require("../../../lib/utils");

describe("utils.object.set", () => {
	it("Should be a function", () => {
		expect(utils.object.set).to.be.a("function");
	});

	const tests = [
		{
			"input": [{"hello": "world"}, "hello", "random"],
			"output": {"hello": "random"}
		},
		{
			"input": [{"test": {"hello": "world"}}, "test.hello", "random"],
			"output": {"test": {"hello": "random"}}
		},
		{
			"input": [{"test": {"hello": {"other": "here"}}}, "test.hello.test", "random"],
			"output": {"test": {"hello":{"other": "here", "test": "random"}}}
		},
		{
			"input": [{}, "test.hello", "random"],
			"output": {"test": {"hello": "random"}}
		},
		{
			"input": [{}, "test.hello.test", "random"],
			"output": {"test": {"hello": {"test": "random"}}}
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.object.set(...test.input)).to.eql(test.output);
		});
	});
});
