const {expect} = require("chai");
const utils = require("../../lib/utils");

describe("Timeout", () => {
	it("Should be a function", () => {
		expect(utils.timeout).to.be.a("function");
	});

	it("Should return promise", () => {
		const myTimeout = utils.timeout(1);
		expect(myTimeout).to.be.a("promise");
	});

	it("Should resolve in x miliseconds", async () => {
		const timeA = Date.now();
		await utils.timeout(100);
		expect(Date.now() - timeA).to.be.at.least(100);
	});

	it("Should reject if invalid number passed in", async () => {
		let error;
		try {
			await utils.timeout("test");
		} catch (e) {
			error = e;
		}

		expect(error).to.exist;
	});
});
