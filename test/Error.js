const {expect} = require("chai");
const Error = require("../dist/Error");

describe("Error", () => {
	it("Should be an object", () => {
		expect(Error).to.be.an("object");
	});

	it("Should use custom message if passed in", () => {
		const message = "Test";
		const error = Error.MissingSchemaError(message);
		expect(error.message).to.eql(message);
	});

	it("Should use default message if nothing passed in", () => {
		const error = Error.MissingSchemaError();
		expect(error.message).to.eql("Missing Schema");
	});
});
