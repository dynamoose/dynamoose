/**
 * This function returns one string for each number value, exactly, so two DynamoDB numbers give the same string only when DynamoDB treats them as the same number. `"1.50"`, `"15e-1"` and `"1.5"` give the same string, while two numbers above 2^53 that `Number` would make equal stay apart.
 *
 * @example
 * normalize_number("1.50") === normalize_number("15e-1"); // true
 * normalize_number("9007199254740992") === normalize_number("9007199254740993"); // false
 *
 * @param number A number as a string, as DynamoDB stores it (`N`).
 * @returns The digits without leading or trailing zeros and the power of ten, such as `"15e-1"`, or `"0"`. A string that isn't a number is returned as it is.
 * @private
 */
export default (number: string): string => {
	const match = (/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/u).exec(number);
	if (!match) {
		return number;
	}
	const [, sign, integer, fraction = "", exponent = "0"] = match;
	const digits = `${integer}${fraction}`.replace(/^0+/u, "");
	const significant = digits.replace(/0+$/u, "");
	if (significant === "") {
		return "0";
	}
	const power = parseInt(exponent) - fraction.length + digits.length - significant.length;
	return `${sign === "-" ? "-" : ""}${significant}e${power}`;
};
