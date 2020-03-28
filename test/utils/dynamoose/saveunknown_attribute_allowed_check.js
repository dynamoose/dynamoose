const {expect} = require("chai");
const utils = require("../../../lib/utils");

describe("utils.dynamoose.saveunknown_attribute_allowed_check", () => {
	it("Should be a function", () => {
		expect(utils.dynamoose.saveunknown_attribute_allowed_check).to.be.a("function");
	});

	const tests = [
		{
			"input": [true, "random"],
			"output": true
		},
		{
			"input": [false, "random"],
			"output": false
		},
		{
			"input": [["random"], "random"],
			"output": true
		},
		{
			"input": [["other"], "random"],
			"output": false
		},
		{
			"input": [["random"], "random.test"],
			"output": false
		},
		{
			"input": [["random.1"], "random.1"],
			"output": true
		},
		{
			"input": [["random.1"], "random.2"],
			"output": false
		},
		{
			"input": [["random.test"], "random"],
			"output": true
		},
		{
			"input": [["random.*"], "random"],
			"output": true
		},
		{
			"input": [["random.*"], "random.test"],
			"output": true
		},
		{
			"input": [["random.*"], "random.test.random"],
			"output": false
		},
		{
			"input": [["random.*"], "random.0.random"],
			"output": false
		},
		{
			"input": [["random.*"], "random.1.random"],
			"output": false
		},
		{
			"input": [["random.*.hello"], "random.test.hello"],
			"output": true
		},
		{
			"input": [["random.*.hello"], "random.test.random"],
			"output": false
		},
		{
			"input": [["random.*.hello"], "random.test.hello.test"],
			"output": false
		},
		{
			"input": [["random.**"], "random.test.random"],
			"output": true
		},
		{
			"input": [["**"], "random.test.random"],
			"output": true
		},
		// TODO: add support for this later
		// {
		// 	"input": [["random.**.hello"], "random.test.random"],
		// 	"output": false
		// },
		// {
		// 	"input": [["random.**.hello"], "random.test.random.hello"],
		// 	"output": true
		// }
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.dynamoose.saveunknown_attribute_allowed_check(...test.input)).to.eql(test.output);
		});
	});
});
