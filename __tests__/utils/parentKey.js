const utils = require("../../dist/utils").default;

describe("parentKey", () => {
	const tests = [
		["hello.world", "hello"],
		["hello.world.universe", "hello.world"]
	];

	test.concurrent.each(tests)("parentKey(%s) = %s", (input, expected) => {
		expect(utils.parentKey(input)).toEqual(expected);
	});
});
