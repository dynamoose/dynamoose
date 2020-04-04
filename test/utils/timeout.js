const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const {expect} = chai;
const utils = require("../../lib/utils");

describe("Timeout", () => {
	it("Should be a function", () => {
		expect(utils.timeout).to.be.a("function");
	});

	it("Should return promise", () => {
		const myTimeout = utils.timeout(1);
		expect(myTimeout).to.be.a("promise");
	});

	it("Should resolve in x milliseconds", async () => {
		const ms = 10;
		const timeA = Date.now();
		await utils.timeout(ms);
		expect(Date.now() - timeA).to.be.at.least(ms - 1); // Doing -1 here due to https://github.com/nodejs/node/issues/26578
	});

	it("Should reject if invalid number passed in", () => {
		return expect(utils.timeout("test")).to.be.rejected;
	});
});
