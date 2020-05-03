import { ModelOptions, ModelOptionsOptional } from ".";

export const original: ModelOptions = {
	"create": true,
	"throughput": {
		"read": 1,
		"write": 1
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
	"populate": false,
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
