const utils = require("../../dist/utils").default;

describe("utils.all_elements_match", () => {
	it("Should be a function", () => {
		expect(utils.all_elements_match).toBeInstanceOf(Function);
	});

	const tests = [
		{
			"input": [],
			"output": true
		},
		{
			"input": ["hello"],
			"output": true
		},
		{
			"input": ["hello", "hello"],
			"output": true
		},
		{
			"input": ["hello", "world"],
			"output": false
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.all_elements_match(test.input)).toEqual(test.output);
		});
	});
});
