// This function is used to turn `setImmediate` into a promise. This is espescially useful if you want to wait for pending promises to fire and complete before running the asserts on a test.
module.exports = () => new Promise((resolve) => setImmediate(resolve));
