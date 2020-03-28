module.exports = (object, key) => {
	const keyParts = key.split(".");
	let returnValue = object;
	for (let i = 0; i < keyParts.length; i++) {
		const part = keyParts[i];
		if (returnValue) {
			returnValue = returnValue[part];
		} else {
			break;
		}
	}
	return returnValue;
};
