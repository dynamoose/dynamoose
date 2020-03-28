module.exports = [
	{"dynamodbType": "B", "isOfType": (val) => val instanceof Buffer}, // Binary
	{"dynamodbType": "BOOL", "javascriptType": "boolean"}, // Boolean
	{"dynamodbType": "BS", "isSet": true, "isOfType": (val, type, settings = {}) => {
		if (type === "toDynamo") {
			if (settings.saveUnknown) {
				return val instanceof Set && [...val].every((subValue) => subValue instanceof Buffer);
			} else {
				return Array.isArray(val) && val.every((subValue) => subValue instanceof Buffer);
			}
		} else {
			return val.wrapperName === "Set" && val.type === "Binary" && Array.isArray(val.values);
		}
	}, "toDynamo": (val) => ({"wrapperName": "Set", "type": "Binary", "values": [...val]}), "fromDynamo": (val) => new Set(val.values)}, // Binary Set
	{"dynamodbType": "L", "isOfType": (val) => Array.isArray(val), "nestedType": true}, // List
	{"dynamodbType": "M", "isOfType": (val) => Boolean(val) && val.constructor === Object && (val.wrapperName !== "Set" || Object.keys(val).length !== 3 || !val.type || !val.values), "javascriptType": "object", "nestedType": true}, // Map
	{"dynamodbType": "N", "javascriptType": "number"}, // Number
	{"dynamodbType": "NS", "isSet": true, "isOfType": (val, type, settings = {}) => {
		if (type === "toDynamo") {
			if (settings.saveUnknown) {
				return val instanceof Set && [...val].every((a) => typeof a === "number");
			} else {
				return Array.isArray(val) && val.every((a) => typeof a === "number");
			}
		} else {
			return val.wrapperName === "Set" && val.type === "Number" && Array.isArray(val.values);
		}
	}, "toDynamo": (val) => ({"wrapperName": "Set", "type": "Number", "values": [...val]}), "fromDynamo": (val) => new Set(val.values)}, // Number Set
	// Commenting out `NULL` type for now, might add in later
	// {"dynamodbType": "NULL"}, // Null
	{"dynamodbType": "S", "javascriptType": "string"}, // String
	{"dynamodbType": "SS", "isSet": true, "isOfType": (val, type, settings = {}) => {
		if (type === "toDynamo") {
			return (!settings.saveUnknown && Array.isArray(val) && val.every((a) => typeof a === "string")) || (val instanceof Set && [...val].every((a) => typeof a === "string"));
		} else {
			return val.wrapperName === "Set" && val.type === "String" && Array.isArray(val.values);
		}
	}, "toDynamo": (val) => ({"wrapperName": "Set", "type": "String", "values": [...val]}), "fromDynamo": (val) => new Set(val.values)} // String Set
];
