"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.custom = exports.original = void 0;
exports.original = {
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
    "expires": undefined
    // "streamOptions": {
    // 	"enabled": false,
    // 	"type": undefined
    // },
    // "serverSideEncryption": false,
    // "defaultReturnValues": "ALL_NEW",
};
let customValue = {};
const customObject = {
    "set": (val) => {
        customValue = val;
    },
    "get": () => customValue
};
exports.custom = customObject;
