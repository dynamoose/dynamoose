const utils = require("../../dist/utils").default;

describe("unique_array_elements", () => {
	it("Should be a function", () => {
		expect(utils.unique_array_elements).toBeInstanceOf(Function);
	});

	const tests = [
		{"input": [], "output": []},
		{"input": [1, 1], "output": [1]},
		{"input": [1, 2, 3, 1], "output": [1, 2, 3]},
		{"input": ["test", "TEST", "tesT", "test"], "output": ["test", "TEST", "tesT"]},
		{"input": [[1, 2], [1, 2]], "output": [[1, 2]]},
		{"input": [[1, 2], [3, 4]], "output": [[1, 2], [3, 4]]},
		{"input": [{"hello": "world"}, {"hello": "world"}], "output": [{"hello": "world"}]},
		{"input": [{"hello": "world"}, {"hello": "universe"}], "output": [{"hello": "world"}, {"hello": "universe"}]}
	];
	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.input}`, () => {
			expect(utils.unique_array_elements(test.input)).toEqual(test.output);
		});
	});
});
