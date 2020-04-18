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

	describe("Emitter", () => {
		const emitter = require("../lib/logger/emitter");
		let events = [];
		class CustomProvider {
			log(event) {
				events.push(event);
			}
		}
		beforeEach(() => {
			dynamoose.logger.providers.set(new CustomProvider());
		});
		afterEach(() => {
			events = [];
		});

		it("Should log event", () => {
			emitter({"level": "info", "message": "Hello World", "category": "test"});
			expect(events).to.be.an("array");
			expect(events.length).to.eql(1);
			expect(events[0]).to.be.an("object");
			expect(Object.keys(events[0]).sort()).to.eql(["id", "timestamp", "level", "message", "category", "metadata"].sort());
			expect(events[0].id).to.be.a("string");
			expect(events[0].id).to.not.eql("");
			expect(events[0].timestamp).to.be.within(new Date(Date.now() - 2000), new Date(Date.now() + 2000));
			expect(events[0].level).to.eql("info");
			expect(events[0].message).to.eql("Hello World");
			expect(events[0].category).to.eql("test");
			expect(events[0].metadata).to.eql({});
		});

		it("Should allow for no category", () => {
			emitter({"level": "info", "message": "Hello World"});
			expect(events[0].category).to.eql("");
		});

		it("Should not log event if paused", () => {
			dynamoose.logger.pause();
			emitter({"level": "info", "message": "Hello World", "category": "test"});
			expect(events.length).to.eql(0);
		});

		it("Should throw error if no message passed in", () => {
			expect(() => emitter({"level": "info"})).to.throw("You must pass in a valid message, level, and category into your event object.");
		});

		it("Should throw error if no level passed in", () => {
			expect(() => emitter({"message": "Hello World"})).to.throw("You must pass in a valid message, level, and category into your event object.");
		});

		it("Should throw error if invalid level passed in", () => {
			expect(() => emitter({"message": "Hello World", "level": "random"})).to.throw("You must pass in a valid message, level, and category into your event object.");
		});

		describe("Filter", () => {
			describe("Level", () => {
				const tests = [
					{"filter": "error", "level": "error", "outcome": false},
					{"filter": "error", "level": "fatal", "outcome": true},
					{"filter": "error+", "level": "fatal", "outcome": false},
					{"filter": "error+", "level": "error", "outcome": false},
					{"filter": "error+", "level": "debug", "outcome": true},
					{"filter": "error-", "level": "fatal", "outcome": true},
					{"filter": "error-", "level": "error", "outcome": false},
					{"filter": "error-", "level": "debug", "outcome": false},
					{"filter": ["error", "info"], "level": "error", "outcome": false},
					{"filter": ["error", "info"], "level": "info", "outcome": false},
					{"filter": ["error", "info"], "level": "fatal", "outcome": true},
				];
				tests.forEach((test) => {
					it(`Should ${test.outcome ? "" : "not "}filter level ${typeof test.filter === "object" ? JSON.stringify(test.filter) : `"${test.filter}"`} for input of ${test.level}`, () => {
						dynamoose.logger.providers.set({
							"provider": new CustomProvider(),
							"filter": {
								"level": test.filter
							}
						});
						emitter({"level": test.level, "message": "Hello World"});
						expect(events.length).to.eql(test.outcome ? 0 : 1);
					});
				});
			});

			describe("Category", () => {
				const tests = [
					{"filter": "aws:dynamodb:putItem:request", "category": "aws:dynamodb:putItem:request", "outcome": false},
					{"filter": "aws:dynamodb:putItem:request", "category": "aws:dynamodb:putItem:response", "outcome": true},
					{"filter": ["aws:dynamodb:putItem:request", "aws:dynamodb:putItem:response"], "category": "aws:dynamodb:putItem:response", "outcome": false},
					{"filter": "*:dynamodb:putItem:request", "category": "aws:dynamodb:putItem:request", "outcome": false},
					{"filter": "*:dynamodb:putItem:request", "category": "aws:dynamodb:putItem:request", "outcome": false},
					{"filter": "**", "category": "aws:dynamodb:putItem:request", "outcome": false},
					{"filter": "*:dynamodb:putItem:request", "category": "aws:dynamodb:getItem:request", "outcome": true},
					{"filter": "*:dynamodb:**", "category": "aws:dynamodb:getItem:request", "outcome": false},
					{"filter": "*:dynamodb:**", "category": "aws:dynamodb:getItem:response", "outcome": false},
					{"filter": "*:dynamodb:**", "category": "aws:dynamodb:putItem:request", "outcome": false},
					{"filter": "*:dynamodb:**", "category": "aws:dynamodb:putItem:response", "outcome": false},
					{"filter": "random", "category": "other", "outcome": true},
					{"filter": "random:*", "category": "other", "outcome": true},
					{"filter": "random:*", "category": "random", "outcome": true},
					{"filter": "random:**", "category": "random", "outcome": true},
					{"filter": "random:*:test", "category": "random:test", "outcome": true},
				];
				tests.forEach((test) => {
					it(`Should ${test.outcome ? "" : "not "}filter level ${typeof test.filter === "object" ? JSON.stringify(test.filter) : `"${test.filter}"`} for input of ${test.category}`, () => {
						dynamoose.logger.providers.set({
							"provider": new CustomProvider(),
							"filter": {
								"category": test.filter
							}
						});
						emitter({"level": "error", "category": test.category, "message": "Hello World"});
						expect(events.length).to.eql(test.outcome ? 0 : 1);
					});
				});
			});
		});
	});
});
