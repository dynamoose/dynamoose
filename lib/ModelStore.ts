import CustomError = require("./Error");
import {Model} from "./Model";
import {Document} from "./Document";

let models: {[name: string]: Model<Document>} = {};

const returnObject = <T extends Document>(input: Model<T> | string): Model<T> | never => {
	if (input instanceof Model) {
		models[input.name] = input;
		return input;
	} else if (typeof input === "string") {
		return models[input] as Model<T>;
	} else {
		throw new CustomError.InvalidParameter("You must pass in a Model or table name as a string.");
	}
};
returnObject.clear = (): void => {
	models = {};
};

export = returnObject;
