import {GeneralObject, GeneralObjectOrValue} from "./types";

export = <T>(object: GeneralObject<T>, key: string, value: any): GeneralObject<T> => {
	const keyParts = key.split(".");
	let objectRef: GeneralObjectOrValue<T> = object;
	keyParts.forEach((part: string | number, index: number) => {
		if (keyParts.length - 1 === index) {
			return;
		}

		if (!objectRef[part]) {
			objectRef[part] = {};
		}

		objectRef = objectRef[part];
	});

	const finalKey: string = keyParts[keyParts.length - 1];
	if (finalKey !== "__proto__" && finalKey !== "constructor") {
		objectRef[finalKey] = value;
	}

	return object;
};
