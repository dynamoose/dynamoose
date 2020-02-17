const {expect} = require("chai");
const dynamoose = require("../../lib");

describe("AWS", () => {
	it("Should return an object", () => {
		expect(dynamoose.aws).to.be.an("object");
	});

	describe("SDK", () => {
		it("Should return an object", () => {
			expect(dynamoose.aws.sdk).to.be.an("object");
		});

		it("Should return a object for config", () => {
			expect(dynamoose.aws.sdk.config).to.be.an("object");
		});

		it("Should return a function for config.update", () => {
			expect(dynamoose.aws.sdk.config.update).to.be.a("function");
		});
	});

	describe("DDB", () => {
		it("Should be a function", () => {
			expect(dynamoose.aws.ddb).to.be.a("function");
		});

		it("Should return an object", () => {
			expect(dynamoose.aws.ddb()).to.be.an("object");
		});

		describe("Set", () => {
			afterEach(() => {
				dynamoose.aws.ddb.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.set).to.be.a("function");
			});

			it("Should return custom item after setting", () => {
				const item = Symbol();
				dynamoose.aws.ddb.set(item);
				expect(dynamoose.aws.ddb()).to.eql(item);
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
				expect(dynamoose.aws.ddb.set).to.be.a("function");
			});

			it("Should return original object after reverting", () => {
				const first = dynamoose.aws.ddb();
				dynamoose.aws.ddb.revert();
				const second = dynamoose.aws.ddb();
				expect(second).to.not.eql(first);
			});
		});

		describe("Local", () => {
			afterEach(() => {
				dynamoose.aws.ddb.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.ddb.local).to.be.a("function");
			});

			it("Should set correct default endpoint if nothing passed in", () => {
				dynamoose.aws.ddb.local();
				expect(dynamoose.aws.ddb().endpoint.href).to.eql("http://localhost:8000/");
			});

			it("Should set correct custom endpoint if custom string passed in", () => {
				dynamoose.aws.ddb.local("http://localhost:9000");
				expect(dynamoose.aws.ddb().endpoint.href).to.eql("http://localhost:9000/");
			});
		});
	});

	describe("Converter", () => {
		it("Should be a function", () => {
			expect(dynamoose.aws.converter).to.be.a("function");
		});

		it("Should return an object", () => {
			expect(dynamoose.aws.converter()).to.be.an("object");
		});

		describe("Set", () => {
			afterEach(() => {
				dynamoose.aws.converter.revert();
			});

			it("Should be a function", () => {
				expect(dynamoose.aws.converter.set).to.be.a("function");
			});

			it("Should return custom item after setting", () => {
				const item = Symbol();
				dynamoose.aws.converter.set(item);
				expect(dynamoose.aws.converter()).to.eql(item);
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
				expect(dynamoose.aws.converter.set).to.be.a("function");
			});

			it("Should return original object after reverting", () => {
				const first = dynamoose.aws.converter();
				dynamoose.aws.converter.revert();
				const second = dynamoose.aws.converter();
				expect(second).to.not.eql(first);
			});
		});
	});
});
