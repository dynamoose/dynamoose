import {GeneralObject, GeneralObjectOrValue} from "./types";

export = <T>(object: GeneralObject<T>, key: string): GeneralObjectOrValue<T> => {
	const keyParts = key.split(".");
	let returnValue: GeneralObjectOrValue<T> = object;
	for (let i = 0; i < keyParts.length; i++) {
		const part = keyParts[i];
		if (returnValue) {
			returnValue = returnValue[part];
		} else {
			break;
		}
	}
	return returnValue;
};
