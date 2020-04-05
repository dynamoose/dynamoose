const get = require("./get");
const set = require("./set");

module.exports = (object, keys) => {
	return keys.reduce((obj, key) => {
		const value = get(object, key);
		const isValueUndefined = typeof value === "undefined" || value === null;
		if (!isValueUndefined) {
			set(obj, key, value);
		}
		return obj;
	}, {});
};
