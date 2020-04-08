import get from "./get";
import set from "./set";

export = (object: object, keys: any[]): object => {
	return keys.reduce((obj, key) => {
		const value = get(object, key);
		const isValueUndefined = typeof value === "undefined" || value === null;
		if (!isValueUndefined) {
			set(obj, key, value);
		}
		return obj;
	}, {});
};
