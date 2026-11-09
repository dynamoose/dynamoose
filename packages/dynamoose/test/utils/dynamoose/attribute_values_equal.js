const utils = require("../../../dist/utils").default;

describe("utils.dynamoose.attribute_values_equal", () => {
	it("Should be a function", () => {
		expect(utils.dynamoose.attribute_values_equal).toBeInstanceOf(Function);
	});

	const tests = [
		{"name": "equal strings", "input": [{"S": "a"}, {"S": "a"}], "output": true},
		{"name": "different strings", "input": [{"S": "a"}, {"S": "b"}], "output": false},
		{"name": "different types", "input": [{"S": "1"}, {"N": "1"}], "output": false},
		{"name": "a string and an object", "input": ["a", {}], "output": false},
		{"name": "an object and a string", "input": [{}, "a"], "output": false},
		{"name": "null and an object", "input": [null, {}], "output": false},
		{"name": "an object and null", "input": [{}, null], "output": false},
		{"name": "a map with its keys in another order", "input": [{"M": {"a": {"N": "1"}, "b": {"N": "2"}}}, {"M": {"b": {"N": "2"}, "a": {"N": "1"}}}], "output": true},
		{"name": "maps with different values", "input": [{"M": {"a": {"N": "1"}, "b": {"N": "2"}}}, {"M": {"b": {"N": "3"}, "a": {"N": "1"}}}], "output": false},
		{"name": "maps with a different number of keys", "input": [{"M": {"a": {"N": "1"}}}, {"M": {"a": {"N": "1"}, "b": {"N": "2"}}}], "output": false},
		{"name": "maps with different keys", "input": [{"M": {"a": {"N": "1"}}}, {"M": {"b": {"N": "1"}}}], "output": false},
		{"name": "nested maps with different value types", "input": [{"M": {"k": {"M": {}}}}, {"M": {"k": {"L": []}}}], "output": false},
		{"name": "a map with an attribute named like a set type", "input": [{"M": {"SS": {"S": "x"}}}, {"M": {"SS": {"S": "x"}}}], "output": true},
		{"name": "equal lists", "input": [{"L": [{"N": "1"}, {"N": "2"}]}, {"L": [{"N": "1"}, {"N": "2"}]}], "output": true},
		{"name": "a list in another order", "input": [{"L": [{"N": "1"}, {"N": "2"}]}, {"L": [{"N": "2"}, {"N": "1"}]}], "output": false},
		{"name": "lists of different lengths", "input": [{"L": [{"N": "1"}]}, {"L": [{"N": "1"}, {"N": "2"}]}], "output": false},
		{"name": "a list and an object", "input": [{"L": []}, {"L": {}}], "output": false},
		{"name": "an object and a list", "input": [{"L": {}}, {"L": []}], "output": false},
		{"name": "a string set in another order", "input": [{"SS": ["x", "y"]}, {"SS": ["y", "x"]}], "output": true},
		{"name": "a number set in another order", "input": [{"NS": ["1", "2"]}, {"NS": ["2", "1"]}], "output": true},
		{"name": "a binary set in another order", "input": [{"BS": [Buffer.from("a"), Buffer.from("b")]}, {"BS": [new Uint8Array([98]), new Uint8Array([97])]}], "output": true},
		{"name": "sets with different elements", "input": [{"SS": ["x", "y"]}, {"SS": ["x", "z"]}], "output": false},
		{"name": "sets of different sizes", "input": [{"SS": ["x"]}, {"SS": ["x", "y"]}], "output": false},
		{"name": "sets that differ only in a repeated element", "input": [{"SS": ["x", "x"]}, {"SS": ["x", "y"]}], "output": false},
		{"name": "a set and a non-list", "input": [{"SS": ["x"]}, {"SS": "x"}], "output": false},
		{"name": "a Buffer and a Uint8Array with the same bytes", "input": [{"B": Buffer.from("ab")}, {"B": new Uint8Array([97, 98])}], "output": true},
		{"name": "binary values with different bytes", "input": [{"B": Buffer.from("ab")}, {"B": Buffer.from("ac")}], "output": false},
		{"name": "a binary value and a string", "input": [{"B": Buffer.from("ab")}, {"B": "ab"}], "output": false},
		{"name": "a string and a binary value", "input": [{"B": "ab"}, {"B": Buffer.from("ab")}], "output": false}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.name}`, () => {
			expect(utils.dynamoose.attribute_values_equal(...test.input)).toEqual(test.output);
		});
	});
});
