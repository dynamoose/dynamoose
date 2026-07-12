const utils = require("../../dist/utils").default;
const libEntries = require("js-object-utilities").entries;

describe("object_entries", () => {
	// For acyclic input (every DynamoDB item, and anything already run through deep_copy)
	// object_entries must match js-object-utilities' entries exactly — same keys, same order.
	describe("matches js-object-utilities entries for acyclic input", () => {
		const tests = [
			{"name": "flat object", "input": {"a": 1, "b": "two", "c": true}},
			{"name": "nested objects", "input": {"a": {"b": {"c": 1}}, "d": 2}},
			{"name": "arrays", "input": {"list": [1, 2, 3], "nested": [{"x": 1}, {"y": 2}]}},
			{"name": "deeply nested mix", "input": {"a": {"b": [{"c": {"d": [1, 2]}}]}, "e": {"f": "g"}}},
			{"name": "null and undefined-ish values", "input": {"a": null, "b": 0, "c": "", "d": false}},
			{"name": "Buffer is not descended into", "input": {"buf": Buffer.from([1, 2, 3]), "n": 5}},
			// `Item.fromDynamo` runs on the AWS SDK's `unmarshall` output, where binary attributes are a `Uint8Array` rather than a `Buffer`. Neither implementation treats those as a leaf, so both enumerate a key per byte.
			{"name": "Uint8Array is descended into the same way", "input": {"bin": new Uint8Array([1, 2, 3]), "n": 5}},
			{"name": "Date is treated as a leaf-ish object", "input": {"when": new Date(0), "n": 1}},
			{"name": "empty object", "input": {}},
			{"name": "keys with numbers", "input": {"0": "a", "1": {"2": "b"}}}
		];

		tests.forEach((test) => {
			it(test.name, () => {
				expect(utils.object_entries(test.input)).toEqual(libEntries(test.input));
			});
		});
	});

	it("Should preserve depth-first pre-order", () => {
		expect(utils.object_entries({"a": {"b": 1, "c": {"d": 2}}, "e": 3}).map((entry) => entry[0]))
			.toEqual(["a", "a.b", "a.c", "a.c.d", "e"]);
	});

	it("Should terminate on a self-referential (cyclic) object without recursing into the cycle", () => {
		const obj = {"b": {"c": 1}};
		obj.self = obj; // direct cycle
		const result = utils.object_entries(obj);
		// The cyclic key is still emitted, but its subtree (the ancestor) is not descended into.
		expect(result).toContainEqual(["b.c", 1]);
		expect(result.some((entry) => entry[0] === "self")).toBe(true);
		expect(result.every((entry) => !entry[0].startsWith("self.self"))).toBe(true);
	});

	it("Should terminate on an indirect cycle", () => {
		const a = {"name": "a"};
		const b = {"name": "b", a};
		a.b = b; // a -> b -> a
		expect(() => utils.object_entries(a)).not.toThrow();
	});
});
