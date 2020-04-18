const {expect} = require("chai");
const dynamoose = require("../lib");

describe("Logger", () => {
	beforeEach(() => {
		dynamoose.logger.providers.clear();
		dynamoose.logger.resume();
	});

	it("Should be an object", () => {
		expect(dynamoose.logger).to.be.an("object");
	});

	describe("Status", () => {
		describe("dynamoose.logger.status", () => {
			it("Should be a function", () => {
				expect(dynamoose.logger.status).to.be.a("function");
			});

			it("Should return paused if status is paused", () => {
				dynamoose.logger.pause();
				expect(dynamoose.logger.status()).to.eql("paused");
			});

			it("Should return active if status is paused", () => {
				dynamoose.logger.resume();
				expect(dynamoose.logger.status()).to.eql("active");
			});
		});

		describe("dynamoose.logger.pause", () => {
			it("Should be a function", () => {
				expect(dynamoose.logger.pause).to.be.a("function");
			});

			it("Should set status to paused", () => {
				dynamoose.logger.pause();
				expect(dynamoose.logger.status()).to.eql("paused");
			});
		});

		describe("dynamoose.logger.resume", () => {
			it("Should be a function", () => {
				expect(dynamoose.logger.resume).to.be.a("function");
			});

			it("Should set status to active", () => {
				dynamoose.logger.resume();
				expect(dynamoose.logger.status()).to.eql("active");
			});
		});
	});

	describe("dynamoose.logger.providers", () => {
		it("Should be an object", () => {
			expect(dynamoose.logger.providers).to.be.an("object");
		});

		describe("dynamoose.logger.providers.list", () => {
			beforeEach(() => {
				const obj = [{"id": "test"}];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
			});

			it("Should be a function", () => {
				expect(dynamoose.logger.providers.list).to.be.a("function");
			});

			it("Should return list of providers", () => {
				expect(dynamoose.logger.providers.list()).to.eql([{"id": "test"}]);
			});
		});

		describe("dynamoose.logger.providers.set", () => {
			it("Should be a function", () => {
				expect(dynamoose.logger.providers.set).to.be.a("function");
			});

			it("Should set correctly for object", () => {
				const obj = {"id": "test"};
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql([obj]);
			});

			it("Should set correctly for array", () => {
				const obj = [{"id": "test"}];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
			});

			it("Should set correctly for empty array", () => {
				const originalProviders = dynamoose.logger.providers.list();
				const obj = [];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
				expect(dynamoose.logger.providers.list()).to.eql(originalProviders);
			});

			it("Should set correctly for nothing passed in", () => {
				const originalProviders = dynamoose.logger.providers.list();
				dynamoose.logger.providers.set();
				expect(dynamoose.logger.providers.list()).to.eql([]);
				expect(dynamoose.logger.providers.list()).to.eql(originalProviders);
			});

			it("Should set correctly for undefined passed in", () => {
				const originalProviders = dynamoose.logger.providers.list();
				dynamoose.logger.providers.set(undefined);
				expect(dynamoose.logger.providers.list()).to.eql([]);
				expect(dynamoose.logger.providers.list()).to.eql(originalProviders);
			});

			it("Should set correctly for null passed in", () => {
				const originalProviders = dynamoose.logger.providers.list();
				dynamoose.logger.providers.set(null);
				expect(dynamoose.logger.providers.list()).to.eql([]);
				expect(dynamoose.logger.providers.list()).to.eql(originalProviders);
			});
		});

		describe("dynamoose.logger.providers.clear", () => {
			beforeEach(() => {
				const obj = [{"id": "test"}];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
			});

			it("Should be a function", () => {
				expect(dynamoose.logger.providers.clear).to.be.a("function");
			});

			it("Should set providers to empty array", () => {
				dynamoose.logger.providers.clear();
				expect(dynamoose.logger.providers.list()).to.eql([]);
			});
		});

		describe("dynamoose.logger.providers.add", () => {
			beforeEach(() => {
				const obj = [{"id": "test"}];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
			});

			it("Should be a function", () => {
				expect(dynamoose.logger.providers.add).to.be.a("function");
			});

			it("Should add object provider to providers", () => {
				dynamoose.logger.providers.add({"id": "test2"});
				expect(dynamoose.logger.providers.list()).to.eql([{"id": "test"}, {"id": "test2"}]);
			});

			it("Should add array of providers to providers", () => {
				dynamoose.logger.providers.add([{"id": "test2"}, {"id": "test3"}]);
				expect(dynamoose.logger.providers.list()).to.eql([{"id": "test"}, {"id": "test2"}, {"id": "test3"}]);
			});
		});

		describe("dynamoose.logger.providers.delete", () => {
			beforeEach(() => {
				const obj = [{"id": "test"}, {"id": "test2"}, {"id": "test3"}];
				dynamoose.logger.providers.set(obj);
				expect(dynamoose.logger.providers.list()).to.eql(obj);
			});

			it("Should be a function", () => {
				expect(dynamoose.logger.providers.delete).to.be.a("function");
			});

			it("Should delete provider", () => {
				dynamoose.logger.providers.delete("test2");
				expect(dynamoose.logger.providers.list()).to.eql([{"id": "test"}, {"id": "test3"}]);
			});

			it("Should delete multiple providers if array passed into delete", () => {
				dynamoose.logger.providers.delete(["test2", "test3"]);
				expect(dynamoose.logger.providers.list()).to.eql([{"id": "test"}]);
			});
		});
	});
});
