const Error = require("./Error");
const utils = require("./utils");

function Schema(object, settings = {}) {
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

	this.schemaObject = object;
	this.settings = settings;

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

Schema.prototype.getHashKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].hashKey) || Object.keys(this.schemaObject)[0];
};
Schema.prototype.getRangeKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].rangeKey);
};

Schema.prototype.getAttributeSettingValue = async function(setting, key, settings = {}) {
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
		if (defaultValue) {
			return defaultValue;
		}
	}
};

Schema.prototype.getIndexAttributes = async function() {
	return (await Promise.all(this.attributes().map(async (attribute) => ({"index": await this.getAttributeSettingValue("index", attribute), attribute})))).filter((obj) => obj.index);
};
Schema.prototype.getIndexes = async function() {
	return (await this.getIndexAttributes()).reduce((accumulator, currentValue) => {
		let indexValue = currentValue.index;
		const attributeValue = currentValue.attribute;

		const dynamoIndexObject = {
			"IndexName": indexValue.name || `${attributeValue}${indexValue.global ? "GlobalIndex" : "LocalIndex"}`,
			"KeySchema": [{"AttributeName": attributeValue, "KeyType": indexValue.rangeKey ? "HASH" : "RANGE"}],
			"Projection": {"ProjectionType": "KEYS_ONLY"}
		};
		if (indexValue.project || typeof indexValue.project === "undefined" || indexValue.project === null) {
			dynamoIndexObject.Projection = Array.isArray(indexValue.project) ? ({"ProjectionType": "INCLUDE", "NonKeyAttributes": indexValue.project}) : ({"ProjectionType": "ALL"});
		}
		if (indexValue.rangeKey) {
			dynamoIndexObject.KeySchema.push({"AttributeName": indexValue.rangeKey, "KeyType": "RANGE"});
		} else {
			dynamoIndexObject.KeySchema.unshift({"AttributeName": this.getHashKey(), "KeyType": "HASH"});
		}
		if (indexValue.global && indexValue.throughput) {
			dynamoIndexObject.ProvisionedThroughput = {
				"ReadCapacityUnits": `${indexValue.throughput.read || indexValue.throughput}`,
				"WriteCapacityUnits": `${indexValue.throughput.write || indexValue.throughput}`
			};
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

Schema.prototype.attributes = function() {
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
};

Schema.prototype.getAttributeValue = function(key) {
	const keyParts = key.split(".");
	let returnItem;
	keyParts.forEach((part) => {
		if (parseInt(part) > 0) {
			part = "0";
		}
		returnItem = utils.object.get((returnItem || {}).schema || this.schemaObject, part);
	});
	return returnItem;
};

Schema.prototype.getAttributeTypeDetails = function(key) {
	const val = this.getAttributeValue(key);
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

	let returnValue;
	// `customType` represents a custom Dynamoose type (ex. Date) that is converted to and from a different DynamoDB type (ex. Number)
	let setAllowed = false, customType = false;
	switch (type.toLowerCase()) {
	case "string":
		returnValue = "S";
		setAllowed = true;
		break;
	case "number":
		returnValue = "N";
		setAllowed = true;
		break;
	case "boolean":
		returnValue = "BOOL";
		break;
	case "date":
		returnValue = "N";
		setAllowed = true;
		customType = {
			"functions": {
				"toDynamo": (val) => {
					const action = (val) => {
						if (typeSettings.storage === "seconds") {
							return val.getTime() / 1000;
						} else {
							return val.getTime();
						}
					};

					try {
						return isSet ? val.map(action) : action(val);
					} catch (e) {
						return null;
					}
				},
				"fromDynamo": (val) => {
					const action = (val) => {
						if (typeSettings.storage === "seconds") {
							return new Date(val * 1000);
						} else {
							return new Date(val);
						}
					};

					return isSet ? {"values": val.values.map(action)} : action(val);
				}
			}
		};
		break;
	case "object":
		returnValue = "M";
		break;
	case "array":
		returnValue = "L";
		break;
	case "buffer":
		returnValue = "B";
		setAllowed = true;
		break;
	default:
		throw new Error.InvalidType(`${key} contains an invalid type: ${type}`);
	}

	if (isSet && !setAllowed) {
		throw new Error.InvalidType(`${key} with type: ${type} is not allowed to be a set`);
	}

	return {
		isSet,
		customType,
		"dynamodbType": `${returnValue}${isSet ? "S" : ""}`
	};
};
Schema.prototype.getAttributeType = function(key) {
	return this.getAttributeTypeDetails(key).dynamodbType;
};

Schema.prototype.getCreateTableAttributeParams = async function() {
	const hashKey = this.getHashKey();
	const AttributeDefinitions = [
		{
			"AttributeName": hashKey,
			"AttributeType": this.getAttributeType(hashKey)
		}
	];
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
		KeySchema.push({
			"AttributeName": rangeKey,
			"KeyType": "RANGE"
		});
	}

	(await this.getIndexAttributes()).map((obj) => obj.attribute).forEach((index) => {
		AttributeDefinitions.push({
			"AttributeName": index,
			"AttributeType": this.getAttributeType(index)
		});
	});

	return {
		AttributeDefinitions,
		KeySchema,
		...await this.getIndexes()
	};
};


module.exports = Schema;
