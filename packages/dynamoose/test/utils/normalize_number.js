const utils = require("../../dist/utils").default;

describe("normalize_number", () => {
	it("Should be a function", () => {
		expect(utils.normalize_number).toBeInstanceOf(Function);
	});

	const sameValue = [
		["1.5", "1.50", "15e-1", "+1.5", "0.15E1"],
		["1000", "1e3", "1000.0", "1E+3", "01000"],
		["0", "-0", "0.000", "0e5", ".0"],
		["0.5", ".5", "5e-1"],
		["5", "5."],
		["-42", "-42.00", "-4.2e1"]
	];
	sameValue.forEach((group) => {
		it(`Should give ${group.join(", ")} the same string`, () => {
			expect(new Set(group.map(utils.normalize_number)).size).toEqual(1);
		});
	});

	const differentValues = [
		["9007199254740992", "9007199254740993"],
		["1", "-1"],
		["1.5", "15"],
		["123456789012345678901234567890", "123456789012345678901234567891"]
	];
	differentValues.forEach(([a, b]) => {
		it(`Should give ${a} and ${b} different strings`, () => {
			expect(utils.normalize_number(a)).not.toEqual(utils.normalize_number(b));
		});
	});

	it("Should leave a string that isn't a number as it is", () => {
		expect(utils.normalize_number("Infinity")).toEqual("Infinity");
	});
});
