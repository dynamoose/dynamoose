const utils = require("../../dist/utils").default;

describe("utils.capitalize_first_letter", () => {
	it("Should be a function", () => {
		expect(utils.capitalize_first_letter).toBeInstanceOf(Function);
	});

	const tests = [
		{
			"input": "hello",
			"output": "Hello"
		},
		{
			"input": "HELLO",
			"output": "HELLO"
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.capitalize_first_letter(test.input)).toEqual(test.output);
		});
	});
});
