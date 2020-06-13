import {ObjectType, ModelType} from "./General";
import {Document} from "./Document";
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

	_serializeMany (documentsArray: ModelType<Document>[], nameOrOptions: SerializerOptions | string): ObjectType[] {
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

	_serialize (document: ObjectType, nameOrOptions: SerializerOptions | string = this.#defaultSerializer): ObjectType {
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
			return utils.object.pick(document, options);
		}

		return [
			{
				"if": Boolean(options.include),
				"function": (): ObjectType => utils.object.pick(document, options.include)
			},
			{
				"if": Boolean(options.exclude),
				"function": (serialized: ObjectType): ObjectType => utils.object.delete(serialized, options.exclude)
			},
			{
				"if": Boolean(options.modify),
				"function": (serialized: ObjectType): ObjectType => options.modify(serialized, document)
			}
		].filter((item) => item.if).reduce((serialized: ObjectType, item) => item.function(serialized), {...document});
	}
}
