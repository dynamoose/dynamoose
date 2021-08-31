export default function deep_copy<T> (obj: T): T {
	let copy: any;

	// Handle the 3 simple types, and null or undefined
	if (obj == null || typeof obj !== "object") return obj;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = [];
		for (let i = 0, len = obj.length; i < len; i++) {
			copy[i] = deep_copy(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (const attr in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, attr)) copy[attr] = deep_copy(obj[attr]);
		}
		return copy;
	}

	return obj;
}
