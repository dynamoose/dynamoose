const utils = require("../../dist/utils").default;

describe("Timeout", () => {
	it("Should be a function", () => {
		expect(utils.timeout).toBeInstanceOf(Function);
	});

	it("Should return promise", () => {
		const myTimeout = utils.timeout(1);
		expect(myTimeout).toBeInstanceOf(Promise);
	});

	it("Should resolve in x milliseconds", async () => {
		const ms = 10;
		const timeA = Date.now();
		await utils.timeout(ms);
		expect(Date.now() - timeA).toBeGreaterThanOrEqual(ms - 1); // Doing -1 here due to https://github.com/nodejs/node/issues/26578
	});

	it("Should reject if invalid number passed in", () => {
		return expect(utils.timeout("test")).rejects.toEqual("Invalid milliseconds passed in: test");
	});
});
