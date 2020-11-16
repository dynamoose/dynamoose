import {GeneralObjectOrValue} from "./types";

export const clearEmpties = <T>(object: GeneralObjectOrValue<T>): GeneralObjectOrValue<T> => {
	Object.keys(object).forEach((key) => {
		if (typeof object[key] !== "object") {
			return;
		}
		clearEmpties(object[key]);
		if (Object.keys(object[key]).length === 0) {
			delete object[key];
		}
	});

	return object;
};

