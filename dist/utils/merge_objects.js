"use strict";
// This function is used to merge objects for combining multiple responses.
var MergeObjectsCombineMethod;
(function (MergeObjectsCombineMethod) {
    MergeObjectsCombineMethod["ObjectCombine"] = "object_combine";
    MergeObjectsCombineMethod["ArrayMerge"] = "array_merge";
    MergeObjectsCombineMethod["ArrayMergeNewArray"] = "array_merge_new_arrray";
})(MergeObjectsCombineMethod || (MergeObjectsCombineMethod = {}));
const main = (settings = { "combineMethod": MergeObjectsCombineMethod.ArrayMerge }) => (...args) => {
    let returnObject;
    args.forEach((arg, index) => {
        if (typeof arg !== "object") {
            throw new Error("You can only pass objects into merge_objects method.");
        }
        if (index === 0) {
            returnObject = arg;
        }
        else {
            if (Array.isArray(returnObject) !== Array.isArray(arg)) {
                throw new Error("You can't mix value types for the merge_objects method.");
            }
            Object.keys(arg).forEach((key) => {
                if (typeof returnObject[key] === "object" && typeof arg[key] === "object" && !Array.isArray(returnObject[key]) && !Array.isArray(arg[key]) && returnObject[key] !== null) {
                    if (settings.combineMethod === MergeObjectsCombineMethod.ObjectCombine) {
                        returnObject[key] = Object.assign(Object.assign({}, returnObject[key]), arg[key]);
                    }
                    else if (settings.combineMethod === MergeObjectsCombineMethod.ArrayMergeNewArray) {
                        returnObject[key] = main(settings)(returnObject[key], arg[key]);
                    }
                    else {
                        returnObject[key] = [returnObject[key], arg[key]];
                    }
                }
                else if (Array.isArray(returnObject[key]) && Array.isArray(arg[key])) {
                    returnObject[key] = [...returnObject[key], ...arg[key]];
                }
                else if (Array.isArray(returnObject[key])) {
                    returnObject[key] = [...returnObject[key], arg[key]];
                }
                else if (returnObject[key]) {
                    if (settings.combineMethod === MergeObjectsCombineMethod.ArrayMergeNewArray) {
                        returnObject[key] = [returnObject[key], arg[key]];
                    }
                    else if (typeof returnObject[key] === "number") {
                        returnObject[key] += arg[key];
                    }
                    else {
                        returnObject[key] = arg[key];
                    }
                }
                else {
                    returnObject[key] = arg[key];
                }
            });
        }
    });
    return returnObject;
};
const returnObject = main();
returnObject.main = main;
module.exports = returnObject;
