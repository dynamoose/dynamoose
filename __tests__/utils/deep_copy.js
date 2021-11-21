const {expect} = require("chai");
const utils = require("../../dist/utils");
const dynamoose = require("../../dist");

describe("utils.deep_copy", () => {
	it("Should be a function", () => {
		expect(utils.deep_copy).to.be.a("function");
	});

	it("Should return a deep copy of the passed string", () => {
		let original = "Test";
		const copy = utils.deep_copy(original);
		expect(copy).to.equal("Test");

		original = "Test 2";

		expect(original).to.equal("Test 2");
		expect(copy).to.equal("Test");
	});

	it("Should return a deep copy of the passed class", () => {
		class Test {
			constructor () {
				this.foo = "Test";
			}
		}

		const original = new Test();
		const copy = utils.deep_copy(original);

		expect(copy.foo).to.equal("Test");

		original.foo = "Test 2";

		expect(original.foo).to.equal("Test 2");
		expect(copy.foo).to.equal("Test");
	});

	it("Should return a deep copy of the passed date", () => {
		const original = new Date("Mon, 01 Mar 2021 07:00:00 GMT");
		const copy = utils.deep_copy(original);
		expect(copy.toUTCString()).to.equal("Mon, 01 Mar 2021 07:00:00 GMT");

		original.setUTCDate(2);

		expect(original.toUTCString()).to.equal("Tue, 02 Mar 2021 07:00:00 GMT");
		expect(copy.toUTCString()).to.equal("Mon, 01 Mar 2021 07:00:00 GMT");
	});

	it("Should return a deep copy of the passed array", () => {
		const original = [{"a": 1}, {"a": 2}];
		const copy = utils.deep_copy(original);
		expect(copy).to.deep.equal([{"a": 1}, {"a": 2}]);

		original[0].a = 2;

		expect(original).to.deep.equal([{"a": 2}, {"a": 2}]);
		expect(copy).to.deep.equal([{"a": 1}, {"a": 2}]);
	});

	it("Should return a deep copy of the passed object", () => {
		const original = {"a": 1, "b": "test", "c": {"d": 100, "e": 200}};
		const copy = utils.deep_copy(original);
		expect(copy).to.deep.equal({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});

		delete original.a;
		delete original.c.d;

		expect(original).to.deep.equal({"b": "test", "c": {"e": 200}});
		expect(copy).to.deep.equal({"a": 1, "b": "test", "c": {"d": 100, "e": 200}});
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
		expect(copy).to.deep.equal(new PersonWrapper("Tim", 20));

		original.name = undefined;

		expect(original).to.deep.equal(new PersonWrapper(undefined, 20));
		expect(copy).to.deep.equal(new PersonWrapper("Tim", 20));
		expect(original.constructor).to.deep.equal(PersonWrapper);
		expect(copy.constructor).to.deep.equal(PersonWrapper);
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
		expect(copy).to.deep.equal(new PersonWrapper(new NameWrapper("Tim"), 20));

		original.name.name = undefined;
		original.age = 25;

		expect(original).to.deep.equal(new PersonWrapper(new NameWrapper(undefined), 25));
		expect(copy).to.deep.equal(new PersonWrapper(new NameWrapper("Tim"), 20));
		expect(original.constructor).to.deep.equal(PersonWrapper);
		expect(copy.constructor).to.deep.equal(PersonWrapper);
		expect(original.name.constructor).to.deep.equal(NameWrapper);
		expect(copy.name.constructor).to.deep.equal(NameWrapper);
	});

	it("Should return a deep copy of the passed set", () => {
		const original = new Set(["Hello", "World", "Universe"]);
		const copy = utils.deep_copy(original);
		expect([...copy]).to.deep.equal(["Hello", "World", "Universe"]);

		original.delete("Hello");

		expect([...original]).to.deep.equal(["World", "Universe"]);
		expect([...copy]).to.deep.equal(["Hello", "World", "Universe"]);
	});

	it("Should return a deep copy of the passed DynamoDB set", () => {
		const original = dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]});
		const copy = utils.deep_copy(original);
		expect(copy).to.deep.equal(dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]}));

		original.delete("Hello");
		original.add("Welcome");

		expect([...original]).to.deep.equal([...dynamoose.aws.converter().convertToNative({"SS": ["World", "Universe", "Welcome"]})]);
		expect([...copy]).to.deep.equal([...dynamoose.aws.converter().convertToNative({"SS": ["Hello", "World", "Universe"]})]);
		expect(copy.constructor).to.deep.equal(original.constructor);
	});

	it("Should return a deep copy of the passed map", () => {
		const original = new Map();
		original.set("a", 1);
		original.set("b", 2);

		const copy = utils.deep_copy(original);
		expect(Array.from(copy.entries())).to.deep.equal([["a", 1], ["b", 2]]);

		original.delete("b");

		expect(Array.from(original.entries())).to.deep.equal([["a", 1]]);
		expect(Array.from(copy.entries())).to.deep.equal([["a", 1], ["b", 2]]);
	});

	it("Should return a deep copy of the passed buffer", () => {
		let original = Buffer.from("Hello World!");
		const copy = utils.deep_copy(original);
		expect(copy.toString()).to.equal("Hello World!");

		original[0] = 0;

		expect(original.toString()).to.equal("\u0000ello World!");
		expect(copy.toString()).to.equal("Hello World!");
	});
});
