const utils = require("../../dist/utils").default;

describe("utils.array_flatten", () => {
	it("Should be a function", () => {
		expect(utils.array_flatten).toBeInstanceOf(Function);
	});

	const tests = [
		{
			"input": ["hello"],
			"output": ["hello"]
		},
		{
			"input": [["hello"]],
			"output": ["hello"]
		},
		{
			"input": [1, 2, 3, 4],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [1, [2, 3, 4]],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, 2], 3, 4],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, 2], [3, 4]],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, [2, 3]], 4],
			"output": [1, [2, 3], 4]
		}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.array_flatten(test.input)).toEqual(test.output);
		});
	});
});
