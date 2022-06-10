const ModelStore = require("../dist/ModelStore").default;

describe("ModelStore", () => {
	it("Should be a function", () => {
		expect(ModelStore).toBeInstanceOf(Function);
	});

	it("Should throw an error if nothing passed in", () => {
		expect(() => ModelStore()).toThrow("You must pass in a Model or model name as a string.");
	});
});
