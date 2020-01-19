const aws = require("./aws");
const utils = require("./utils");
const Error = require("./Error");

// DocumentCarrier represents an internal concept in Dynamoose used to expose the model to documents that are created.
// Without this things like `Document.save` wouldn't be able to access things like the TableName needed to save documents.
// DocumentCarrier is not a concept that needs to be exposed to users of this library.
function DocumentCarrier(model) {

	// Document represents an item in a Model that is either pending (not saved) or saved
	class Document {
		constructor(object/*, settings = {}*/) {
			const documentObject = Document.isDynamoObject(object) ? aws.converter().unmarshall({...object}) : object;
			Object.keys(documentObject).forEach((key) => this[key] = documentObject[key]);
		}
	}

	// This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
	Document.isDynamoObject = (object, recurrsive = false) => {
		// This function will check to see if a nested object is valid by calling Document.isDynamoObject recursively
		function isValid(value) {
			const keys = Object.keys(value);
			const key = keys[0];
			const nestedResult = (typeof value[key] === "object" ? (Array.isArray(value[key]) ? value[key].every((value) => Document.isDynamoObject(value, true)) : Document.isDynamoObject(value[key])) : true);
			return typeof value === "object" && keys.length === 1 && utils.dynamodb.attribute_types.includes(key) && nestedResult;
		}

		const keys = Object.keys(object);
		const values = Object.values(object);
		if (keys.length === 0) {
			return null;
		} else {
			return recurrsive ? isValid(object) : values.every((value) => isValid(value));
		}
	};
	Document.toDynamo = (object) => aws.converter().marshall(object);
	Document.fromDynamo = (object) => aws.converter().unmarshall(object);
	// This function will return an object that conforms to the schema (removing any properties that don't exist, using default values, etc.) & throws an error if there is a typemismatch.
	Document.objectFromSchema = async function(object, settings = {"type": "toDynamo"}) {
		const returnObject = Object.keys(object).reduce((finalObject, key) => {
			const existsInSchema = Boolean(model.schema.schemaObject[key]);
			const typeMatches = existsInSchema ? typeof object[key] === utils.attribute_types.find((type) => type.dynamodbType === model.schema.getAttributeType(key)).javascriptType : null;
			const saveUnknownSetting = model.schema.getSettingValue("saveUnknown");
			const saveUnknownAllowed = Array.isArray(saveUnknownSetting) ? saveUnknownSetting.includes(key) : saveUnknownSetting;
			if ((existsInSchema && typeMatches) || (settings.saveUnknown && saveUnknownAllowed)) {
				finalObject[key] = object[key];
			} else if (existsInSchema && !typeMatches) {
				throw new Error.TypeMismatch(`Expected ${key} to be of type ${utils.attribute_types.find((type) => type.dynamodbType === model.schema.getAttributeType(key)).javascriptType}, instead found type ${typeof object[key]}.`);
			}

			return finalObject;
		}, {});

		if (settings.defaults || settings.forceDefault) {
			await Promise.all(model.schema.attributes().map(async (key) => {
				const value = returnObject[key];
				const isValueUndefined = typeof value === "undefined" || value === null;
				if ((settings.defaults && isValueUndefined) || (settings.forceDefault && await model.schema.getAttributeSettingValue("forceDefault", key))) {
					const defaultValue = await model.schema.getAttributeSettingValue("default", key);
					if (defaultValue) {
						// This operation is safe because each `key` will be unique so it won't be reassigned based on an outdated value. There might be a better way to do this than ignoring the rule on the line below.
						returnObject[key] = defaultValue; // eslint-disable-line require-atomic-updates
					}
				}
			}));
		}
		if (settings.validate) {
			await Promise.all(model.schema.attributes().map(async (key) => {
				const value = returnObject[key];
				if (value) {
					const validator = await model.schema.getAttributeSettingValue("validate", key, {"returnFunction": true});
					if (validator) {
						let result;
						if (validator instanceof RegExp) {
							result = validator.test(value);
						} else {
							result = typeof validator === "function" ? await validator(value) : validator === value;
						}

						if (!result) {
							throw new Error.ValidationError(`${key} with a value of ${value} had a validation error when trying to save the document`);
						}
					}
				}
			}));
		}
		if (settings.required) {
			await Promise.all(model.schema.attributes().map(async (key) => {
				const value = returnObject[key];
				const isRequired = await model.schema.getAttributeSettingValue("required", key);
				if ((typeof value === "undefined" || value === null) && isRequired) {
					throw new Error.ValidationError(`${key} is a required property but has no value when trying to save document`);
				}
			}));
		}
		if (settings.enum) {
			await Promise.all(model.schema.attributes().map(async (key) => {
				const value = returnObject[key];
				const enumArray = await model.schema.getAttributeSettingValue("enum", key);
				if (enumArray && !enumArray.includes(value)) {
					throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
				}
			}));
		}
		// This will take custom types (ex. Date) and convert them into something that DynamoDB can use (ex. Number)
		if (settings.customTypesDynamo) {
			model.schema.attributes().forEach((key) => {
				const typeDetails = model.schema.getAttributeTypeDetails(key);

				if (typeDetails.customType) {
					returnObject[key] = typeDetails.customType.functions[settings.type](returnObject[key]);
				}
			});
		}

		return returnObject;
	};
	Document.prototype.toDynamo = async function(settings = {}) {
		const object = await Document.objectFromSchema(this, {...settings, "type": "toDynamo"});
		return Document.toDynamo(object);
	};
	Document.prototype.save = function(settings = {}, callback) {
		if (typeof settings === "function" && !callback) {
			callback = settings;
			settings = {};
		}

		const promise = Document.Model.pendingTaskPromise().then(() => this.toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "customTypesDynamo": true})).then((item) => {
			const putItemObj = {
				"Item": item,
				"TableName": Document.Model.name
			};

			if (settings.overwrite === false) {
				putItemObj.ConditionExpression = "attribute_not_exists(#__hash_key)";
				putItemObj.ExpressionAttributeNames = {"#__hash_key": model.schema.getHashKey()};
			}

			return aws.ddb().putItem(putItemObj).promise();
		});

		if (callback) {
			promise.then(() => callback(null, this)).catch((error) => callback(error));
		} else {
			return (async () => {
				await promise;
				return this;
			})();
		}
	};
	// This function will modify the document to conform to the Schema
	Document.prototype.conformToSchema = async function(settings = {"type": "fromDynamo"}) {
		const expectedObject = await Document.objectFromSchema(this, settings);
		const expectedKeys = Object.keys(expectedObject);
		Object.keys(this).forEach((key) => {
			if (!expectedKeys.includes(key)) {
				delete this[key];
			}
		});

		return this;
	};

	Document.Model = model;

	// TODO: figure out if there is a better way to do this below.
	// This is needed since when creating a Model we return a Document. But we want to be able to call Model.get and other functions on the model itself. This feels like a really messy solution, but it the only way I can think of how to do it for now.
	// Without this things like Model.get wouldn't work. You would have to do Model.Model.get instead which would be referencing the `Document.Model = model` line above.
	Object.keys(Object.getPrototypeOf(Document.Model)).forEach((key) => {
		if (typeof Document.Model[key] === "object" && Document.Model[key].carrier) {
			const carrier = Document.Model[key].carrier(Document.Model);
			Document[key] = (...args) => new carrier(...args);
			Document[key].carrier = carrier;
		} else {
			Document[key] = Document.Model[key].bind(Document.Model);
		}
	});

	return Document;
}

module.exports = DocumentCarrier;
