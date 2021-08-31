const {expect} = require("chai");
const utils = require("../../../dist/utils");

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
				this.test = "Test";
			}
		}

		const original = new Test();
		const copy = utils.deep_copy(original);
		expect(copy.test).to.equal("Test");

		original.test = "Test 2";

		expect(original.test).to.equal("Test 2");
		expect(copy.test).to.equal("Test");
	});

	it("Should return a deep copy of the passed date", () => {
		const original = new Date(2021, 2, 1);
		const copy = utils.deep_copy(original);
		expect(copy.toUTCString()).to.equal("Mon, 01 Mar 2021 07:00:00 GMT");

		original.setDate(2);

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
});
