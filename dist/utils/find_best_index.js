"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const array_flatten = require("./array_flatten");
function default_1(modelIndexes, comparisonChart) {
    var _a, _b;
    const validIndexes = array_flatten(Object.entries(modelIndexes)
        .map(([key, indexes]) => {
        indexes = Array.isArray(indexes) ? indexes : [indexes];
        return indexes.map((index) => {
            const { hash, range } = index.KeySchema.reduce((res, item) => {
                res[item.KeyType.toLowerCase()] = item.AttributeName;
                return res;
            }, {});
            index._hashKey = hash;
            index._rangeKey = range;
            index._tableIndex = key === "TableIndex";
            return index;
        });
    }))
        .filter((index) => { var _a; return ((_a = comparisonChart[index._hashKey]) === null || _a === void 0 ? void 0 : _a.type) === "EQ"; });
    const index = validIndexes.find((index) => comparisonChart[index._rangeKey]) || validIndexes.find((index) => index._tableIndex) || validIndexes[0];
    return { "tableIndex": (_a = index === null || index === void 0 ? void 0 : index._tableIndex) !== null && _a !== void 0 ? _a : false, "indexName": (_b = index === null || index === void 0 ? void 0 : index.IndexName) !== null && _b !== void 0 ? _b : null };
}
exports.default = default_1;
