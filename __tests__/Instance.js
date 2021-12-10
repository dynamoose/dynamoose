const dynamoose = require("../dist");

describe("dynamoose.Instance", () => {
	it("Should exist", () => {
		expect(dynamoose.Instance).toBeDefined();
	});

	it("Should allow for creating new instance", () => {
		const instance = new dynamoose.Instance();
		expect(instance).toBeDefined();
	});

	it("Should allow for setting different ddb", () => {
		const instance = new dynamoose.Instance();
		const ddb = {
			"getItem": () => {}
		};
		instance.aws.ddb.set(ddb);
		expect(instance.aws.ddb()).toBe(ddb);
	});

	it("Should not update default instance ddb", () => {
		const instance = new dynamoose.Instance();
		const ddb = {
			"getItem": () => {}
		};
		instance.aws.ddb.set(ddb);
		expect(dynamoose.aws.ddb()).not.toBe(ddb);
	});
});
