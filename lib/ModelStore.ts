import CustomError from "./Error";
import Model from "./Model";

let models: {[name: string]: Model} = {};

const returnObject = (input: Model | string): Model | never => {
	if (input instanceof Model) {
		models[input.name] = input;
		return input;
	} else if (typeof input === "string") {
		return models[input];
	} else {
		throw new CustomError.InvalidParameter("You must pass in a Model or table name as a string.");
	}
};
returnObject.clear = (): void => {
	models = {};
};

export = returnObject;
