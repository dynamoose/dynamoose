const dynamoose = require("../dist");
const CustomError = require("../dist/Error").default;
const utils = require("../dist/utils").default;
const emitter = utils.log;
const importPackage = require("../dist/utils/importPackage");

describe("Logger", () => {
	beforeEach(async () => {
		importPackage.revertPackages();
		(await dynamoose.logger()).providers.clear();
		(await dynamoose.logger()).resume();
	});
	afterEach(async () => {
		importPackage.revertPackages();
		(await dynamoose.logger()).providers.clear();
	});

	it("Should be an function", () => {
		expect(dynamoose.logger).toBeInstanceOf(Function);
	});

	it("Should throw error if package is not installed", async () => {
		importPackage.setUndefinedPackage("dynamoose-logger");
		let result, error;
		try {
			result = await dynamoose.logger();
		} catch (e) {
			error = e;
		}
		expect(result).not.toBeDefined();
		expect(error.message).toEqual("dynamoose-logger has not been installed. Install it using `npm i --save-dev dynamoose-logger`.");
	});

	describe("Status", () => {
		describe("dynamoose.logger().status", () => {
			it("Should be a function", async () => {
				expect((await dynamoose.logger()).status).toBeInstanceOf(Function);
			});

			it("Should return paused if status is paused", async () => {
				(await dynamoose.logger()).pause();
				expect((await dynamoose.logger()).status()).toEqual("paused");
			});

			it("Should return active if status is paused", async () => {
				(await dynamoose.logger()).resume();
				expect((await dynamoose.logger()).status()).toEqual("active");
			});
		});

		describe("dynamoose.logger().pause", () => {
			it("Should be a function", async () => {
				expect((await dynamoose.logger()).pause).toBeInstanceOf(Function);
			});

			it("Should set status to paused", async () => {
				(await dynamoose.logger()).pause();
				expect((await dynamoose.logger()).status()).toEqual("paused");
			});
		});

		describe("dynamoose.logger().resume", () => {
			it("Should be a function", async () => {
				expect((await dynamoose.logger()).resume).toBeInstanceOf(Function);
			});

			it("Should set status to active", async () => {
				(await dynamoose.logger()).resume();
				expect((await dynamoose.logger()).status()).toEqual("active");
			});
		});
	});

	describe("dynamoose.logger().providers", () => {
		it("Should be an object", async () => {
			expect((await dynamoose.logger()).providers).toBeInstanceOf(Object);
		});

		describe("dynamoose.logger().providers.list", () => {
			beforeEach(async () => {
				const obj = [{"id": "test"}];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
			});

			it("Should be a function", async () => {
				expect((await dynamoose.logger()).providers.list).toBeInstanceOf(Function);
			});

			it("Should return list of providers", async () => {
				expect((await dynamoose.logger()).providers.list()).toEqual([{"id": "test"}]);
			});
		});

		describe("dynamoose.logger().providers.set", () => {
			it("Should be a function", async () => {
				expect((await dynamoose.logger()).providers.set).toBeInstanceOf(Function);
			});

			it("Should set correctly for object", async () => {
				const obj = {"id": "test"};
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual([obj]);
			});

			it("Should set correctly for array", async () => {
				const obj = [{"id": "test"}];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
			});

			it("Should set correctly for empty array", async () => {
				const originalProviders = (await dynamoose.logger()).providers.list();
				const obj = [];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(originalProviders);
			});

			it("Should set correctly for nothing passed in", async () => {
				const originalProviders = (await dynamoose.logger()).providers.list();
				(await dynamoose.logger()).providers.set();
				expect((await dynamoose.logger()).providers.list()).toEqual([]);
				expect((await dynamoose.logger()).providers.list()).toEqual(originalProviders);
			});

			it("Should set correctly for undefined passed in", async () => {
				const originalProviders = (await dynamoose.logger()).providers.list();
				(await dynamoose.logger()).providers.set(undefined);
				expect((await dynamoose.logger()).providers.list()).toEqual([]);
				expect((await dynamoose.logger()).providers.list()).toEqual(originalProviders);
			});

			it("Should set correctly for null passed in", async () => {
				const originalProviders = (await dynamoose.logger()).providers.list();
				(await dynamoose.logger()).providers.set(null);
				expect((await dynamoose.logger()).providers.list()).toEqual([]);
				expect((await dynamoose.logger()).providers.list()).toEqual(originalProviders);
			});
		});

		describe("dynamoose.logger().providers.clear", () => {
			beforeEach(async () => {
				const obj = [{"id": "test"}];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
			});

			it("Should be a function", async () => {
				expect((await dynamoose.logger()).providers.clear).toBeInstanceOf(Function);
			});

			it("Should set providers to empty array", async () => {
				(await dynamoose.logger()).providers.clear();
				expect((await dynamoose.logger()).providers.list()).toEqual([]);
			});
		});

		describe("dynamoose.logger().providers.add", () => {
			beforeEach(async () => {
				const obj = [{"id": "test"}];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
			});

			it("Should be a function", async () => {
				expect((await dynamoose.logger()).providers.add).toBeInstanceOf(Function);
			});

			it("Should add object provider to providers", async () => {
				(await dynamoose.logger()).providers.add({"id": "test2"});
				expect((await dynamoose.logger()).providers.list()).toEqual([{"id": "test"}, {"id": "test2"}]);
			});

			it("Should add array of providers to providers", async () => {
				(await dynamoose.logger()).providers.add([{"id": "test2"}, {"id": "test3"}]);
				expect((await dynamoose.logger()).providers.list()).toEqual([{"id": "test"}, {"id": "test2"}, {"id": "test3"}]);
			});
		});

		describe("dynamoose.logger().providers.delete", () => {
			beforeEach(async () => {
				const obj = [{"id": "test"}, {"id": "test2"}, {"id": "test3"}];
				(await dynamoose.logger()).providers.set(obj);
				expect((await dynamoose.logger()).providers.list()).toEqual(obj);
			});

			it("Should be a function", async () => {
				expect((await dynamoose.logger()).providers.delete).toBeInstanceOf(Function);
			});

			it("Should delete provider", async () => {
				(await dynamoose.logger()).providers.delete("test2");
				expect((await dynamoose.logger()).providers.list()).toEqual([{"id": "test"}, {"id": "test3"}]);
			});

			it("Should delete multiple providers if array passed into delete", async () => {
				(await dynamoose.logger()).providers.delete(["test2", "test3"]);
				expect((await dynamoose.logger()).providers.list()).toEqual([{"id": "test"}]);
			});
		});
	});

	describe("Emitter", () => {
		let events = [];
		class CustomProvider {
			log (event) {
				events.push(event);
			}
		}
		class CustomProviderMessage {
			constructor () {
				this.type = "string";
			}
			log (event) {
				events.push(event);
			}
		}
		beforeEach(async () => {
			(await dynamoose.logger()).providers.set(new CustomProvider());
		});
		afterEach(() => {
			events = [];
		});

		it("Should log event", async () => {
			await emitter({"level": "info", "message": "Hello World", "category": "test"});
			expect(events).toBeInstanceOf(Array);
			expect(events.length).toEqual(1);
			expect(events[0]).toBeInstanceOf(Object);
			expect(Object.keys(events[0]).sort()).toEqual(["id", "timestamp", "level", "message", "category", "metadata"].sort());
			expect(typeof events[0].id).toEqual("string");
			expect(events[0].id).not.toEqual("");
			expect(events[0].timestamp).toBeWithinRange(new Date(Date.now() - 2000), new Date(Date.now() + 2000));
			expect(events[0].level).toEqual("info");
			expect(events[0].message).toEqual("Hello World");
			expect(events[0].category).toEqual("test");
			expect(events[0].metadata).toEqual({});
		});

		it("Should handle no logger gracefully", async () => {
			importPackage.setUndefinedPackage("dynamoose-logger/dist/emitter");
			await emitter({"level": "info", "message": "Hello World", "category": "test"});
		});

		it("Should log event with string type", async () => {
			(await dynamoose.logger()).providers.set(new CustomProviderMessage());
			await emitter({"level": "info", "message": "Hello World", "category": "test"});
			expect(events).toEqual(["Hello World"]);
		});

		it("Should allow for no category", async () => {
			await emitter({"level": "info", "message": "Hello World"});
			expect(events[0].category).toEqual("");
		});

		it("Should not log event if paused", async () => {
			(await dynamoose.logger()).pause();
			await emitter({"level": "info", "message": "Hello World", "category": "test"});
			expect(events.length).toEqual(0);
		});

		const tests = [
			{"name": "Should throw error if no message passed in", "object": {"level": "info"}},
			{"name": "Should throw error if no level passed in", "object": {"message": "Hello World"}},
			{"name": "Should throw error if invalid level passed in", "object": {"message": "Hello World", "level": "random"}}
		];
		tests.forEach((test) => {
			it(test.name, () => {
				return expect(emitter(test.object)).rejects.toEqual(new CustomError.InvalidParameter("You must pass in a valid message, level, and category into your event object."));
			});
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
					{"filter": ["error", "info"], "level": "fatal", "outcome": true}
				];
				tests.forEach((test) => {
					it(`Should ${test.outcome ? "" : "not "}filter level ${typeof test.filter === "object" ? JSON.stringify(test.filter) : `"${test.filter}"`} for input of ${test.level}`, async () => {
						(await dynamoose.logger()).providers.set({
							"provider": new CustomProvider(),
							"filter": {
								"level": test.filter
							}
						});
						await emitter({"level": test.level, "message": "Hello World"});
						expect(events.length).toEqual(test.outcome ? 0 : 1);
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
					{"filter": "random:*:test", "category": "random:test", "outcome": true}
				];
				tests.forEach((test) => {
					it(`Should ${test.outcome ? "" : "not "}filter level ${typeof test.filter === "object" ? JSON.stringify(test.filter) : `"${test.filter}"`} for input of ${test.category}`, async () => {
						(await dynamoose.logger()).providers.set({
							"provider": new CustomProvider(),
							"filter": {
								"category": test.filter
							}
						});
						await emitter({"level": "error", "category": test.category, "message": "Hello World"});
						expect(events.length).toEqual(test.outcome ? 0 : 1);
					});
				});
			});
		});
	});

	describe("Console Logger", () => {
		const consoleTypes = ["error", "warn", "info", "log"];
		let logs = [];
		let originalConsole = {};
		beforeEach(async () => {
			(await dynamoose.logger()).providers.set(console);
			consoleTypes.forEach((type) => {
				originalConsole[type] = console[type]; // eslint-disable-line no-console
				console[type] = (str) => logs.push({"message": str, type}); // eslint-disable-line no-console
			});
		});
		afterEach(() => {
			consoleTypes.forEach((type) => {
				console[type] = originalConsole[type]; // eslint-disable-line no-console
			});
			originalConsole = {};
			logs = [];
		});

		it("Should print message & category", async () => {
			await emitter({"level": "fatal", "message": "Hello World", "category": "test"});
			expect(logs).toEqual([{"message": "test - Hello World", "type": "error"}]);
		});

		it("Should print message to console.error for fatal", async () => {
			await emitter({"level": "fatal", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "error"}]);
		});

		it("Should print message to console.error for error", async () => {
			await emitter({"level": "error", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "error"}]);
		});

		it("Should print message to console.warn for warn", async () => {
			await emitter({"level": "warn", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "warn"}]);
		});

		it("Should print message to console.info for info", async () => {
			await emitter({"level": "info", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "info"}]);
		});

		it("Should print message to console.log for debug", async () => {
			await emitter({"level": "debug", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "log"}]);
		});

		it("Should print message to console.log for trace", async () => {
			await emitter({"level": "trace", "message": "Hello World"});
			expect(logs).toEqual([{"message": "Hello World", "type": "log"}]);
		});
	});
});
