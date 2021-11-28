const {expect} = require("chai");
const dynamoose = require("../dist");

describe("dynamoose", () => {
	it("Should return an object", () => {
		expect(dynamoose).to.be.an("object");
	});
});
