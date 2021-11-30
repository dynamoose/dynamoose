"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (array) => array.every((item, index, array) => index === 0 ? true : item === array[index - 1]);
