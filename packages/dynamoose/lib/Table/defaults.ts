import {TableOptions, TableOptionsOptional, TableStreamOptions} from "./index";
import {StreamViewType, TableClass} from "./types";

export const original: TableOptions = {
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
	"expires": undefined,
	"tags": {},
	"tableClass": TableClass.standard,
	"initialize": true,
	"streamOptions": {
		"enabled": false,
		"type": undefined
	}
	// "serverSideEncryption": false,
	// "defaultReturnValues": "ALL_NEW",
};
let customValue: TableOptionsOptional = {};
export interface TableOptionsAccessor {
	"set": (val: TableOptionsOptional) => void;
	"get": () => TableOptionsOptional;
}
const customObject: TableOptionsAccessor = {
	"set": (val: TableOptionsOptional): void => {
		customValue = val;
	},
	"get": (): TableOptionsOptional => customValue
};

export {customObject as custom};
