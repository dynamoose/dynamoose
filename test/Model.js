const {expect} = require("chai");
const dynamoose = require("../lib");

describe("Model", () => {
	it("Should have a model proprety on the dynamoose object", () => {
		expect(dynamoose.model).to.exist;
	});
});
