const dynamoose = require("../../dist");
const DynamoDBUtil = require("@aws-sdk/util-dynamodb");

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

			it("Should use the custom convertToAttr for condition values", async () => {
				dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
				const Model = dynamoose.model("Cat", {"id": Number, "name": String});
				new dynamoose.Table("Cat", [Model]);
				dynamoose.aws.converter.set({
					...dynamoose.aws.converter(),
					"convertToAttr": (value) => ({"S": `custom:${value}`})
				});
				const request = await Model.scan("name").eq("Bob").getRequest();
				dynamoose.Table.defaults.set({});
				expect(request.ExpressionAttributeValues).toEqual({":v0": {"S": "custom:Bob"}});
			});
		});

		describe("convertToAttr", () => {
			const convertToAttr = (value, options) => dynamoose.aws.converter().convertToAttr(value, options);
			const sdkResult = (value, options) => {
				try {
					return DynamoDBUtil.convertToAttr(value, options);
				} catch (error) {
					return error;
				}
			};
			const tests = [
				["a string", "Hello"],
				["an empty string", ""],
				["a unicode string", "Caf\u00e9 \ud83d\ude00"],
				["an integer", 42],
				["a negative decimal", -1.5],
				["negative zero", -0],
				["a number written in exponent form", 1e-7],
				["Number.MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER],
				["Number.MIN_SAFE_INTEGER", Number.MIN_SAFE_INTEGER],
				["a number above Number.MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER + 2],
				["a number below Number.MIN_SAFE_INTEGER", Number.MIN_SAFE_INTEGER - 2],
				["NaN", NaN],
				["Infinity", Infinity],
				["-Infinity", -Infinity],
				["true", true],
				["false", false],
				["null", null],
				["undefined", undefined],
				["an object", {"a": [1, "b"]}],
				["a number set", new Set([1, 2])],
				["a buffer", Buffer.from("a")],
				["an empty string with convertEmptyValues", "", {"convertEmptyValues": true}],
				["a number above Number.MAX_SAFE_INTEGER with allowImpreciseNumbers", Number.MAX_SAFE_INTEGER + 2, {"allowImpreciseNumbers": true}]
			];
			tests.forEach(([name, value, options]) => {
				it(`Should match the AWS SDK for ${name}`, () => {
					const expected = sdkResult(value, options);
					if (expected instanceof Error) {
						expect(() => convertToAttr(value, options)).toThrow(expected.message);
					} else {
						expect(convertToAttr(value, options)).toEqual(expected);
					}
				});
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
