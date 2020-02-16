const {expect} = require("chai");
const Error = require("../lib/Error");

describe("Error", () => {
	it("Should be an object", () => {
		expect(Error).to.be.an("object");
	});

	it("Should use custom message if passed in", () => {
		const message = "Test";
		const error = new Error.MissingSchemaError(message);
		expect(error.message).to.eql(message);
	});

	it("Should use default message if nothing passed in", () => {
		const error = new Error.MissingSchemaError();
		expect(error.message).to.eql("Missing Schema");
	});
});
