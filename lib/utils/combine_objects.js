// This function is used to merge objects for combining multiple responses.
const main = module.exports = (...args) => {
	let returnObject;

	args.forEach((arg, index) => {
		if (typeof arg !== "object") {
			throw new Error("You can only pass objects into combine_objects method.");
		}

		if (index === 0) {
			returnObject = arg;
		} else {
			if (Array.isArray(returnObject) !== Array.isArray(arg)) {
				throw new Error("You can't mix value types for the combine_objects method.");
			}

			if (Array.isArray(arg)) {
				returnObject = [...returnObject, ...arg];
			} else {
				Object.keys(arg).forEach((key) => {
					if (typeof returnObject[key] === "object" && typeof arg[key] === "object" && returnObject[key] !== null) {
						returnObject[key] = main(returnObject[key], arg[key]);
					} else if (!Object.prototype.hasOwnProperty.call(returnObject, key)) {
						returnObject[key] = arg[key];
					}
				});
			}
		}
	});

	return returnObject;
};
