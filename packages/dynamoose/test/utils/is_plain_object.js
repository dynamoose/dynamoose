const utils = require("../../dist/utils").default;

describe("utils.is_plain_object", () => {
	it("Should be a function", () => {
		expect(utils.is_plain_object).toBeInstanceOf(Function);
	});

	class MyClass {
		constructor () {
			this.a = 1;
		}
	}

	const tests = [
		{"name": "empty object literal", "input": {}, "output": true},
		{"name": "populated object literal", "input": {"a": 1}, "output": true},
		{"name": "nested object literal", "input": {"a": {"b": 1}}, "output": true},
		{"name": "null prototype object", "input": Object.create(null), "output": true},
		{"name": "null", "input": null, "output": false},
		{"name": "undefined", "input": undefined, "output": false},
		{"name": "string", "input": "hello", "output": false},
		{"name": "number", "input": 1, "output": false},
		{"name": "boolean", "input": true, "output": false},
		{"name": "function", "input": () => {}, "output": false},
		{"name": "empty array", "input": [], "output": false},
		{"name": "populated array", "input": [1, 2], "output": false},
		{"name": "Set", "input": new Set(["a"]), "output": false},
		{"name": "Date", "input": new Date(), "output": false},
		{"name": "Buffer", "input": Buffer.from("hello"), "output": false},
		{"name": "Uint8Array", "input": new Uint8Array([1, 2]), "output": false},
		{"name": "class instance", "input": new MyClass(), "output": false}
	];

	tests.forEach((test) => {
		it(`Should return ${test.output} for ${test.name}`, () => {
			expect(utils.is_plain_object(test.input)).toEqual(test.output);
		});
	});
});
