const setTypes = ["SS", "NS", "BS"];

// Each element of `a` uses up one equal element of `b`, so `["x", "x"]` doesn't equal `["x", "y"]`.
const setsEqual = (a: any[], b: any): boolean => {
	if (!Array.isArray(b) || a.length !== b.length) {
		return false;
	}
	const remaining = [...b];
	return a.every((item) => {
		const index = remaining.findIndex((other) => attribute_values_equal(item, other));
		if (index === -1) {
			return false;
		}
		remaining.splice(index, 1);
		return true;
	});
};

/**
 * Compares two DynamoDB attribute values by content. DynamoDB doesn't order a map's keys or a set's (`SS`, `NS`, `BS`) elements, so those can be in any order; a list (`L`) keeps its order. Binary values compare by their bytes.
 * @param a The first attribute value.
 * @param b The second attribute value.
 * @returns Whether both values hold the same data.
 */
const attribute_values_equal = (a: any, b: any): boolean => {
	if (a instanceof Uint8Array || b instanceof Uint8Array) {
		return a instanceof Uint8Array && b instanceof Uint8Array && Buffer.compare(a, b) === 0;
	}
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return a === b;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => attribute_values_equal(item, b[index]));
	}
	const keys = Object.keys(a);
	// A set type's value is a list, which a map attribute named "SS" (`{"M": {"SS": {"S": "x"}}}`) never holds.
	return keys.length === Object.keys(b).length && keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && (setTypes.includes(key) && Array.isArray(a[key]) ? setsEqual(a[key], b[key]) : attribute_values_equal(a[key], b[key])));
};

export default attribute_values_equal;
