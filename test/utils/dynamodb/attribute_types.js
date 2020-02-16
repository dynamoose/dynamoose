const {expect} = require("chai");
const utils = require("../../../lib/utils");

describe("utils.dynamodb.attribute_types", () => {
	it("Should be an array", () => {
		expect(utils.dynamodb.attribute_types).to.be.an("array");
	});

	it("Should consist of all strings", () => {
		utils.dynamodb.attribute_types.forEach((val) => {
			expect(val).to.be.a("string");
		});
	});

	it("Should consist of all uppercase letters", () => {
		utils.dynamodb.attribute_types.forEach((val) => {
			expect(val).to.be.a("string");
		});
	});

	it("Should consist of all uppercase letters", () => {
		utils.dynamodb.attribute_types.forEach((val) => {
			expect(val).to.match(/^[^a-z]*$/);
		});
	});
});
