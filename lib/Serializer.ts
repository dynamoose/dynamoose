import { ObjectType, ModelType } from "./General";
import { Document } from "./Document";
import CustomError = require("./Error");
import utils = require("./utils");

export interface SerializerOptions {
	include?: string[];
	exclude?: string[];
	modify?: (serialized: ObjectType, original: ObjectType) => ObjectType;
}

const validateName = (name: string): void => {
	if (!name || typeof name !== "string") {
		throw new CustomError.InvalidParameter("Field name is required and should be of type string");
	}
};

const validateOptions = (options: SerializerOptions): void => {
	if (!options || !(Array.isArray(options) || typeof options === "object")) {
		throw new CustomError.InvalidParameter("Field options is required and should be an object or array");
	}
};

export class Serializer {
	#serializers: {[key: string]: SerializerOptions};
	#defaultSerializer: string;

	constructor() {
		this.#serializers = {
			"_default": {
				"modify": (serialized: ObjectType, original: ObjectType): ObjectType => ({...original})
			}
		};
		this.#defaultSerializer = "_default";
	}

	add(name: string, options: SerializerOptions): void {
		validateName(name);
		validateOptions(options);

		this.#serializers[name] = options;
	}

	setDefault(name: string): void {
		validateName(name);

		if (Object.keys(this.#serializers).includes(name)) {
			this.#defaultSerializer = name;
		}
	}

	remove(name: string): void {
		validateName(name);

		// Removing serializer
		if (Object.keys(this.#serializers).includes(name)) {
			delete this.#serializers[name];
		}

		// Reset defaultSerializer to default if removing default serializer
		if (this.#defaultSerializer === name) {
			this.setDefault("_default");
		}
	}

	_serializeMany(documentsArray: ModelType<Document>[], nameOrOptions: SerializerOptions | string): ObjectType[] {
		if (!documentsArray || !Array.isArray(documentsArray)) {
			throw new CustomError.InvalidParameter("documentsArray must be an array of document objects");
		}

		return documentsArray.map((document) => {
			try {
				return document.serialize(nameOrOptions);
			} catch (e) {
				return this._serialize(document, nameOrOptions);
			}
		});
	}

	_serialize(document: ObjectType, nameOrOptions: SerializerOptions | string = this.#defaultSerializer): ObjectType {
		let options: SerializerOptions;

		if (typeof nameOrOptions === "string") {
			options = this.#serializers[nameOrOptions];
		} else {
			options = nameOrOptions;
		}

		validateOptions(options);

		if (Array.isArray(options)) {
			return utils.object.pick(document, options);
		}

		let serialized: ObjectType = {};
		if (options.include) {
			serialized = utils.object.pick(document, options.include);
		}
		if (options.exclude) {
			if (!options.include) {
				serialized = {...document};
			}
			serialized = utils.object.delete(serialized, options.exclude);
		}
		if (options.modify && typeof options.modify === "function") {
			if (!options.include && !options.exclude) {
				serialized = {...document};
			}
			serialized = options.modify(serialized, document);
		}
		return serialized;
	}
}
