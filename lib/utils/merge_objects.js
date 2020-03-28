// This function is used to merge objects for combining multiple responses.
module.exports = (...args) => {
	let returnObject;

	args.forEach((arg, index) => {
		if (typeof arg !== "object") {
			throw new Error("You can only pass objects into merge_objects method.");
		}

		if (index === 0) {
			returnObject = arg;
		} else {
			if (Array.isArray(returnObject) !== Array.isArray(arg)) {
				throw new Error("You can't mix value types for the merge_objects method.");
			}

			Object.keys(arg).forEach((key) => {
				if (typeof returnObject[key] === "object" && typeof arg[key] === "object" && !Array.isArray(returnObject[key]) && !Array.isArray(arg[key]) && returnObject[key] !== null) {
					returnObject[key] = [returnObject[key], arg[key]];
				} else if (Array.isArray(returnObject[key]) && Array.isArray(arg[key])) {
					returnObject[key] = [...returnObject[key], ...arg[key]];
				} else if (Array.isArray(returnObject[key])) {
					returnObject[key] = [...returnObject[key], arg[key]];
				} else {
					returnObject[key] += arg[key];
				}
			});
		}
	});

	return returnObject;
};
