import {Item} from "./Item";
import {ItemArray, CallbackType} from "./General";
import utils from "./utils";
import {DynamoDBTypeResult, DynamoDBSetTypeResult} from "./Schema";
import Internal from "./Internal";
const {internalProperties} = Internal.General;

export interface PopulateSettings {
	properties?: string[] | string | boolean;
}

interface PopulateInternalSettings {
	parentKey?: string;
}

export function PopulateItem (this: Item): Promise<Item>;
export function PopulateItem (this: Item, callback: CallbackType<Item, any>): void;
export function PopulateItem (this: Item, settings: PopulateSettings): Promise<Item>;
export function PopulateItem (this: Item, settings: PopulateSettings, callback: CallbackType<Item, any>): void;
export function PopulateItem (this: Item, settings: PopulateSettings, callback: CallbackType<Item, any> | null, internalSettings?: PopulateInternalSettings): void;
export function PopulateItem (this: Item, settings?: PopulateSettings | CallbackType<Item, any>, callback?: CallbackType<Item, any> | null, internalSettings?: PopulateInternalSettings): Promise<Item> | void {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}
	if (!internalSettings) {
		internalSettings = {};
	}

	const {model} = this.getInternalProperties(internalProperties);
	const localSettings = settings;
	const schema = model.getInternalProperties(internalProperties).schemaForObject(this);
	const isModelType = (detail: DynamoDBTypeResult | DynamoDBSetTypeResult): boolean => detail.name === "Model" || detail.name === "Model Set";
	const modelAttributes: any[] = utils.array_flatten(schema.attributes().map((prop) => ({prop, "details": schema.getAttributeTypeDetails(prop)}))).filter((obj) => Array.isArray(obj.details) ? obj.details.some(isModelType) : isModelType(obj.details)).map((obj) => obj.prop);
	const promise = Promise.all(modelAttributes.map(async (prop) => {
		const typeDetails = schema.getAttributeTypeDetails(prop);

		prop = prop.endsWith(".0") ? prop.substring(0, prop.length - 2) : prop;

		const itemPropValue = utils.object.get(this as any, prop);
		// An attribute with several types is populated by the type its value has: a Set by its Set of models (or its model), any other value by its model.
		const findType = (name: string): DynamoDBTypeResult | DynamoDBSetTypeResult => (typeDetails as any[]).find((detail) => detail.name === name);
		const typeDetail: DynamoDBTypeResult | DynamoDBSetTypeResult = Array.isArray(typeDetails) ? itemPropValue instanceof Set && findType("Model Set") || findType("Model") : typeDetails;
		if (!typeDetail) {
			return;
		}
		const {typeSettings} = typeDetail;
		const subModel: any = typeof typeSettings.model === "object" ? model.Item : typeSettings.model;

		const doesPopulatePropertyExist = !(typeof itemPropValue === "undefined" || itemPropValue === null);
		if (!doesPopulatePropertyExist || itemPropValue instanceof subModel) {
			return;
		}
		const key: string = [internalSettings.parentKey, prop].filter((a) => Boolean(a)).join(".");
		const populatePropertiesExists: boolean = typeof localSettings?.properties !== "undefined" && localSettings.properties !== null;
		const populateProperties: boolean | string[] = Array.isArray(localSettings?.properties) || typeof localSettings?.properties === "boolean" ? localSettings.properties : [localSettings?.properties];
		const isPopulatePropertyInSettingProperties: boolean = populatePropertiesExists ? utils.dynamoose.wildcard_allowed_check(populateProperties, key) : true;
		if (!isPopulatePropertyInSettingProperties) {
			return;
		}

		const isArray = Array.isArray(itemPropValue);
		const isSet = itemPropValue instanceof Set;
		// A referenced item that doesn't exist is left out of a list, and a single reference to one becomes undefined, as `Model.batchGet` and `Model.get` do.
		if (isArray || isSet) {
			const subItems = (await Promise.all([...itemPropValue as any].map((val) => subModel.get(val)))).filter((doc) => doc !== undefined);
			const saveItems = await Promise.all(subItems.map((doc) => PopulateItem.bind(doc)(localSettings, null, {"parentKey": key})));
			utils.object.set(this as any, prop, saveItems);
		} else {
			const subItem = await subModel.get(itemPropValue);
			const saveItem: Item = subItem === undefined ? undefined : await PopulateItem.bind(subItem)(localSettings, null, {"parentKey": key});
			utils.object.set(this as any, prop, saveItem);
		}
	}));

	if (callback) {
		promise.then(() => callback(null, this)).catch((err) => callback(err));
	} else {
		return (async (): Promise<Item> => {
			await promise;
			return this;
		})();
	}
}

export function PopulateItems (this: ItemArray<Item>): Promise<ItemArray<Item>>;
export function PopulateItems (this: ItemArray<Item>, callback: CallbackType<ItemArray<Item>, any>): void;
export function PopulateItems (this: ItemArray<Item>, settings: PopulateSettings): Promise<ItemArray<Item>>;
export function PopulateItems (this: ItemArray<Item>, settings: PopulateSettings, callback: CallbackType<ItemArray<Item>, any>): void;
export function PopulateItems (this: ItemArray<Item>, settings?: PopulateSettings | CallbackType<ItemArray<Item>, any>, callback?: CallbackType<ItemArray<Item>, any>): Promise<ItemArray<Item>> | void {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const promise = Promise.all(this.map(async (item, index) => {
		this[index] = await PopulateItem.bind(item)(settings);
	}));

	if (callback) {
		promise.then(() => callback(null, this)).catch((err) => callback(err));
	} else {
		return (async (): Promise<ItemArray<Item>> => {
			await promise;
			return this;
		})();
	}
}
