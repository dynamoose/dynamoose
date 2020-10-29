const {expect} = require("chai");
const utils = require("../../../../dist/utils");

describe("utils.object.clearEmpties", () => {
	it("Should be a function", () => {
		expect(utils.object.clearEmpties).to.be.a("function");
	});

	const tests = [
		{
			"input": {},
			"output": {}
		},
		{
			"input": {"id": 1, "name": "Bob"},
			"output": {"id": 1, "name": "Bob"}
		},
		{
			"input": {"emptyArray": []},
			"output": {}
		},
		{
			"input": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345}},
			"output": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345}}
		},
		{
			"input": {"id": 1, "name": "Bob", "address": {}},
			"output": {"id": 1, "name": "Bob"}
		},
		{
			"input": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345, "other": {}}},
			"output": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345}}
		},
		{
			"input": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345, "emptyArray": []}},
			"output": {"id": 1, "name": "Bob", "address": {"country": "world", "zip": 12345}}
		}
	];

	tests.forEach((test) => {
		it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
			expect(utils.object.clearEmpties(test.input)).to.eql(test.output);
		});
	});
});
