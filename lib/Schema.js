const Error = require("./Error");

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
}

Schema.prototype.getHashKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].hashKey) || Object.keys(this.schemaObject)[0];
};
Schema.prototype.getRangeKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].rangeKey);
};

Schema.prototype.getAttributeSettingValue = async function(setting, key, settings = {}) {
	const defaultPropertyValue = (this.schemaObject[key] || {})[setting];
	return typeof defaultPropertyValue === "function" && !settings.returnFunction ? defaultPropertyValue() : defaultPropertyValue;
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
		accumulator[(indexValue.global ? "GlobalSecondaryIndexes" : "LocalSecondaryIndexes")].push(dynamoIndexObject);

		return accumulator;
	}, {"GlobalSecondaryIndexes": [], "LocalSecondaryIndexes": []});
};

Schema.prototype.getSettingValue = function(setting) {
	return this.settings[setting];
};

Schema.prototype.attributes = function() {
	return Object.keys(this.schemaObject);
};

Schema.prototype.getAttributeTypeDetails = function(key) {
	const val = this.schemaObject[key];
	if (!val) {
		throw new Error.UnknownAttribute(`Invalid Attribute: ${key}`);
	}
	let typeVal = typeof val === "object" && !Array.isArray(val) ? val.type : val;

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
					try {
						return val.getTime();
					} catch (e) {
						return null;
					}
				},
				"fromDynamo": (val) => new Date(val)
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
