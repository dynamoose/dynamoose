const utils = require("./utils");

const model = (...args) => {
	const Model = require("./Model");
	const model = new Model(...args);
	const returnObject = model.Document;
	Object.keys(model).forEach((key) => {
		returnObject[key] = model[key];
	});

	Object.keys(Object.getPrototypeOf(model)).forEach((key) => {
		if (model[key].carrier) {
			const carrier = model[key].carrier(model);
			returnObject[key] = (...args) => new carrier(...args);
			returnObject[key].carrier = carrier;
		} else if (typeof model[key] === "object") {
			const main = (key) => {
				utils.object.set(returnObject, key, {});
				Object.keys(utils.object.get(model, key)).forEach((subKey) => {
					const newKey = `${key}.${subKey}`;
					if (typeof utils.object.get(model, newKey) === "object") {
						main(newKey);
					} else {
						utils.object.set(returnObject, newKey, utils.object.get(model, newKey).bind(model));
					}
				});
			};
			main(key);
		} else {
			returnObject[key] = model[key].bind(model);
		}
	});
	return returnObject;
};
model.defaults = {
	...require("./Model/defaults").custom
};

module.exports = {
	"model": model,
	"Schema": require("./Schema"),
	"Condition": require("./Condition"),
	"transaction": require("./Transaction"),
	"aws": require("./aws"),
	"undefined": Symbol("dynamoose.undefined")
};
