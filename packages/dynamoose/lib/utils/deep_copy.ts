export default function deep_copy<T> (obj: T, refs = new Set()): T {
	// Fast path for null, undefined and every non-object. A function lands here too (`typeof` is
	// "function"), and is returned as it is, as before: a unit test passes one in.
	if (obj === null || obj === undefined || typeof obj !== "object") {
		return obj;
	}

	let copy: any;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date(obj.getTime());
		return copy;
	}

	// Handle Buffer (must be before Uint8Array since Buffer extends Uint8Array)
	if (obj instanceof Buffer) {
		copy = Buffer.from(obj);
		return copy;
	}

	// Handle Uint8Array
	if (obj instanceof Uint8Array) {
		copy = new Uint8Array(obj);
		return copy;
	}

	// Handle Set
	if (obj instanceof Set) {
		copy = new Set(obj);
		return copy;
	}

	// Handle Map
	if (obj instanceof Map) {
		copy = new Map(obj);
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		refs.add(obj);
		copy = obj.map((item) => item !== null && typeof item === "object" && refs.has(item) ? undefined : deep_copy(item, refs));
		refs.delete(obj);
		return copy;
	}

	// Handle Object (plain object or class instance)
	if (obj instanceof Object) {
		refs.add(obj);
		copy = obj.constructor !== Object ? Object.create(Object.getPrototypeOf(obj)) : {};

		// Object.keys lists the same own enumerable keys as for...in with hasOwnProperty, faster
		const keys = Object.keys(obj);
		for (let i = 0; i < keys.length; i++) {
			const attr = keys[i];
			const value = obj[attr];
			// Omit true circular references: value is an ancestor on the current recursion path.
			if (value !== null && typeof value === "object" && refs.has(value)) {
				continue;
			}
			copy[attr] = deep_copy(value, refs);
		}
		refs.delete(obj);
		return copy;
	}

	return obj;
}
