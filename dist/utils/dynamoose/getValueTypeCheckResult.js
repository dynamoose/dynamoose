"use strict";
module.exports = (schema, value, key, settings, options) => {
    const typeDetails = schema.getAttributeTypeDetails(key, options);
    const typeDetailsArray = Array.isArray(typeDetails) ? typeDetails : [typeDetails];
    const matchedTypeDetailsIndexes = typeDetailsArray.map((details, index) => {
        var _a, _b;
        if ([(_b = (_a = details.customType) === null || _a === void 0 ? void 0 : _a.functions) === null || _b === void 0 ? void 0 : _b.isOfType, details.isOfType].filter((a) => Boolean(a)).some((func) => func(value, settings.type))) {
            return index;
        }
    }).filter((a) => a !== undefined);
    const matchedTypeDetailsIndex = matchedTypeDetailsIndexes[0];
    const matchedTypeDetails = typeDetailsArray[matchedTypeDetailsIndex];
    const isValidType = Boolean(matchedTypeDetails);
    const returnObj = { typeDetails, matchedTypeDetails, matchedTypeDetailsIndex, matchedTypeDetailsIndexes, typeDetailsArray, isValidType };
    return returnObj;
};
