// This function flattens an array non recursively
export default <T>(array: T[]): any[] => Array.prototype.concat.apply([], array);
