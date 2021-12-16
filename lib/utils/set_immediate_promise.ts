// This function is used to turn `setImmediate` into a promise. This is especially useful if you want to wait for pending promises to fire and complete before running the asserts on a test.
export default (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
