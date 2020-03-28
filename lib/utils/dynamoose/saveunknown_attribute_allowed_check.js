module.exports = (saveUnknown, checkKey) => {
	if (Array.isArray(saveUnknown)) {
		return Boolean(saveUnknown.find((key) => {
			const keyParts = key.split(".");
			const checkKeyParts = checkKey.split(".");
			let index = 0, keyPart = keyParts[0];
			for (let i = 0; i < checkKeyParts.length; i++) {
				if (keyPart === "**") {
					return true;
				}
				if (keyPart !== "*" && checkKeyParts[i] !== keyPart) {
					return false;
				}
				keyPart = keyParts[++index];
			}
			return true;
		}));
	} else {
		return saveUnknown;
	}
};
