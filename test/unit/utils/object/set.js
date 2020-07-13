const {expect} = require("chai");
const utils = require("../../../../dist/utils");

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
		},
		{
			"input": [{"data": [{"id": "hello world"}]}, "data.0.id", "random"],
			"output": {"data": [{"id": "random"}]}
		},
		{
			"input": [{"data": [{"id": "hello world"}]}, "data.1.id", "random"],
			"output": {"data": [{"id": "hello world"}, {"id": "random"}]}
		},
		{
			"input": [{"data": []}, "data.0", {"hello": "world"}],
			"output": {"data": [{"hello": "world"}]}
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.object.set(...test.input)).to.eql(test.output);
		});
	});
});
