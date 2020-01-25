const get = require("./get");

const main = module.exports = (object, existingKey = "") => {
	return Object.keys(object).reduce((accumulator, key) => {
		const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
		accumulator.push(keyWithExisting);

		if (typeof get(object, keyWithExisting) === "object") {
			accumulator.push(...main(get(object, keyWithExisting), keyWithExisting));
		}

		return accumulator;
	}, []);
};
