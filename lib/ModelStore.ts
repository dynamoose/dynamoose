import CustomError = require("./Error");
import {Model} from "./Model";
import {Document} from "./Document";

let models: {[name: string]: Model<Document>} = {};

const returnObject = (input: Model<Document> | string): Model<Document> | never => {
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
