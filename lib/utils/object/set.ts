export = (object: object, key: string, value: any): object => {
	const keyParts = key.split(".");
	let objectRef = object;
	keyParts.forEach((part: string | number, index: number) => {
		if (keyParts.length - 1 === index) {
			return;
		}

		if (!objectRef[part]) {
			objectRef[part] = {};
		}

		objectRef = objectRef[part];
	});

	objectRef[keyParts[keyParts.length - 1]] = value;

	return object;
};
