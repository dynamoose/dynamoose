"use strict";
const convertConditionArrayRequestObjectToString = (expression) => {
    return expression.reduce((result, item) => {
        const returnItem = [result];
        returnItem.push(Array.isArray(item) ? `(${convertConditionArrayRequestObjectToString(item)})` : item);
        return returnItem.filter((a) => a).join(" ");
    }, "");
};
module.exports = convertConditionArrayRequestObjectToString;
