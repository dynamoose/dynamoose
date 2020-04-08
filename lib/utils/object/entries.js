const main = module.exports = (object, existingKey = "") => {
	return Object.entries(object).reduce((accumulator, entry) => {
		const [key, value] = entry;
		const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
		accumulator.push([keyWithExisting, value]);

		if (typeof value === "object" && !(value instanceof Buffer) && value !== null) {
			accumulator.push(...main(value, keyWithExisting));
		}

		return accumulator;
	}, []);
};
