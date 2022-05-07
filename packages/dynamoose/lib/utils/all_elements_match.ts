export default <T>(array: T[]): boolean => array.every((item, index, array) => index === 0 ? true : item === array[index - 1]);
