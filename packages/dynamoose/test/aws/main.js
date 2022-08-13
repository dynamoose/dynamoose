const dynamoose = require("../../dist");

describe("AWS", () => {
	it("Should return an object", () => {
		expect(dynamoose.aws).toBeInstanceOf(Object);
	});

	describe("DDB", () => {
		it("Should be a function", () => {
			expect(dynamoose.aws.ddb).toBeInstanceOf(Function);
		});

		it("Should return an object", () => {
			expect(dynamoose.aws.ddb()).toBeInstanceOf(Object);
		});

		describe("DynamoDB", () => {
			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.DynamoDB).toBeInstanceOf(Function);
			});
		});

		describe("Set", () => {
			afterEach(() => {
				dynamoose.aws.ddb.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.set).toBeInstanceOf(Function);
			});

			it("Should return custom item after setting", () => {
				const item = Symbol();
				dynamoose.aws.ddb.set(item);
				expect(dynamoose.aws.ddb()).toEqual(item);
			});
		});

		describe("Revert", () => {
			beforeEach(() => {
				const item = Symbol();
				dynamoose.aws.ddb.set(item);
			});
			afterEach(() => {
				dynamoose.aws.ddb.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.revert).toBeInstanceOf(Function);
			});

			it("Should return original object after reverting", () => {
				const first = dynamoose.aws.ddb();
				dynamoose.aws.ddb.revert();
				const second = dynamoose.aws.ddb();
				expect(second).not.toEqual(first);
			});
		});

		describe("Local", () => {
			afterEach(() => {
				dynamoose.aws.ddb.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.local).toBeInstanceOf(Function);
			});

			it("Should set correct default endpoint if nothing passed in", async () => {
				dynamoose.aws.ddb.local();
				expect(await dynamoose.aws.ddb().config.endpoint()).toEqual({
					"hostname": "localhost",
					"port": 8000,
					"protocol": "http:",
					"path": "/",
					"query": undefined
				});
			});

			it("Should set correct custom endpoint if custom string passed in", async () => {
				dynamoose.aws.ddb.local("http://localhost:9000");
				expect(await dynamoose.aws.ddb().config.endpoint()).toEqual({
					"hostname": "localhost",
					"port": 9000,
					"protocol": "http:",
					"path": "/",
					"query": undefined
				});
			});
		});
	});

	describe("Converter", () => {
		it("Should be a function", () => {
			expect(dynamoose.aws.converter).toBeInstanceOf(Function);
		});

		it("Should return an object", () => {
			expect(dynamoose.aws.converter()).toBeInstanceOf(Object);
		});

		describe("Set", () => {
			afterEach(() => {
				dynamoose.aws.converter.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.converter.set).toBeInstanceOf(Function);
			});

			it("Should return custom item after setting", () => {
				const item = Symbol();
				dynamoose.aws.converter.set(item);
				expect(dynamoose.aws.converter()).toEqual(item);
			});
		});

		describe("Revert", () => {
			beforeEach(() => {
				const item = Symbol();
				dynamoose.aws.converter.set(item);
			});
			afterEach(() => {
				dynamoose.aws.converter.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.converter.revert).toBeInstanceOf(Function);
			});

			it("Should return original object after reverting", () => {
				const first = dynamoose.aws.converter();
				dynamoose.aws.converter.revert();
				const second = dynamoose.aws.converter();
				expect(second).not.toEqual(first);
			});
		});
	});
});
