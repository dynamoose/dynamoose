"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertPackages = exports.setUndefinedPackage = void 0;
let undefinedPackages = [];
exports.default = async (name) => {
    if (undefinedPackages.includes(name)) {
        throw new Error("Package can not be found.");
    }
    else {
        return await Promise.resolve().then(() => require(name));
    }
};
const setUndefinedPackage = (name) => {
    undefinedPackages.push(name);
};
exports.setUndefinedPackage = setUndefinedPackage;
const revertPackages = () => {
    undefinedPackages = [];
};
exports.revertPackages = revertPackages;
