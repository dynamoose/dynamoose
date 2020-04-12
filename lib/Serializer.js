class Serializer {
	constructor() {
		this._serializers = {_default: {modify: (s, o) => ({...o})}};
		this._defaultSerializer = "_default";
	}

	add(name, options) {
		validateName(name);
		validateOptions(options);
		this._serializers[name] = options;
	}

	setDefault(name) {
		validateName(name);
		if(Object.prototype.hasOwnProperty.call(this._serializers, name)){
			this._defaultSerializer = name;
		}
	}

	remove(name) {
		validateName(name);
		if(Object.prototype.hasOwnProperty.call(this._serializers, name)) {
			delete this._serializers[name];
		}
		if (this._defaultSerializer === name) {
			this._defaultSerializer = "_default";
		}
	}

	_serializeMany(documentsArray = [], nameOrOptions) {
		documentsArray = cleanAndValidateDocumentsArray(documentsArray);
		return documentsArray.map(doc => doc.serialize(nameOrOptions));
	}

	_serialize(document, nameOrOptions = this._defaultSerializer) {
		const inputType = typeof nameOrOptions;
		let isArray = Array.isArray(nameOrOptions);
		let options;

		if (inputType === "string") {
			options = this._serializers[nameOrOptions];
		} else if (isArray || inputType === "object") {
			options = nameOrOptions;
		}

		try {
			validateOptions(options);
			isArray = Array.isArray(options);
			if (isArray) {
				return includeHandler(document, options, {});
			}

			let serialized = {};
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

const includeHandler = (document, includeRules, serialized) =>
	includeRules.reduce((_serialized, key) => {
		if (Object.prototype.hasOwnProperty.call(document, key)) {
			_serialized[key] = document[key];
		}
		return _serialized;
	}, serialized);

const excludeHandler = (document, excludeRules, serialized) =>
	excludeRules.reduce((_serialized, key) => {
		if (Object.prototype.hasOwnProperty.call(_serialized, key)) {
			delete _serialized[key];
		}
		return _serialized;
	}, serialized);

const validateName = name => {
	if (!name || typeof name !== "string") {
		throw new Error("Field name is required and should be of type string");
	}
};

const validateOptions = options => {
	if (!options || !(Array.isArray(options) || typeof options === "object")) {
		throw new Error("Field options is required and should be an object or array");
	}
};

const cleanAndValidateDocumentsArray = documentsArray => {
	if (!documentsArray || !Array.isArray(documentsArray)) {
		throw new Error("documentsArray must be an array of document objects");
	}
	return documentsArray.filter(doc => typeof doc.serialize === "function");
};

module.exports = Serializer;
