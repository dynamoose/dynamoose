const Error = require("./Error");
let models = {};

module.exports = (input) => {
	const Model = require("./Model");
	if (input instanceof Model) {
		models[input.name] = input;
	} else if (typeof input === "string") {
		return models[input];
	} else {
		throw new Error.InvalidParameter("You must pass in a Model or table name as a string.");
	}
};
module.exports.clear = () => {
	models = {};
};
