import get = require("./get");
import set = require("./set");
import {GeneralObject} from "./types";

export = <T>(object: GeneralObject<T>, keys: string[]): GeneralObject<T> => {
	return keys.reduce((obj, key) => {
		const value = get(object, key);
		const isValueUndefined = typeof value === "undefined" || value === null;
		if (!isValueUndefined) {
			set(obj, key, value);
		}
		return obj;
	}, {});
};
