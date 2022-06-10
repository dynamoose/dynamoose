const utils = require("../../dist/utils").default;

describe("async_reduce", () => {
	it("Should reduce correctly for non async function", () => {
		expect(utils.async_reduce([1, 2, 3], (acc, val) => acc + val, 0)).resolves.toEqual(6);
	});

	it("Should reduce correctly for async function", () => {
		expect(utils.async_reduce([1, 2, 3], async (acc, val) => acc + val, 0)).resolves.toEqual(6);
	});
});
