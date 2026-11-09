const utils = require("../../dist/utils").default;

describe("utils.object_delete_copy", () => {
	const input = () => ({"id": 1, "friend": {"id": 3, "name": "Tom", "pet": {"id": 5, "name": "Rex"}}, "lines": [{"sku": "A1", "cost": 5}, {"sku": "B2", "cost": 9}]});

	it("Should be a function", () => {
		expect(utils.object_delete_copy).toBeInstanceOf(Function);
	});

	const paths = [["id"], ["friend.id"], ["friend.pet.name"], ["friend.pet"], ["lines.0.cost"], ["lines.1"], ["lines.cost"], ["friend.id", "lines.0.cost"], ["lines.0", "lines.0.cost"], ["lines.1", "lines.0.sku"], ["friend", "friend.id"], ["friend.id", "friend"], ["missing"], ["missing.id"], ["id.nested"], [], "friend.id"];
	paths.forEach((path) => {
		it(`Should return the same result as utils.object.delete for ${JSON.stringify(path)}`, () => {
			expect(utils.object_delete_copy(input(), path)).toEqual(utils.object.delete(input(), path));
		});

		it(`Should not change the input for ${JSON.stringify(path)}`, () => {
			const object = input();
			utils.object_delete_copy(object, path);
			expect(object).toEqual(input());
		});
	});

	it("Should not copy values that are not on a deleted path", () => {
		const object = input();
		const result = utils.object_delete_copy(object, ["friend.id"]);
		expect(result.friend).not.toBe(object.friend);
		expect(result.friend.pet).toBe(object.friend.pet);
		expect(result.lines).toBe(object.lines);
	});

	it("Should not change an object without a prototype on a deleted path", () => {
		const object = {"group": Object.assign(Object.create(null), {"a": 1, "b": 2})};
		const result = utils.object_delete_copy(object, ["group.a"]);
		expect({...result.group}).toEqual({"b": 2});
		expect(Object.getPrototypeOf(result.group)).toEqual(null);
		expect({...object.group}).toEqual({"a": 1, "b": 2});
	});

	it("Should not change the input when an earlier path removes a list element", () => {
		const object = {"lines": [{"sku": "A1", "cost": 1}, {"sku": "B2", "cost": 2}, {"sku": "C3", "cost": 3}]};
		const result = utils.object_delete_copy(object, ["lines.0", "lines.1.cost"]);
		expect(result.lines).toEqual([{"sku": "B2", "cost": 2}, {"sku": "C3"}]);
		expect(object.lines).toEqual([{"sku": "A1", "cost": 1}, {"sku": "B2", "cost": 2}, {"sku": "C3", "cost": 3}]);
	});

	it("Should keep an own __proto__ key on a copied object", () => {
		const nested = JSON.parse("{\"__proto__\": {\"a\": 1}, \"b\": 2, \"c\": 3}");
		const result = utils.object_delete_copy({nested}, ["nested.c"]);
		expect(Object.getOwnPropertyNames(result.nested)).toEqual(["__proto__", "b"]);
		expect(Object.getPrototypeOf(result.nested)).toBe(Object.prototype);
		expect(Object.getOwnPropertyNames(nested)).toEqual(["__proto__", "b", "c"]);
	});

	it("Should keep holes in a copied list", () => {
		const list = [{"a": 1}];
		list[2] = {"a": 3};
		const result = utils.object_delete_copy({list}, ["list.2.a"]);
		expect(1 in result.list).toEqual(false);
		expect(result.list.length).toEqual(3);
		expect(list[2]).toEqual({"a": 3});
	});

	it("Should not copy along a path through an inherited property", () => {
		const result = utils.object_delete_copy({"a": 1}, ["__proto__.notAProperty"]);
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(result).toEqual({"a": 1});
	});

	it("Should not delete from a prototype through an inherited __proto__, constructor or prototype property", () => {
		const objectToString = Object.prototype.toString;
		const stringTrim = String.prototype.trim;
		try {
			const result = utils.object_delete_copy({"name": "Bob", "friend": {"id": 3}}, ["__proto__.toString", "constructor.prototype.toString", "friend.__proto__.toString", "name.constructor.prototype.trim", "friend.id"]);
			expect(Object.prototype.toString).toBe(objectToString);
			expect(String.prototype.trim).toBe(stringTrim);
			expect(result).toEqual({"name": "Bob", "friend": {}});
		} finally {
			Object.prototype.toString = objectToString;
			String.prototype.trim = stringTrim;
		}
	});

	it("Should skip a path through an own __proto__ key", () => {
		const nested = JSON.parse("{\"__proto__\": {\"a\": 1, \"b\": 2}}");
		const result = utils.object_delete_copy({nested}, ["nested.__proto__.a", "nested.__proto__"]);
		expect(result.nested.__proto__).toEqual({"a": 1, "b": 2});
		expect(Object.getOwnPropertyNames(result.nested)).toEqual(["__proto__"]);
		expect(nested.__proto__).toEqual({"a": 1, "b": 2});
	});

	it("Should skip a path through an own constructor or prototype key", () => {
		const input = {"constructor": {"name": "a"}, "prototype": {"name": "b"}, "other": 1};
		const result = utils.object_delete_copy(input, ["constructor.name", "prototype.name", "other"]);
		expect(result).toEqual({"constructor": {"name": "a"}, "prototype": {"name": "b"}});
		expect(input).toEqual({"constructor": {"name": "a"}, "prototype": {"name": "b"}, "other": 1});
	});

	it("Should accept numbers as paths, the same as utils.object.delete", () => {
		const input = () => ({"0": "zero", "1": {"5": "one point five", "6": "one point six"}});
		const object = input();
		const result = utils.object_delete_copy(object, [0, 1.5]);
		expect(result).toEqual(utils.object.delete(input(), [0, 1.5]));
		expect(result).toEqual({"1": {"6": "one point six"}});
		expect(object).toEqual(input());
	});

	it("Should throw for a path that is not a string or number, the same as utils.object.delete", () => {
		expect(() => utils.object_delete_copy({"a": 1}, [null])).toThrow(TypeError);
		expect(() => utils.object.delete({"a": 1}, [null])).toThrow(TypeError);
	});

	it("Should throw for a path through a missing value, the same as utils.object.delete", () => {
		expect(() => utils.object_delete_copy(input(), ["missing.id.name"])).toThrow(TypeError);
		expect(() => utils.object.delete(input(), ["missing.id.name"])).toThrow(TypeError);
	});

	it("Should copy a list once when several paths go through it", () => {
		const lines = [{"sku": "A1", "cost": 5}, {"sku": "B2", "cost": 9}];
		const slice = Array.prototype.slice;
		let listCopies = 0;
		Array.prototype.slice = function (...args) {
			if (this.length === 2 && this.every((line) => line && line.sku)) {
				listCopies++;
			}
			return slice.apply(this, args);
		};
		let result;
		try {
			result = utils.object_delete_copy({lines}, ["lines.0.cost", "lines.1.cost"]);
		} finally {
			Array.prototype.slice = slice;
		}
		expect(listCopies).toEqual(1);
		expect(result.lines).toEqual([{"sku": "A1"}, {"sku": "B2"}]);
		expect(lines).toEqual([{"sku": "A1", "cost": 5}, {"sku": "B2", "cost": 9}]);
	});

	it("Should not change an input that is not a plain object", () => {
		class Thing {
			constructor () {
				this.a = 1;
				this.b = 2;
			}
		}
		const thing = new Thing();
		expect(utils.object_delete_copy(thing, ["a"])).toEqual({"b": 2});
		expect(thing).toEqual(new Thing());
	});

	it("Should leave values that are not plain objects or arrays to utils.object.delete", () => {
		const date = new Date(0);
		const object = {"at": date};
		const result = utils.object_delete_copy(object, ["at.time"]);
		expect(result.at).toBe(date);
	});
});
