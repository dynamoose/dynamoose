const {expect} = require("chai");
const utils = require("../../lib/utils");

describe("utils.merge_objects", () => {
	it("Should be a function", () => {
		expect(utils.merge_objects).to.be.a("function");
	});

	const tests = [
		{
			"input": [{"a": [{"a": "b"}, {"a": "c"}], "b": 2, "c": {"a": "c"}}, {"a": [{"a": "d"}, {"a": "e"}, {"a": "f"}], "b": 3, "c": {"a": "f"}}],
			"output": {"a": [{"a": "b"}, {"a": "c"}, {"a": "d"}, {"a": "e"}, {"a": "f"}], "b": 5, "c": [{"a": "c"}, {"a": "f"}]}
		},
		{
			"input": [{"a": [{"a": "b"}, {"a": "c"}], "b": 2, "c": {"a": "c"}}, {"a": [{"a": "d"}, {"a": "e"}, {"a": "f"}], "b": 3}],
			"output": {"a": [{"a": "b"}, {"a": "c"}, {"a": "d"}, {"a": "e"}, {"a": "f"}], "b": 5, "c": {"a": "c"}}
		},
		{
			"input": [{"a": [{"a": "b"}, {"a": "c"}], "b": 2, "c": {"a": "c"}}, {"a": [{"a": "d"}, {"a": "e"}, {"a": "f"}], "b": 3, "c": {"a": "f"}}, {"a": [{"a": "g"}, {"a": "h"}, {"a": "i"}, {"a": "z"}], "b": 4}],
			"output": {"a": [{"a": "b"}, {"a": "c"}, {"a": "d"}, {"a": "e"}, {"a": "f"}, {"a": "g"}, {"a": "h"}, {"a": "i"}, {"a": "z"}], "b": 9, "c": [{"a": "c"}, {"a": "f"}]}
		},
		{
			"input": [{"a": [{"b": "c"}, {"d": "e"}]}, {"a": [{"f": "g"}, {"h": "i"}]}, {"a": {"j": "k"}}],
			"output": {"a": [{"b": "c"}, {"d": "e"}, {"f": "g"}, {"h": "i"}, {"j": "k"}]}
		},
		{
			"input": [[1, 2], {"a": "b"}],
			"error": "You can't mix value types for the merge_objects method."
		},
		{
			"input": [{"a": "b"}, [1, 2]],
			"error": "You can't mix value types for the merge_objects method."
		},
		{
			"input": [1],
			"error": "You can only pass objects into merge_objects method."
		}
	];

	tests.forEach((test) => {
		if (test.error) {
			it(`Should throw error for ${JSON.stringify(test.input)}`, () => {
				expect(() => utils.merge_objects(...test.input)).to.throw(test.error);
			});
		} else {
			it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
				expect(utils.merge_objects(...test.input)).to.eql(test.output);
			});
		}
	});
});
