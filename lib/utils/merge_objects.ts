// This function is used to merge objects for combining multiple responses.

enum MergeObjectsCombineMethod {
	ObjectCombine = "object_combine",
	ArrayMerge = "array_merge"
}

interface MergeObjectsSettings {
	combineMethod: MergeObjectsCombineMethod;
}

import {GeneralObject} from "./object/types";

const main = (settings: MergeObjectsSettings = {combineMethod: MergeObjectsCombineMethod.ArrayMerge}) => <T>(...args: GeneralObject<T>[]): GeneralObject<T> => {
	let returnObject: { [x: string]: any };

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
					if (settings.combineMethod === MergeObjectsCombineMethod.ObjectCombine) {
						returnObject[key] = {...returnObject[key], ...arg[key]};
					} else {
						returnObject[key] = [returnObject[key], arg[key]];
					}
				} else if (Array.isArray(returnObject[key]) && Array.isArray(arg[key])) {
					returnObject[key] = [...returnObject[key], ...(arg[key] as any)];
				} else if (Array.isArray(returnObject[key])) {
					returnObject[key] = [...returnObject[key], arg[key]];
				} else if (returnObject[key]) {
					returnObject[key] += arg[key];
				} else {
					returnObject[key] = arg[key];
				}
			});
		}
	});

	return returnObject;
};

const returnObject: any = main();
returnObject.main = main;

export = returnObject;
