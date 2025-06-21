export default function deep_copy<T> (obj: T, refs = new Set()): T {
	// Fast path for null, undefined, primitives
	if (obj === null || obj === undefined || typeof obj !== "object") {
		return obj;
	}

	let copy: any;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = obj.map((i) => deep_copy(i, refs));
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

	// Handle Buffer
	if (obj instanceof Buffer) {
		copy = Buffer.from(obj);
		return copy;
	}

	// Handle Uint8Array
	if (obj instanceof Uint8Array) {
		copy = new Uint8Array(obj);
		return copy;
	}

	if (obj instanceof Function) {
		// This is not technically correct, but required for unit test purposes. We currently have a unit test that passes in a function where it shouldn't. So in order to handle this case we need to do something here. Ideally we would clone the function somehow to create a copy of it. But that is lower priority for now.
		return obj;
	}

	// Handle Object
	if (obj instanceof Object) {
		refs.add(obj);

		// Fast path for plain objects (most common case in Model.update)
		if (obj.constructor === Object) {
			copy = {};
			const keys = Object.keys(obj);
			for (let i = 0; i < keys.length; i++) {
				const attr = keys[i];
				const value = obj[attr];
				const isObjValue = typeof value === "object" && !Array.isArray(value) && value !== null;

				if (isObjValue) {
					const isCircular = refs.has(value);
					// Omit circular property from copy
					if (isCircular) continue;

					refs.add(value);
				}

				copy[attr] = deep_copy(value, refs);
			}
		} else {
			// Slower path for objects with non-Object constructors
			copy = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);

			for (const attr in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, attr)) {
					const value = obj[attr];
					const isObjValue = typeof value === "object" && !Array.isArray(value) && value !== null;

					if (isObjValue) {
						const isCircular = refs.has(value);
						// Omit circular property from copy
						if (isCircular) continue;

						refs.add(value);
					}

					copy[attr] = deep_copy(value, refs);
				}
			}
		}
		return copy;
	}

	return obj;
}
