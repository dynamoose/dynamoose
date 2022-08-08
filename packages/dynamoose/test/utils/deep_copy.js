const utils = require("../../dist/utils").default;
const dynamoose = require("../../dist");

describe("utils.deep_copy", () => {
	it("Should be a function", () => {
		expect(utils.deep_copy).toBeInstanceOf(Function);
	});

	it("Should return a deep copy of the passed string", () => {
		let original = "Test";
		const copy = utils.deep_copy(original);
		expect(copy).toEqual("Test");

		original = "Test 2";

		expect(original).toEqual("Test 2");
		expect(copy).toEqual("Test");
	});

	it("Should return a deep copy of the passed class", () => {
		class Test {
			constructor () {
				this.foo = "Test";
			}
		}

		const original = new Test();
		const copy = utils.deep_copy(original);

		expect(copy.foo).toEqual("Test");

		original.foo = "Test 2";

		expect(original.foo).toEqual("Test 2");
		expect(copy.foo).toEqual("Test");
	});

	it("Should return a deep copy of the passed date", () => {
		const original = new Date("Mon, 01 Mar 2021 07:00:00 GMT");
		const copy = utils.deep_copy(original);
		expect(copy.toUTCString()).toEqual("Mon, 01 Mar 2021 07:00:00 GMT");

		original.setUTCDate(2);

		expect(original.toUTCString()).toEqual("Tue, 02 Mar 2021 07:00:00 GMT");
		expect(copy.toUTCString()).toEqual("Mon, 01 Mar 2021 07:00:00 GMT");
	});

	it("Should return a deep copy of the passed array", () => {
		const original = [{"a": 1}, {"a": 2}];
		const copy = utils.deep_copy(original);
		expect(copy).toStrictEqual([{"a": 1}, {"a": 2}]);

		original[0].a = 2;

		expect(original).toStrictEqual([{"a": 2}, {"a": 2}]);
		expect(copy).toStrictEqual([{"a": 1}, {"a": 2}]);
	});

	it("Should return a deep copy of the passed object", () => {
		const original = {"a": 1, "b": "test", "c": {"d": 100, "e": 200}};
		const copy = utils.deep_copy(original);
		expect(copy).toStrictEqual({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});

		delete original.a;
		delete original.c.d;

		expect(original).toStrictEqual({"b": "test", "c": {"e": 200}});
		expect(copy).toStrictEqual({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});
	});

	it("Should return a deep copy of the passed class instances", () => {
		class PersonWrapper {
			constructor (name, age) {
				this.name = name;
				this.age = age;
			}
		}
		const original = new PersonWrapper("Tim", 20);
		const copy = utils.deep_copy(original);
		expect(copy).toStrictEqual(new PersonWrapper("Tim", 20));

		original.name = undefined;

		expect(original).toStrictEqual(new PersonWrapper(undefined, 20));
		expect(copy).toStrictEqual(new PersonWrapper("Tim", 20));
		expect(original.constructor).toStrictEqual(PersonWrapper);
		expect(copy.constructor).toStrictEqual(PersonWrapper);
	});

	it("Should return a deep copy of the passed multiple nested class instances", () => {
		class NameWrapper {
			constructor (name) {
				this.name = name;
			}
		}

		class PersonWrapper {
			constructor (name, age) {
				this.name = name;
				this.age = age;
			}
		}
		const original = new PersonWrapper(new NameWrapper("Tim"), 20);
		const copy = utils.deep_copy(original);
		expect(copy).toStrictEqual(new PersonWrapper(new NameWrapper("Tim"), 20));

		original.name.name = undefined;
		original.age = 25;

		expect(original).toStrictEqual(new PersonWrapper(new NameWrapper(undefined), 25));
		expect(copy).toStrictEqual(new PersonWrapper(new NameWrapper("Tim"), 20));
		expect(original.constructor).toStrictEqual(PersonWrapper);
		expect(copy.constructor).toStrictEqual(PersonWrapper);
		expect(original.name.constructor).toStrictEqual(NameWrapper);
		expect(copy.name.constructor).toStrictEqual(NameWrapper);
	});

	it("Should return a deep copy of the passed set", () => {
		const original = new Set(["Hello", "World", "Universe"]);
		const copy = utils.deep_copy(original);
		expect([...copy]).toStrictEqual(["Hello", "World", "Universe"]);

		original.delete("Hello");

		expect([...original]).toStrictEqual(["World", "Universe"]);
		expect([...copy]).toStrictEqual(["Hello", "World", "Universe"]);
	});

	it("Should return a deep copy of the passed DynamoDB set", () => {
		const original = dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]});
		const copy = utils.deep_copy(original);
		expect(copy).toStrictEqual(dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]}));

		original.delete("Hello");
		original.add("Welcome");

		expect([...original]).toStrictEqual([...dynamoose.aws.converter().convertToNative({"SS": ["World", "Universe", "Welcome"]})]);
		expect([...copy]).toStrictEqual([...dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]})]);
		expect(copy.constructor).toStrictEqual(original.constructor);
	});

	it("Should return a deep copy of the passed map", () => {
		const original = new Map();
		original.set("a", 1);
		original.set("b", 2);

		const copy = utils.deep_copy(original);
		expect(Array.from(copy.entries())).toStrictEqual([["a", 1], ["b", 2]]);

		original.delete("b");

		expect(Array.from(original.entries())).toStrictEqual([["a", 1]]);
		expect(Array.from(copy.entries())).toStrictEqual([["a", 1], ["b", 2]]);
	});

	it("Should return a deep copy of the passed Uint8Array", () => {
		let original = Uint8Array.from([1, 2, 3]);
		const copy = utils.deep_copy(original);
		expect(copy.toString()).toEqual("1,2,3");

		original[0] = 0;

		expect(original.toString()).toEqual("0,2,3");
		expect(copy.toString()).toEqual("1,2,3");
	});

	it("Should return a deep copy of the passed buffer", () => {
		let original = Buffer.from("Hello World!");
		const copy = utils.deep_copy(original);
		expect(copy.toString()).toEqual("Hello World!");

		original[0] = 0;

		expect(original.toString()).toEqual("\u0000ello World!");
		expect(copy.toString()).toEqual("Hello World!");
	});
});
