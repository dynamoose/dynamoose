import { ModelOptions, ModelOptionsOptional } from ".";

export const original: ModelOptions = {
	"create": true,
	"throughput": {
		"read": 5,
		"write": 5
	},
	"prefix": "",
	"suffix": "",
	"waitForActive": {
		"enabled": true,
		"check": {
			"timeout": 180000,
			"frequency": 1000
		}
	},
	"update": false,
	// "streamOptions": {
	// 	"enabled": false,
	// 	"type": undefined
	// },
	// "serverSideEncryption": false,
	// "defaultReturnValues": "ALL_NEW",
};
let customValue: ModelOptionsOptional = {};
const customObject = {
	"set": (val: ModelOptionsOptional): void => {customValue = val;},
	"get": (): ModelOptionsOptional => customValue
};

export {customObject as custom};
