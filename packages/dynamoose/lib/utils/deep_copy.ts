export default function deep_copy<T> (obj: T, refs = new Set()): T {
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

	if (obj instanceof Function) {
		// This is not technically correct, but required for unit test purposes. We currently have a unit test that passes in a function where it shouldn't. So in order to handle this case we need to do something here. Ideally we would clone the function somehow to create a copy of it. But that is lower priority for now.
		return obj;
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

		for (const attr in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, attr)) {
				const value = obj[attr];
				// Omit true circular references: value is an ancestor on the current recursion path.
				if (value !== null && typeof value === "object" && refs.has(value)) {
					continue;
				}
				copy[attr] = deep_copy(value, refs);
			}
		}
		refs.delete(obj);
		return copy;
	}

	return obj;
}
