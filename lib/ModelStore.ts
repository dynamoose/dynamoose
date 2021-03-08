import CustomError = require("./Error");
import {Model} from "./Model";
import {Document} from "./Document";

let aliases: {[name: string]: string} = {};
let models: {[name: string]: Model<Document>} = {};

const returnObject = <T extends Document>(input: Model<T> | string): Model<T> | never => {
	if (input instanceof Model) {
		models[input.originalName] = input;
		aliases[input.name] = input.originalName;
		return input;
	} else if (typeof input === "string") {
		const alias = aliases[input];
		const result = models[input] || models[alias];
		return result as Model<T>;
	} else {
		throw new CustomError.InvalidParameter("You must pass in a Model or table name as a string.");
	}
};
returnObject.clear = (): void => {
	models = {};
};

export = returnObject;
