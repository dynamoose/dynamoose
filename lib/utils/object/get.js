module.exports = (object, key) => {
	const keyParts = key.split(".");
	let returnValue = object;
	keyParts.forEach((part) => {
		if (returnValue) {
			returnValue = returnValue[part];
		}
	});
	return returnValue;
};
