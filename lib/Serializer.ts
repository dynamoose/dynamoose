import { ObjectType, ModelType } from "./General";
import { Document } from "./Document";

const defaultSerializer = {
	"modify": (s, o): ObjectType => {
		return {...o};
	}
};

const includeHandler = (document: ModelType<Document>, includeRules: string[], serialized: ObjectType): ObjectType => {
	return includeRules.reduce((serialized: ObjectType, key: string) => {
		if (Object.prototype.hasOwnProperty.call(document, key)) {
			serialized[key] = document[key];
		}

		return serialized;
	}, serialized);
};

const excludeHandler = (document: ModelType<Document>, excludeRules: string[], serialized: ObjectType): ObjectType => {
	return excludeRules.reduce((serialized: ObjectType, key: string) => {
		if (Object.prototype.hasOwnProperty.call(serialized, key)) {
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

const validateOptions = (options): void => {
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
	serializers: any;
	defaultSerializer: string;

	constructor() {
		this.serializers = {_default: defaultSerializer};
		this.defaultSerializer = "_default";
	}

	add(name: string, options): void {
		validateName(name);
		validateOptions(options);
		this.serializers[name] = options;
	}

	setDefault(name: string): void {
		validateName(name);
		if (Object.prototype.hasOwnProperty.call(this.serializers, name)) {
			this.defaultSerializer = name;
		}
	}

	remove(name: string): void {
		validateName(name);
		if (Object.prototype.hasOwnProperty.call(this.serializers, name)) {
			delete this.serializers[name];
		}
		if (this.defaultSerializer === name) {
			this.defaultSerializer = "_default";
		}
	}

	_serializeMany(documentsArray = [], nameOrOptions): ObjectType[] {
		documentsArray = cleanAndValidateDocumentsArray(documentsArray);
		return documentsArray.map((doc) => doc.serialize(nameOrOptions));
	}

	_serialize(document, nameOrOptions = this.defaultSerializer): ObjectType {
		const inputType = typeof nameOrOptions;
		let isArray = Array.isArray(nameOrOptions);
		let options;

		if (inputType === "string") {
			options = this.serializers[nameOrOptions];
		} else if (isArray || inputType === "object") {
			options = nameOrOptions;
		}

		try {
			validateOptions(options);
			isArray = Array.isArray(options);
			if (isArray) {
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
		} catch (error) {
			// Failing quietly and defaulting to dumping the whole object may not be safest idea, lest we expose sensitive data.
			return {};
		}
	}
}
