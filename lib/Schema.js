const Error = require("./Error");
const utils = require("./utils");
const Internal = require("./Internal");
const Document = require("./Document");
const internalCache = Internal.Schema.internalCache;

class Schema {
	constructor(object, settings = {}) {
		if (!object || typeof object !== "object" || Array.isArray(object)) {
			throw new Error.InvalidParameterType("Schema initalization parameter must be an object.");
		}
		if (Object.keys(object).length === 0) {
			throw new Error.InvalidParameter("Schema initalization parameter must not be an empty object.");
		}

		if (settings.timestamps === true) {
			settings.timestamps = {
				"createdAt": "createdAt",
				"updatedAt": "updatedAt"
			};
		}
		if (settings.timestamps) {
			if (object[settings.timestamps.createdAt] || object[settings.timestamps.updatedAt]) {
				throw new Error.InvalidParameter("Timestamp attributes must not be defined in schema.");
			}

			object[settings.timestamps.createdAt] = Date;
			object[settings.timestamps.updatedAt] = Date;
		}

		// Anytime `this.schemaObject` is modified, `this[internalCache].attributes` must be set to undefined or null
		this.schemaObject = object;
		this.settings = settings;
		Object.defineProperty(this, internalCache, {
			"configurable": false,
			"value": {
				"getAttributeTypeDetails": {}
			}
		});

		const checkAttributeNameDots = (object/*, existingKey = ""*/) => {
			return Object.keys(object).forEach((key) => {
				if (key.includes(".")) {
					throw new Error.InvalidParameter("Attributes must not contain dots.");
				}

				if (typeof object[key] === "object" && object[key].schema) {
					checkAttributeNameDots(object[key].schema, key);
				}
			});
		};
		checkAttributeNameDots(this.schemaObject);

		const checkMultipleArraySchemaElements = (key) => {
			let attributeType;
			try {
				attributeType = this.getAttributeType(key);
			} catch (e) {} // eslint-disable-line no-empty

			if (attributeType === "L" && (this.getAttributeValue(key).schema || []).length > 1) {
				throw new Error.InvalidParameter("You must only pass one element into schema array.");
			}
		};
		this.attributes().forEach((key) => checkMultipleArraySchemaElements(key));
	}
}

Schema.prototype.getHashKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].hashKey) || Object.keys(this.schemaObject)[0];
};
Schema.prototype.getRangeKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].rangeKey);
};

Schema.prototype.getAttributeSettingValue = function(setting, key, settings = {}) {
	const defaultPropertyValue = (this.getAttributeValue(key) || {})[setting];
	return typeof defaultPropertyValue === "function" && !settings.returnFunction ? defaultPropertyValue() : defaultPropertyValue;
};

// This function will take in an attribute and value, and throw an error if the property is required and the value is undefined or null.
Schema.prototype.requiredCheck = async function(key, value) {
	const isRequired = await this.getAttributeSettingValue("required", key);
	if ((typeof value === "undefined" || value === null) && isRequired) {
		throw new Error.ValidationError(`${key} is a required property but has no value when trying to save document`);
	}
};
// This function will take in an attribute and value, and returns the default value if it should be applied.
Schema.prototype.defaultCheck = async function(key, value, settings) {
	const isValueUndefined = typeof value === "undefined" || value === null;
	if ((settings.defaults && isValueUndefined) || (settings.forceDefault && await this.getAttributeSettingValue("forceDefault", key))) {
		const defaultValue = await this.getAttributeSettingValue("default", key);
		const isDefaultValueUndefined = typeof defaultValue === "undefined" || defaultValue === null;
		if (!isDefaultValueUndefined) {
			return defaultValue;
		}
	}
};

Schema.prototype.getIndexAttributes = async function() {
	return (await Promise.all(this.attributes().map(async (attribute) => ({"index": await this.getAttributeSettingValue("index", attribute), attribute})))).filter((obj) => obj.index);
};
Schema.prototype.getIndexRangeKeyAttributes = async function() {
	const indexes = await this.getIndexAttributes();
	return indexes.map((index) => index.index.rangeKey).filter((a) => Boolean(a)).map((a) => ({"attribute": a}));
};
Schema.prototype.getIndexes = async function(model) {
	return (await this.getIndexAttributes()).reduce((accumulator, currentValue) => {
		let indexValue = currentValue.index;
		const attributeValue = currentValue.attribute;

		const dynamoIndexObject = {
			"IndexName": indexValue.name || `${attributeValue}${indexValue.global ? "GlobalIndex" : "LocalIndex"}`,
			"KeySchema": [{"AttributeName": attributeValue, "KeyType": "HASH"}],
			"Projection": {"ProjectionType": "KEYS_ONLY"}
		};
		if (indexValue.project || typeof indexValue.project === "undefined" || indexValue.project === null) {
			dynamoIndexObject.Projection = Array.isArray(indexValue.project) ? ({"ProjectionType": "INCLUDE", "NonKeyAttributes": indexValue.project}) : ({"ProjectionType": "ALL"});
		}
		if (indexValue.rangeKey) {
			dynamoIndexObject.KeySchema.push({"AttributeName": indexValue.rangeKey, "KeyType": "RANGE"});
		}
		if (indexValue.global) {
			const throughputObject = utils.dynamoose.get_provisioned_throughput(indexValue.throughput ? indexValue : model.options);
			if (throughputObject.ProvisionedThroughput) {
				dynamoIndexObject.ProvisionedThroughput = throughputObject.ProvisionedThroughput;
			}
		}
		if (!accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")]) {
			accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")] = [];
		}
		accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")].push(dynamoIndexObject);

		return accumulator;
	}, {});
};

Schema.prototype.getSettingValue = function(setting) {
	return this.settings[setting];
};

function attributes() {
	const main = (object, existingKey = "") => {
		return Object.keys(object).reduce((accumulator, key) => {
			const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
			accumulator.push(keyWithExisting);

			let attributeType;
			try {
				attributeType = this.getAttributeType(keyWithExisting);
			} catch (e) {} // eslint-disable-line no-empty

			if ((attributeType === "M" || attributeType === "L") && object[key].schema) {
				accumulator.push(...main(object[key].schema, keyWithExisting));
			}

			return accumulator;
		}, []);
	};

	return main(this.schemaObject);
}
Schema.prototype.attributes = function() {
	if (!this[internalCache].attributes) {
		this[internalCache].attributes = attributes.call(this);
	}

	return this[internalCache].attributes;
};

Schema.prototype.getAttributeValue = function(key, settings = {}) {
	return (settings.standardKey ? key : key.replace(/\d+/gu, "0")).split(".").reduce((result, part) => utils.object.get(result.schema, part), {"schema": this.schemaObject});
};

class DynamoDBType {
	constructor(obj) {
		Object.keys(obj).forEach((key) => {
			this[key] = obj[key];
		});
	}

	result() {
		const subType = this.dynamodbType instanceof DynamoDBType;
		const type = subType ? this.dynamodbType : this;
		const result = {
			"name": this.name,
			"dynamodbType": subType ? this.dynamodbType.dynamodbType : this.dynamodbType,
			"nestedType": this.nestedType
		};
		if (this.jsType) {
			result.isOfType = this.jsType.func ? this.jsType.func : ((val) => {
				return [this.jsType, (subType ? type.jsType : null)].filter((a) => Boolean(a)).some((jsType) => typeof jsType === "string" ? typeof val === jsType : val instanceof jsType);
			});
		}
		if (type.set) {
			const typeName = type.customDynamoName || type.name;
			result.set = {
				"name": `${this.name} Set`,
				"isSet": true,
				"dynamodbType": `${type.dynamodbType}S`,
				"isOfType": (val, type, settings = {}) => {
					if (type === "toDynamo") {
						return (!settings.saveUnknown && Array.isArray(val) && val.every((subValue) => result.isOfType(subValue))) || (val instanceof Set && [...val].every((subValue) => result.isOfType(subValue)));
					} else {
						return val.wrapperName === "Set" && val.type === typeName && Array.isArray(val.values);
					}
				},
				"toDynamo": (val) => ({"wrapperName": "Set", "type": typeName, "values": [...val]}),
				"fromDynamo": (val) => new Set(val.values)
			};
			if (this.customType) {
				result.set.customType = {
					"functions": (typeSettings) => {
						const functions = result.customType.functions(typeSettings);
						return {
							"toDynamo": (val) => val.map(functions.toDynamo),
							"fromDynamo": (val) => ({"values": val.values.map(functions.fromDynamo)}),
							"isOfType": (val, type) => {
								if (type === "toDynamo") {
									return Array.isArray(val) && val.every(functions.isOfType);
								} else {
									return val.wrapperName === "Set" && val.type === typeName && Array.isArray(val.values);
								}
							}
						};
					}
				};
			}
		}
		if (this.customType) {
			result.customType = this.customType;
		}
		return result;
	}
}

const numberType = new DynamoDBType({"name": "Number", "dynamodbType": "N", "set": true, "jsType": "number"});
const attributeTypesMain = [
	new DynamoDBType({"name": "Buffer", "dynamodbType": "B", "set": true, "jsType": Buffer, "customDynamoName": "Binary"}),
	new DynamoDBType({"name": "Boolean", "dynamodbType": "BOOL", "jsType": "boolean"}),
	new DynamoDBType({"name": "Array", "dynamodbType": "L", "jsType": {"func": Array.isArray}, "nestedType": true}),
	new DynamoDBType({"name": "Object", "dynamodbType": "M", "jsType": {"func": (val) => Boolean(val) && val.constructor === Object && (val.wrapperName !== "Set" || Object.keys(val).length !== 3 || !val.type || !val.values)}, "nestedType": true}),
	numberType,
	new DynamoDBType({"name": "String", "dynamodbType": "S", "set": true, "jsType": "string"}),
	new DynamoDBType({"name": "Date", "dynamodbType": numberType, "customType": {
		"functions": (typeSettings) => ({
			"toDynamo": (val) => {
				// TODO: fix this so that `toDynamo` doesn't get called if using underlying type
				if (typeof val === "number") {
					return val;
				}

				if (typeSettings.storage === "seconds") {
					return Math.round(val.getTime() / 1000);
				} else {
					return val.getTime();
				}
			},
			"fromDynamo": (val) => {
				if (typeSettings.storage === "seconds") {
					return new Date(val * 1000);
				} else {
					return new Date(val);
				}
			},
			"isOfType": (val, type) => {
				return type === "toDynamo" ? val instanceof Date : typeof val === "number";
			}
		})
	}, "jsType": Date}),


	// Commenting out `NULL` type for now, might add in later
	// {"dynamodbType": "NULL"}, // Null
].map((item) => item.result());
const attributeTypes = attributeTypesMain.reduce((agg, item) => {
	agg.push(item);
	if (item.set) {
		agg.push(item.set);
	}
	return agg;
}, []);
function retrieveTypeInfo(type, isSet, key) {
	const parentType = attributeTypesMain.find((checkType) => checkType.name.toLowerCase() === type.toLowerCase());
	if (!parentType) {
		throw new Error.InvalidType(`${key} contains an invalid type: ${type}`);
	}
	if (!parentType.set && isSet) {
		throw new Error.InvalidType(`${key} with type: ${type} is not allowed to be a set`);
	}
	return isSet ? parentType.set : parentType;
}
Schema.prototype.getAttributeTypeDetails = function(key, settings = {}) {
	const standardKey = (settings.standardKey ? key : key.replace(/\d+/gu, "0"));
	if (this[internalCache].getAttributeTypeDetails[standardKey]) {
		return this[internalCache].getAttributeTypeDetails[standardKey];
	}
	const val = this.getAttributeValue(standardKey, {"standardKey": true});
	if (!val) {
		throw new Error.UnknownAttribute(`Invalid Attribute: ${key}`);
	}
	let typeVal = typeof val === "object" && !Array.isArray(val) ? val.type : val;
	let typeSettings = {};
	if (typeof typeVal === "object" && !Array.isArray(typeVal)) {
		typeSettings = typeVal.settings || {};
		typeVal = typeVal.value;
	}

	const isSet = Array.isArray(typeVal);
	if (isSet) {
		typeVal = typeVal[0];
	}
	let type;
	if (typeof typeVal === "function") {
		const regexFuncName = /^Function ([^(]+)\(/iu;
		[, type] = typeVal.toString().match(regexFuncName);
	} else {
		type = typeVal;
	}

	const internalAttributeType = retrieveTypeInfo(type, isSet, key);
	const returnObject = {
		internalAttributeType
	};
	if (internalAttributeType.customType) {
		returnObject.customType = {
			"functions": internalAttributeType.customType.functions(typeSettings)
		};
	}
	this[internalCache].getAttributeTypeDetails[standardKey] = returnObject;
	return returnObject;
};
Schema.prototype.getAttributeType = function(key, value, settings = {}) {
	try {
		return this.getAttributeTypeDetails(key).internalAttributeType.dynamodbType;
	} catch (e) {
		if (settings.unknownAttributeAllowed && e.message === `Invalid Attribute: ${key}` && value) {
			return Object.keys(Document.toDynamo(value, {"type": "value"}))[0];
		} else {
			throw e;
		}
	}
};

Schema.prototype.getCreateTableAttributeParams = async function(model) {
	const hashKey = this.getHashKey();
	const AttributeDefinitions = [
		{
			"AttributeName": hashKey,
			"AttributeType": this.getAttributeType(hashKey)
		}
	];
	const AttributeDefinitionsNames = [hashKey];
	const KeySchema = [
		{
			"AttributeName": hashKey,
			"KeyType": "HASH"
		}
	];

	const rangeKey = this.getRangeKey();
	if (rangeKey) {
		AttributeDefinitions.push({
			"AttributeName": rangeKey,
			"AttributeType": this.getAttributeType(rangeKey)
		});
		AttributeDefinitionsNames.push(rangeKey);
		KeySchema.push({
			"AttributeName": rangeKey,
			"KeyType": "RANGE"
		});
	}

	utils.array_flatten(await Promise.all([this.getIndexAttributes(), this.getIndexRangeKeyAttributes()])).map((obj) => obj.attribute).forEach((index) => {
		if (AttributeDefinitionsNames.includes(index)) {
			return;
		}

		AttributeDefinitionsNames.push(index);
		AttributeDefinitions.push({
			"AttributeName": index,
			"AttributeType": this.getAttributeType(index)
		});
	});

	return {
		AttributeDefinitions,
		KeySchema,
		...await this.getIndexes(model)
	};
};


module.exports = Schema;
module.exports.attributeTypes = attributeTypes;
// module.exports.attributeTypesMain = attributeTypesMain;
