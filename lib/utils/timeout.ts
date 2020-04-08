export = (time: string | number): Promise<undefined> => {
	const ms: number = typeof time === "string" ? parseInt(time) : time;
	return new Promise((resolve, reject) => {
		if (isNaN(ms)) {
			reject(`Invalid miliseconds passed in: ${time}`);
		}
		setTimeout(() => resolve(), ms);
	});
};
