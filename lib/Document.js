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
		constructor(object = {}, settings = {}) {
			const documentObject = Document.isDynamoObject(object) ? aws.converter().unmarshall(object) : object;
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
			return typeof value === "object" && keys.length === 1 && utils.dynamodb.attribute_types.includes(key) && (nestedResult || Object.keys(value[key]).length === 0 || utils.attribute_types.find((a) => a.dynamodbType === key).isSet);
		}

		const keys = Object.keys(object);
		const values = Object.values(object);
		if (keys.length === 0) {
			return null;
		} else {
			return recurrsive ? isValid(object) : values.every((value) => isValid(value));
		}
	};
	Document.toDynamo = (object, settings = {}) => (settings.type === "item" ? aws.converter().input : aws.converter().marshall)(object);
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
		if (settings.checkExpiredItem && model.options.expires && (model.options.expires.items || {}).returnExpired === false && object[model.options.expires.attribute] && (object[model.options.expires.attribute] * 1000) < Date.now()) {
			return undefined;
		}

		const returnObject = {...object};
		const schemaAttributes = model.schema.attributes();
		const dynamooseUndefined = require("./index").undefined;

		// Type check
		const validParents = []; // This array is used to allow for set contents to not be type checked
		// const saveUnknownKeys = [];
		const keysToDelete = [];
		const checkTypeFunction = (item) => {
			const [key, value] = item;
			if (validParents.find((parent) => key.startsWith(parent.key) && (parent.infinite || key.split(".").length === parent.key.split(".").length + 1))) {
				return;
			}
			const genericKey = key.replace(/\d+/gu, "0"); // This is a key replacing all list numbers with 0 to standardize things like checking if it exists in the schema
			const existsInSchema = schemaAttributes.includes(genericKey);
			if (existsInSchema) {
				const typeDetails = model.schema.getAttributeTypeDetails(genericKey, {"standardKey": true});
				const {internalAttributeType} = typeDetails;
				const expectedJSType = internalAttributeType.javascriptType;
				const type = typeof value;
				const isValidType = (expectedJSType && (() => type === expectedJSType)()) || (((typeDetails.customType || {}).functions || {}).isOfType || internalAttributeType.isOfType || (() => false))(value, settings.type);
				if (!isValidType) {
					throw new Error.TypeMismatch(`Expected ${key} to be of type ${expectedJSType}, instead found type ${type}.`);
				} else if (internalAttributeType.isSet) {
					validParents.push({key, "infinite": true});
				} else if (/*typeDetails.dynamodbType === "M" || */typeDetails.dynamodbType === "L") {
					value.forEach((subValue, index, array) => {
						if (index === 0 || typeof subValue !== typeof array[0]) {
							checkTypeFunction([`${key}.${index}`, subValue]);
						}
					});
					validParents.push({key});
				}
			} else {
				// Check saveUnknown
				if (!settings.saveUnknown || !utils.dynamoose.saveunknown_attribute_allowed_check(model.schema.getSettingValue("saveUnknown"), key)) {
					keysToDelete.push(key);
				}/* else {
					// saveUnknownKeys.push(key);
				}*/
			}
		};
		utils.object.entries(returnObject).filter((item) => item[1] !== undefined && item[1] !== dynamooseUndefined).map(checkTypeFunction);
		keysToDelete.reverse().forEach((key) => utils.object.delete(returnObject, key));

		if (settings.defaults || settings.forceDefault) {
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				if (value === dynamooseUndefined) {
					utils.object.set(returnObject, key, undefined);
				} else {
					const defaultValue = await model.schema.defaultCheck(key, value, settings);
					const isDefaultValueUndefined = typeof defaultValue === "undefined" || defaultValue === null;
					if (!isDefaultValueUndefined) {
						const typeDetails = model.schema.getAttributeTypeDetails(key);
						const {internalAttributeType} = typeDetails;
						const expectedJSType = internalAttributeType.javascriptType;
						const type = typeof defaultValue;
						const isValidType = (expectedJSType && (() => type === expectedJSType)()) || (((typeDetails.customType || {}).functions || {}).isOfType || internalAttributeType.isOfType || (() => false))(defaultValue, settings.type);
						if (!isValidType) {
							throw new Error.TypeMismatch(`Expected ${key} to be of type ${expectedJSType}, instead found type ${type}.`);
						} else {
							utils.object.set(returnObject, key, defaultValue);
						}
					}
				}
			}));
		}
		// Custom Types
		if (settings.customTypesDynamo) {
			Document.attributesWithSchema(returnObject).map((key) => {
				const value = utils.object.get(returnObject, key);
				if (value) {
					const {customType} = model.schema.getAttributeTypeDetails(key);
					if (customType) {
						const customValue = customType.functions[settings.type](value);
						if (customValue !== value) {
							utils.object.set(returnObject, key, customValue);
						}
					}
				}
			});
		}
		// DynamoDB Type Handler (ex. converting sets to correct value for toDynamo & fromDynamo)
		// console.log(settings.type);
		// console.log(returnObject);
		// console.log(saveUnknownKeys[0], saveUnknownKeys[1]);
		// console.log(utils.object.keys(returnObject).length);
		// console.log(Document.attributesWithSchema(returnObject).length + saveUnknownKeys.length);
		// [...Document.attributesWithSchema(returnObject), ...saveUnknownKeys].forEach((key) => {
		utils.object.entries(returnObject).filter((item) => typeof item[1] === "object").forEach((item) => {
			const [key, value] = item;
			let typeDetails;
			try {
				typeDetails = model.schema.getAttributeTypeDetails(key).internalAttributeType;
			} catch (e) {
				typeDetails = utils.attribute_types.find((type) => type.isOfType && type.isOfType(value, settings.type, settings));
			}

			if (typeDetails && typeDetails[settings.type]) {
				utils.object.set(returnObject, key, typeDetails[settings.type](value));
			}
		});
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
				async function check() {
					const value = utils.object.get(returnObject, key);
					await model.schema.requiredCheck(key, value);
				}

				const keyParts = key.split(".");
				const parentKey = keyParts.slice(0, -1).join(".");
				if (parentKey) {
					const parentValue = utils.object.get(returnObject, parentKey);
					const isParentValueUndefined = typeof parentValue === "undefined" || parentValue === null;
					if (!isParentValueUndefined) {
						await check();
					}
				} else {
					await check();
				}
			}));
		}
		if (settings.enum) {
			await Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
				const value = utils.object.get(returnObject, key);
				const isValueUndefined = typeof value === "undefined" || value === null;
				if (!isValueUndefined) {
					const enumArray = await model.schema.getAttributeSettingValue("enum", key);
					if (enumArray && !enumArray.includes(value)) {
						throw new Error.ValidationError(`${key} must equal ${JSON.stringify(enumArray)}, but is set to ${value}`);
					}
				}
			}));
		}
		if (settings.modifiers) {
			await Promise.all(settings.modifiers.map((modifier) => {
				return Promise.all(Document.attributesWithSchema(returnObject).map(async (key) => {
					const value = utils.object.get(returnObject, key);
					const modifierFunction = await model.schema.getAttributeSettingValue(modifier, key, {"returnFunction": true});
					if (modifierFunction && value) {
						utils.object.set(returnObject, key, await modifierFunction(value));
					}
				}));
			}));
		}

		return returnObject;
	};
	Document.prototype.toDynamo = async function(settings = {}) {
		settings.type = "toDynamo";
		Document.prepareForObjectFromSchema(this, settings);
		const object = await Document.objectFromSchema(this, settings);
		return Document.toDynamo(object);
	};
	Document.prototype.save = function(settings = {}, callback) {
		if (typeof settings === "function" && !callback) {
			callback = settings;
			settings = {};
		}

		const paramsPromise = this.toDynamo({"defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"]}).then((item) => {
			const putItemObj = {
				"Item": item,
				"TableName": Document.Model.name
			};

			if (settings.overwrite === false) {
				putItemObj.ConditionExpression = "attribute_not_exists(#__hash_key)";
				putItemObj.ExpressionAttributeNames = {"#__hash_key": model.schema.getHashKey()};
			}

			return putItemObj;
		});
		if (settings.return === "request") {
			if (callback) {
				paramsPromise.then((result) => callback(null, result));
				return;
			} else {
				return paramsPromise;
			}
		}
		const promise = Promise.all([paramsPromise, Document.Model.pendingTaskPromise()]).then((promises) => {
			const [putItemObj] = promises;
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
		if (!expectedObject) {
			return expectedObject;
		}
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
