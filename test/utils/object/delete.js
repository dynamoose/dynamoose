const {expect} = require("chai");
const utils = require("../../../dist/utils");

describe("utils.object.delete", () => {
	it("Should be a function", () => {
		expect(utils.object.delete).to.be.a("function");
	});

	const tests = [
		{
			"input": [{}, "hello"],
			"output": {}
		},
		{
			"input": [{}, "hello.test"],
			"output": {}
		},
		{
			"input": [{"hello": "world"}, "hello"],
			"output": {}
		},
		{
			"input": [{"hello": "world", "test": "data"}, "test"],
			"output": {"hello": "world"}
		},
		{
			"input": [["world", "universe"], "0"],
			"output": ["universe"]
		},
		{
			"input": [["world", "universe"], 0],
			"output": ["universe"]
		},
		{
			"input": [{"hello": ["world", "universe"]}, "hello.0"],
			"output": {"hello": ["universe"]}
		},
		{
			"input": [{"name": "Bob", "address": {"country": "world", "zip": 12345}}, "address.country"],
			"output": {"name": "Bob", "address": {"zip": 12345}}
		},
		{
			"input": [{"name": "Bob", "friends": ["Bob", "Tim"]}, "friends.0"],
			"output": {"name": "Bob", "friends": ["Tim"]}
		},
		{
			"input": [{"id": 1, "friends": [{"name": "Bob", "id": 1}, {"name": "Tim"}]}, "friends.1.name"],
			"output": {"id": 1, "friends": [{"name": "Bob", "id": 1}, {}]}
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.object.delete(...test.input)).to.eql(test.output);
		});
	});
});
