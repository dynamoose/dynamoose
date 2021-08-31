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

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (const attr in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, attr)) {
				copy[attr] = deep_copy(obj[attr]);
			}
		}
		return copy;
	}

	return obj;
}
