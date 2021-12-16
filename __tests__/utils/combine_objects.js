const utils = require("../../dist/utils").default;

describe("utils.combine_objects", () => {
	it("Should be a function", () => {
		expect(utils.combine_objects).toBeInstanceOf(Function);
	});

	const tests = [
		{
			"input": [{"a": 1}, {"b": 2}],
			"output": {"a": 1, "b": 2}
		},
		{
			"input": [{"a": 1}, {"a": 2}],
			"output": {"a": 1}
		},
		{
			"input": [{"a": false}, {"a": true}],
			"output": {"a": false}
		},
		{
			"input": [{"a": null}, {"a": true}],
			"output": {"a": null}
		},
		{
			"input": [{"a": undefined}, {"a": true}],
			"output": {"a": undefined}
		},
		{
			"input": [{"a": 1}, {"b": 2}, {"c": 3}],
			"output": {"a": 1, "b": 2, "c": 3}
		},
		{
			"input": [{"a": 1, "b": 3}, {"b": 2}, {"c": 3, "a": 0}],
			"output": {"a": 1, "b": 3, "c": 3}
		},
		{
			"input": [{"a": {"b": 2, "c": {"d": 4, "e": 5}}}, {"a": {"b": -2, "c": {"d": -1, "z": 0}, "cc": {"a": 2}}}],
			"output": {"a": {"b": 2, "c": {"d": 4, "e": 5, "z": 0}, "cc": {"a": 2}}}
		},
		{
			"input": [[1, 2], [3, 4]],
			"output": [1, 2, 3, 4]
		},
		{
			"input": [[1, 2], [3, 4], [5, 6]],
			"output": [1, 2, 3, 4, 5, 6]
		},
		{
			"input": [{"a": {"b": true, "c": {"d": 1}}}, {"a": false}, {"a": {"b": true, "c": {"e": 2, "d": 3}}}],
			"output": {"a": {"b": true, "c": {"d": 1, "e": 2}}}
		},
		{
			"input": [[1, 2], {"a": "b"}],
			"error": "You can't mix value types for the combine_objects method."
		},
		{
			"input": [{"a": "b"}, [1, 2]],
			"error": "You can't mix value types for the combine_objects method."
		},
		{
			"input": [1],
			"error": "You can only pass objects into combine_objects method."
		}
	];

	tests.forEach((test) => {
		if (test.error) {
			it(`Should throw error for ${JSON.stringify(test.input)}`, () => {
				expect(() => utils.combine_objects(...test.input)).toThrow(test.error);
			});
		} else {
			it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
				expect(utils.combine_objects(...test.input)).toEqual(test.output);
			});
		}
	});
});
