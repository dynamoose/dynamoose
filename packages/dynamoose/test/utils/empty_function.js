const utils = require("../../dist/utils").default;

describe("utils.empty_function", () => {
	it("Should be a function", () => {
		expect(utils.empty_function).toBeInstanceOf(Function);
	});

	it("Should equal an empty function", () => {
		expect(utils.empty_function.toString().replace(/\s/gu, "").replace(/cov_.{9,10}\(\)\.f\[0\]\+\+;/gu, "").replace(/\/\*istanbulignorenext\*\//gu, "")).toEqual("()=>{}");
	});
});
