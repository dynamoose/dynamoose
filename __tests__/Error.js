const Error = require("../dist/Error").default;

describe("Error", () => {
	it("Should be an object", () => {
		expect(Error).toBeInstanceOf(Object);
	});

	it("Should use custom message if passed in", () => {
		const message = "Test";
		const error = new Error.MissingSchemaError(message);
		expect(error.message).toEqual(message);
	});

	it("Should use default message if nothing passed in", () => {
		const error = new Error.MissingSchemaError();
		expect(error.message).toEqual("Missing Schema");
	});
});
