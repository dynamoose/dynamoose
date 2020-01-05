const Error = require("./Error");

function Schema(object) {
	if (!object || typeof object !== "object" || Array.isArray(object)) {
		throw new Error.InvalidParameterType("Schema initalization parameter must be an object.");
	}
	if (Object.keys(object).length === 0) {
		throw new Error.InvalidParameter("Schema initalization parameter must not be an empty object.");
	}

	this.schemaObject = object;
}

Schema.prototype.getHashKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].hashKey) || Object.keys(this.schemaObject)[0];
};
Schema.prototype.getRangeKey = function() {
	return Object.keys(this.schemaObject).find((key) => this.schemaObject[key].rangeKey);
};

Schema.prototype.getAttributeSettingValue = async function(setting, key) {
	const defaultPropertyValue = (this.schemaObject[key] || {})[setting];
	return typeof defaultPropertyValue === "function" ? defaultPropertyValue() : defaultPropertyValue;
};

Schema.prototype.attributes = function() {
	return Object.keys(this.schemaObject);
};

Schema.prototype.getAttributeType = function(key) {
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
	let setAllowed = false;
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

	return `${returnValue}${isSet ? "S" : ""}`;
};

Schema.prototype.getCreateTableAttributeParams = function() {
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

	return {
		AttributeDefinitions,
		KeySchema
	};
};


module.exports = Schema;
