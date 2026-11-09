const utils = require("../../dist/utils").default;

describe("utils.object.entries", () => {
	it("Should list every nested key path depth first, with the existing key as prefix", () => {
		const buffer = Buffer.from("x");
		const date = new Date(0);
		const object = {"a": 1, "b": {"c": [1, {"d": 2}], "e": null, "f": buffer, "g": date}};
		expect(utils.object.entries(object, "p")).toEqual([
			["p.a", 1],
			["p.b", object.b],
			["p.b.c", object.b.c],
			["p.b.c.0", 1],
			["p.b.c.1", {"d": 2}],
			["p.b.c.1.d", 2],
			["p.b.e", null],
			["p.b.f", buffer],
			["p.b.g", date]
		]);
		expect(utils.object.keys(object)).toEqual(["a", "b", "b.c", "b.c.0", "b.c.1", "b.c.1.d", "b.e", "b.f", "b.g"]);
	});

	it("Should walk an object again for each key that shares it", () => {
		const shared = {"q": 1};
		expect(utils.object.keys({"m": shared, "n": shared})).toEqual(["m", "m.q", "n", "n.q"]);
	});

	it("Should stop at a circular reference instead of overflowing the stack", () => {
		const object = {"x": 1};
		object.self = object;
		expect(utils.object.keys({"a": object})).toEqual(["a", "a.x", "a.self"]);
	});
});
