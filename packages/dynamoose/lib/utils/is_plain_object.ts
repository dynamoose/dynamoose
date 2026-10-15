// This function is used to determine if a value is a plain object, as opposed to a value that is `typeof "object"` but represents a single value to DynamoDB (arrays, Sets, Dates, Buffers, class instances).
export default (val: any): boolean => {
	if (val === null || val === undefined || typeof val !== "object") {
		return false;
	}
	// `Buffer` is a subclass of `Uint8Array`, so the typed array check covers it as well.
	if (Array.isArray(val) || val instanceof Set || val instanceof Date || val instanceof Uint8Array) {
		return false;
	}
	return val.constructor === undefined || val.constructor === Object;
};
