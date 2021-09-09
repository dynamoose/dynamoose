export default function deep_copy<T> (obj: T): T {
	let copy: any;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = obj.map((i) => deep_copy(i));
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

	// Handle Object
	if (obj instanceof Object) {
		if (obj.constructor !== Object) {
			copy = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
		} else {
			copy = {};
		}
		for (const attr in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, attr)) {
				copy[attr] = deep_copy(obj[attr]);
			}
		}
		return copy;
	}

	return obj;
}
