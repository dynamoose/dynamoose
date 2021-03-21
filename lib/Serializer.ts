import {ObjectType, ModelType} from "./General";
import {Item} from "./Item";
import CustomError = require("./Error");
import utils = require("./utils");

export interface SerializerOptions {
	include?: string[];
	exclude?: string[];
	modify?: (serialized: ObjectType, original: ObjectType) => ObjectType;
}

export class Serializer {
	#serializers: {[key: string]: SerializerOptions};
	#defaultSerializer: string;

	static defaultName = "_default";

	constructor () {
		this.#serializers = {
			[Serializer.defaultName]: {
				"modify": (serialized: ObjectType, original: ObjectType): ObjectType => ({...original})
			}
		};
		this.default.set();
	}

	add (name: string, options: SerializerOptions): void {
		if (!name || typeof name !== "string") {
			throw new CustomError.InvalidParameter("Field name is required and should be of type string");
		}
		if (!options || !(Array.isArray(options) || typeof options === "object")) {
			throw new CustomError.InvalidParameter("Field options is required and should be an object or array");
		}

		this.#serializers[name] = options;
	}

	default = {
		"set": (name?: string): void => {
			if (typeof name === "undefined" || name === null) {
				name = Serializer.defaultName;
			}

			if (!name || typeof name !== "string") {
				throw new CustomError.InvalidParameter("Field name is required and should be of type string");
			}

			if (Object.keys(this.#serializers).includes(name)) {
				this.#defaultSerializer = name;
			}
		}
	};

	delete (name: string): void {
		if (!name || typeof name !== "string") {
			throw new CustomError.InvalidParameter("Field name is required and should be of type string");
		}
		if (name === Serializer.defaultName) {
			throw new CustomError.InvalidParameter("Can not delete primary default serializer");
		}

		// Removing serializer
		if (Object.keys(this.#serializers).includes(name)) {
			delete this.#serializers[name];
		}

		// Reset defaultSerializer to default if removing default serializer
		if (this.#defaultSerializer === name) {
			this.default.set();
		}
	}

	_serializeMany (itemsArray: ModelType<Item>[], nameOrOptions: SerializerOptions | string): ObjectType[] {
		if (!itemsArray || !Array.isArray(itemsArray)) {
			throw new CustomError.InvalidParameter("itemsArray must be an array of item objects");
		}

		return itemsArray.map((item) => {
			try {
				return item.serialize(nameOrOptions);
			} catch (e) {
				return this._serialize(item, nameOrOptions);
			}
		});
	}

	_serialize (item: ObjectType, nameOrOptions: SerializerOptions | string = this.#defaultSerializer): ObjectType {
		let options: SerializerOptions;

		if (typeof nameOrOptions === "string") {
			options = this.#serializers[nameOrOptions];
		} else {
			options = nameOrOptions;
		}

		if (!options || !(Array.isArray(options) || typeof options === "object")) {
			throw new CustomError.InvalidParameter("Field options is required and should be an object or array");
		}

		if (Array.isArray(options)) {
			return utils.object.pick(item, options);
		}

		return [
			{
				"if": Boolean(options.include),
				"function": (): ObjectType => utils.object.pick(item, options.include)
			},
			{
				"if": Boolean(options.exclude),
				"function": (serialized: ObjectType): ObjectType => utils.object.delete(serialized, options.exclude)
			},
			{
				"if": Boolean(options.modify),
				"function": (serialized: ObjectType): ObjectType => options.modify(serialized, item)
			}
		].filter((item) => item.if).reduce((serialized: ObjectType, item) => item.function(serialized), {...item});
	}
}
