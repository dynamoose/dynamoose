const {expect} = require("chai");
const dynamoose = require("../lib");

describe("Main", () => {
	it("Should return an object", () => {
		expect(dynamoose).to.be.an("object");
	});
});
