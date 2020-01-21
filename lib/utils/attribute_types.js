module.exports = [
	{"dynamodbType": "B"}, // Binary
	{"dynamodbType": "BOOL", "javascriptType": "boolean"}, // Boolean
	{"dynamodbType": "BS", "isSet": true}, // Binary Set
	{"dynamodbType": "L"}, // List
	{"dynamodbType": "M"}, // Map
	{"dynamodbType": "N", "javascriptType": "number"}, // Number
	{"dynamodbType": "NS", "isSet": true, "isOfType": (val, type) => {
		if (type === "toDynamo") {
			return Array.isArray(val) && val.every((a) => typeof a === "number");
		} else {
			return val.constructor.name === "Set" && val.wrapperName === "Set" && val.type === "Number" && Array.isArray(val.values);
		}
	}, "toDynamo": (val) => ({"wrapperName": "Set", "type": "Number", "values": val}), "fromDynamo": (val) => new Set(val.values)}, // Number Set
	{"dynamodbType": "NULL"}, // Null
	{"dynamodbType": "S", "javascriptType": "string"}, // String
	{"dynamodbType": "SS", "isSet": true, "isOfType": (val, type) => {
		if (type === "toDynamo") {
			return Array.isArray(val) && val.every((a) => typeof a === "string");
		} else {
			return val.constructor.name === "Set" && val.wrapperName === "Set" && val.type === "String" && Array.isArray(val.values);
		}
	}, "toDynamo": (val) => ({"wrapperName": "Set", "type": "String", "values": val}), "fromDynamo": (val) => new Set(val.values)} // String Set
];
