const dynamoose = require("../dist");

describe("dynamoose", () => {
	it("Should return an object", () => {
		expect(dynamoose).toBeInstanceOf(Object);
	});

	describe("dynamoose.type", () => {
		describe("dynamoose.type.CONSTANT", () => {
			it("Should return correct object", () => {
				expect(dynamoose.type.CONSTANT("Hello")).toEqual({
					"value": "Constant",
					"settings": {
						"value": "Hello"
					}
				});
			});
		});

		describe("dynamoose.type.COMBINE", () => {
			it("Should return correct object if no separator defined", () => {
				expect(dynamoose.type.COMBINE(["firstname", "lastname"])).toEqual({
					"value": "Combine",
					"settings": {
						"attributes": ["firstname", "lastname"]
					}
				});
			});

			it("Should return correct object if separator defined", () => {
				expect(dynamoose.type.COMBINE(["firstname", "lastname"], "-")).toEqual({
					"value": "Combine",
					"settings": {
						"attributes": ["firstname", "lastname"],
						"separator": "-"
					}
				});
			});
		});
	});
});
