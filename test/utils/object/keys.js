const {expect} = require("chai");
const utils = require("../../../dist/utils");

describe("utils.object.keys", () => {
	it("Should be a function", () => {
		expect(utils.object.keys).to.be.a("function");
	});

	const tests = [
		{
			"input": {"hello": "world"},
			"output": ["hello"]
		},
		{
			"input": {"hello": "world", "test": "data"},
			"output": ["hello", "test"]
		},
		{
			"input": {"name": "Bob", "address": {"country": "world", "zip": 12345}},
			"output": ["name", "address", "address.country", "address.zip"]
		},
		{
			"input": {"name": "Bob", "friends": ["Bob", "Tim"]},
			"output": ["name", "friends", "friends.0", "friends.1"]
		},
		{
			"input": {"id": 1, "friends": [{"name": "Bob", "id": 1}, {"name": "Tim"}]},
			"output": ["id", "friends", "friends.0", "friends.0.name", "friends.0.id", "friends.1", "friends.1.name"]
		},
		{
			"input": {"hello": Buffer.from("world")},
			"output": ["hello"]
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.object.keys(test.input)).to.eql(test.output);
		});
	});
});
