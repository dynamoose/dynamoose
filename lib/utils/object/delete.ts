import {GeneralObjectOrValue} from "./types";

export = <T>(object: GeneralObjectOrValue<T>, key: string): GeneralObjectOrValue<T> => {
	const keys = key.split(".");

	if (keys.length === 1) {
		if (Array.isArray(object)) {
			object.splice(parseInt(keys[0]), 1);
		} else {
			delete object[keys[0]];
		}
	} else {
		const lastKey = keys.pop();
		const nextLastKey = keys.pop();
		const nextLastObj = keys.reduce((a, key) => a[key], object);

		if (Array.isArray(nextLastObj[nextLastKey])) {
			nextLastObj[nextLastKey].splice(parseInt(lastKey), 1);
		} else if (typeof nextLastObj[nextLastKey] !== "undefined" && nextLastObj[nextLastKey] !== null) {
			delete nextLastObj[nextLastKey][lastKey];
		}
	}

	return object;
};
