const utils = require("../../dist/utils");

describe("childKey", () => {
	const tests = [
		["hello.world", "world"],
		["hello.world.universe", "universe"]
	];

	test.concurrent.each(tests)("childKey(%s) = %s", (input, expected) => {
		expect(utils.childKey(input)).toEqual(expected);
	});
});
