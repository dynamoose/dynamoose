// This function flattens an array non recursively
export = <T>(array: T[]): any[] => Array.prototype.concat.apply([], array);
