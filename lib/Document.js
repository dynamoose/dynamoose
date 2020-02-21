const aws = require("./aws");
const utils = require("./utils");
const Error = require("./Error");

// DocumentCarrier represents an internal concept in Dynamoose used to expose the model to documents that are created.
// Without this things like `Document.save` wouldn't be able to access things like the TableName needed to save documents.
// DocumentCarrier is not a concept that needs to be exposed to users of this library.
function DocumentCarrier(model) {
	const internalProperties = Symbol("internalProperties");

	// Document represents an item in a Model that is either pending (not saved) or saved
	class Document {
		constructor(object, settings = {}) {
			const documentObject = Document.isDynamoObject(object) ? aws.converter().unmarshall({...object}) : object;
			Object.keys(documentObject).forEach((key) => this[key] = documentObject[key]);
			this[internalProperties] = {};
			this[internalProperties].originalObject = {...object};
			this[internalProperties].originalSettings = {...settings};

			if (settings.fromDynamo) {
				this[internalProperties].storedInDynamo = true;
			}
		}
	}

	// This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
	Document.isDynamoObject = (object, recurrsive = false) => {
		// This function will check to see if a nested object is valid by calling Document.isDynamoObject recursively
		function isValid(value) {
			const keys = Object.keys(value);
			const key = keys[0];
			const nestedResult = (typeof value[key] === "object" && !(value[key] instanceof Buffer) ? (Array.isArray(value[key]) ? value[key].every((value) => Document.isDynamoObject(value, true)) : Document.isDynamoObject(value[key])) : true);
			return typeof value === "object" && keys.length === 1 && utils.dynamodb.attribute_types.includes(key) && (nestedResult || utils.attribute_types.find((a) => a.dynamodbType === key).isSet);
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
	// This function will mutate the object passed in to run any actions to conform to the schema that cannot be achieved through non mutating methods in Document.objectFromSchema (setting timestamps, etc.)
	Document.prepareForObjectFromSchema = function(object, settings) {
		if (settings.updateTimestamps) {
			if (model.schema.settings.timestamps && settings.type === "toDynamo") {
				const date = new Date();
				// TODO: The last condition of the following is commented out until we can add automated tests for it
				if (model.schema.settings.timestamps.createdAt && (object[internalProperties] && !object[internalProperties].storedInDynamo)/* && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.createdAt)*/) {
					object[model.schema.settings.timestamps.createdAt] = date;
				}
				if (model.schema.settings.timestamps.updatedAt && (typeof settings.updateTimestamps === "boolean" || settings.updateTimestamps.updatedAt)) {
					object[model.schema.settings.timestamps.updatedAt] = date;
				}
			}
		}
		return object;
	};
	// This function will return a list of attributes combining both the schema attributes with the document attributes. This also takes into account all attributes that could exist (ex. properties in sets that don't exist in document), adding the indexes for each item in the document set.
	// https://stackoverflow.com/a/59928314/894067
	Document.attributesWithSchema = function(document) {
		// build a tree out of schema attributes
		const root = {};
		model.schema.attributes().forEach((attribute) => {
			let node = root;
			attribute.split(".").forEach((part) => {
				node[part] = node[part] || {};
				node = node[part];
			});
		});
		// explore the tree
		function traverse (node, treeNode, outPath, callback) {
			callback(outPath);
			if (Object.keys(treeNode).length === 0) { // a leaf
				return;
			}

			Object.keys(treeNode).forEach((attr) => {
				if (attr === "0") {
					if (!node || node.length == 0) {
						node = [{}]; // fake the path for arrays
					}
					node.forEach((a, index) => {
						outPath.push(index);
						traverse(node[index], treeNode[attr], outPath, callback);
						outPath.pop();
					});
				} else {
					if (!node) {
						node = {}; // fake the path for properties
					}
					outPath.push(attr);
					traverse(node[attr], treeNode[attr], outPath, callback);
					outPath.pop();
				}
			});
		}
		const out = [];
		traverse(document, root, [], (val) => out.push(val.join(".")));
		return out.slice(1);
	};
	// This function will return an object that conforms to the schema (removing any properties that don't exist, using default values, etc.) & throws an error if there is a typemismatch.
	Document.objectFromSchema = async function(object, settings = {"type": "toDynamo"}) {
		// const attributeTypeMap = {};
		const returnObject = Object.keys(object).reduce((finalObject, key) => {
			function main(key) {
				const value = utils.object.get(object, key);
				const genericKey = key.replace(/\d+/gu, "0"); // This is a key replacing all list numbers with 0 to standardize things like checking if it exists in the schema
				const keyParts = key.split(".");
				const parentKey = [...keyParts].splice(0, keyParts.length - 1).join(".");
				const parentKeyIsArray = parentKey && model.schema.getAttributeType(parentKey) === "L";
				const existsInSchema = model.schema.attributes().includes(genericKey) || parentKeyIsArray;
				const isCustomType = existsInSchema && model.schema.getAttributeTypeDetails(key).customType;
				const valueType = typeof value;
				const customValue = isCustomType ? model.schema.getAttributeTypeDetails(key).customType.functions[settings.type](value) : null;
				const customValueType = isCustomType ? typeof customValue : null;
				let attributeType = existsInSchema || parentKeyIsArray ? utils.attribute_types.find((type) => type.dynamodbType === model.schema.getAttributeType(key)) : null;
				const expectedType = existsInSchema ? attributeType.javascriptType : null;
				let typeMatches = existsInSchema ? valueType === expectedType || (attributeType.isOfType && attributeType.isOfType(value, settings.type)) : null;
				if (existsInSchema && attributeType.isOfType && attributeType.isOfType(isCustomType && settings.type === "toDynamo" ? customValue : value, settings.type)) {
					typeMatches = true;
				}
				const saveUnknownSetting = model.schema.getSettingValue("saveUnknown");
				const saveUnknownAllowed = Array.isArray(saveUnknownSetting) ? saveUnknownSetting.includes(key) : saveUnknownSetting;
				if ((existsInSchema && (typeMatches || (settings.customTypesDynamo && customValueType === expectedType))) || (settings.saveUnknown && saveUnknownAllowed)) {
					if (!existsInSchema && settings.saveUnknown && saveUnknownAllowed) {
						const foundAttributeType = utils.attribute_types.find((type) => type.isOfType && type.isOfType(customValue || value, settings.type, {"saveUnknown": true}));
						if (foundAttributeType) {
							attributeType = foundAttributeType;
						}
					}

					const setValue = attributeType && attributeType[settings.type] ? attributeType[settings.type](customValue || value) : (customValue || value);

					if (attributeType && attributeType.nestedType) {
						utils.object.set(finalObject, key, attributeType.defaultNestedType());
						Object.keys(setValue).forEach((nestedKey) => {
							main(`${key}.${nestedKey}`);
						});
					} else {
						utils.object.set(finalObject, key, setValue);
					}
				} else if (existsInSchema && !typeMatches && !(settings.customTypesDynamo && customValueType === expectedType)) {
					throw new Error.TypeMismatch(`Expected ${key} to be of type ${attributeType.javascriptType}, instead found type ${valueType}.`);
				}
			}
			main(key);

			return finalObject;
		}, {});

		if (settings.defaults || settings.forceDefault) {
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				const defaultValue = await model.schema.defaultCheck(key, value, settings);
				if (defaultValue) {
					utils.object.set(returnObject, key, defaultValue);
				}
			}));
		}
		if (settings.validate) {
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
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
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				await model.schema.requiredCheck(key, value);
			}));
		}
		if (settings.enum) {
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				const enumArray = await model.schema.getAttributeSettingValue("enum", key);
				if (enumArray && !enumArray.includes(value)) {
					throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
				}
			}));
		}

		// Object.keys(attributeTypeMap).forEach((key) => {
		// 	const attributeType = attributeTypeMap[key];
		// 	const existingValue = utils.object.get(returnObject, key);
		//
		// 	if (attributeType && attributeType[settings.type]) {
		// 		utils.object.set(returnObject, key, attributeType[settings.type](existingValue));
		// 	}
		// });

		return returnObject;
	};
	Document.prototype.toDynamo = async function(settings = {}) {
		settings = {...settings, "type": "toDynamo"};
		Document.prepareForObjectFromSchema(this, settings);
		const object = await Document.objectFromSchema(this, settings);
		return Document.toDynamo(object);
	};
	Document.prototype.save = function(settings = {}, callback) {
		if (typeof settings === "function" && !callback) {
			callback = settings;
			settings = {};
		}

		const promise = Document.Model.pendingTaskPromise().then(() => this.toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true})).then((item) => {
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
			promise.then(() => {this[internalProperties].storedInDynamo = true; return callback(null, this);}).catch((error) => callback(error));
		} else {
			return (async () => {
				await promise;
				this[internalProperties].storedInDynamo = true;
				return this;
			})();
		}
	};
	Document.prototype.delete = function(callback) {
		return model.delete({
			[model.schema.getHashKey()]: this[model.schema.getHashKey()]
		}, callback);
	};
	// This function will modify the document to conform to the Schema
	Document.prototype.conformToSchema = async function(settings = {"type": "fromDynamo"}) {
		Document.prepareForObjectFromSchema(this, settings);
		const expectedObject = await Document.objectFromSchema(this, settings);
		const expectedKeys = Object.keys(expectedObject);
		Object.keys(this).forEach((key) => {
			if (!expectedKeys.includes(key)) {
				delete this[key];
			} else if (this[key] !== expectedObject[key]) {
				this[key] = expectedObject[key];
			}
		});

		return this;
	};

	Document.prototype.original = function() {
		return this[internalProperties].originalSettings.type === "fromDynamo" ? this[internalProperties].originalObject : null;
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
