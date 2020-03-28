// This function flattens an array non recursively
module.exports = (array) => Array.prototype.concat.apply([], array);
