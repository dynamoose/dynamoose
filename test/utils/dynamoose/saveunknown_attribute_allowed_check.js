const {expect} = require("chai");
const utils = require("../../../lib/utils");

describe.only("utils.dynamoose.saveunknown_attribute_allowed_check", () => {
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
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.dynamoose.saveunknown_attribute_allowed_check(...test.input)).to.eql(test.output);
		});
	});
});
