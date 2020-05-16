import { ObjectType, ModelType } from "./General";
import { Document } from "./Document";

interface SerializerOptions {
	include?: string[];
	exclude?: string[];
	modify?: (serialized: ObjectType, original: ObjectType) => ObjectType;
}

const defaultSerializer: SerializerOptions = {
	"modify": (serialized: ObjectType, original: ObjectType): ObjectType => ({...original})
};

const includeHandler = (document: ObjectType, includeRules: string[], serialized: ObjectType): ObjectType => {
	return includeRules.reduce((serialized: ObjectType, key: string) => {
		if (Object.keys(document).includes(key)) {
			serialized[key] = document[key];
		}

		return serialized;
	}, serialized);
};

const excludeHandler = (document: ObjectType, excludeRules: string[], serialized: ObjectType): ObjectType => {
	return excludeRules.reduce((serialized: ObjectType, key: string) => {
		if (Object.keys(serialized).includes(key)) {
			delete serialized[key];
		}

		return serialized;
	}, serialized);
};

const validateName = (name: string): void => {
	if (!name || typeof name !== "string") {
		throw new Error("Field name is required and should be of type string");
	}
};

const validateOptions = (options: SerializerOptions): void => {
	if (!options || !(Array.isArray(options) || typeof options === "object")) {
		throw new Error("Field options is required and should be an object or array");
	}
};

const cleanAndValidateDocumentsArray = (documentsArray: ModelType<Document>[]): ModelType<Document>[] => {
	if (!documentsArray || !Array.isArray(documentsArray)) {
		throw new Error("documentsArray must be an array of document objects");
	}

	return documentsArray.filter((doc) => typeof doc.serialize === "function");
};

export class Serializer {
	#serializers: {[key: string]: SerializerOptions};
	#defaultSerializer: string;

	constructor() {
		this.#serializers = {
			"_default": defaultSerializer
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
		if (Object.keys(this.#serializers).includes(name)) {
			delete this.#serializers[name];
		}
		if (this.#defaultSerializer === name) {
			this.#defaultSerializer = "_default";
		}
	}

	_serializeMany(documentsArray: ModelType<Document>[] = [], nameOrOptions: SerializerOptions | string): ObjectType[] {
		documentsArray = cleanAndValidateDocumentsArray(documentsArray);
		return documentsArray.map((doc) => doc.serialize(nameOrOptions));
	}

	_serialize(document: ObjectType, nameOrOptions: SerializerOptions | string = this.#defaultSerializer): ObjectType {
		let options: SerializerOptions;

		if (typeof nameOrOptions === "string") {
			options = this.#serializers[nameOrOptions];
		} else if (Array.isArray(nameOrOptions) || typeof nameOrOptions === "object") {
			options = nameOrOptions;
		}

		validateOptions(options);

		if (Array.isArray(options)) {
			return includeHandler(document, options, {});
		}

		let serialized: ObjectType = {};
		if (options.include) {
			serialized = includeHandler(document, options.include, serialized);
		}
		if (options.exclude) {
			if (!options.include) {
				serialized = {...document};
			}
			serialized = excludeHandler(document, options.exclude, serialized);
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
