import utils from "..";
import {ModelType} from "../../General";
import {AnyItem, Item} from "../../Item";
import {Model} from "../../Model";

export default <T extends Item = AnyItem>(model: Model<T>): ModelType<T> => {
	const returnObject: any = model.Item;
	const keys = utils.array_flatten([
		Object.keys(model),
		Object.keys(Object.getPrototypeOf(model)),
		Object.getOwnPropertyNames(Object.getPrototypeOf(model))
	]).filter((key) => !["constructor", "name"].includes(key));
	keys.forEach((key) => {
		if (typeof model[key] === "object") {
			const main = (key: string): void => {
				utils.object.set(returnObject, key, {});
				const value = utils.object.get(model as any, key);
				if (value === null || value.constructor !== Object && value.constructor !== Array) {
					utils.object.set(returnObject, key, value);
				} else {
					Object.keys(value).forEach((subKey): void => {
						const newKey = `${key}.${subKey}`;
						const subValue: any = utils.object.get(model as any, newKey);
						if (typeof subValue === "object") {
							main(newKey);
						} else {
							utils.object.set(returnObject, newKey, subValue.bind(model));
						}
					});
				}
			};
			main(key);
		} else {
			returnObject[key] = model[key].bind(model);
		}
	});

	Object.defineProperty(returnObject, "name", {
		"configurable": false,
		"value": returnObject.Model.name
	});

	return returnObject as any;
};
