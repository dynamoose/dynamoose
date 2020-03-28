module.exports = (saveUnknown, checkKey) => {
	if (Array.isArray(saveUnknown)) {
		return Boolean(saveUnknown.find((key) => {
			const keyParts = key.split(".");
			let index = 0;
			return checkKey.split(".").every((checkKeyPart) => {
				const keyPart = keyParts[index];

				if (keyPart === "**") {
					return true;
				} else {
					index++;
					return keyPart === "*" || checkKeyPart === keyPart;
				}
			});
		}));
	} else {
		return saveUnknown;
	}
};
