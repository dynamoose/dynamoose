const ItemRetriever = require("../dist/ItemRetriever");

describe("ItemRetriever", () => {
	it("Should return an object", () => {
		expect(typeof ItemRetriever).toEqual("object");
	});

	it("Should return an object with Scan property", () => {
		expect(ItemRetriever.Scan).toBeDefined();
	});

	it("Should return an object with Query property", () => {
		expect(ItemRetriever.Query).toBeDefined();
	});
});
