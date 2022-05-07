export default (time: string | number): Promise<void> => {
	const ms: number = typeof time === "string" ? parseInt(time) : time;
	return new Promise((resolve, reject) => {
		if (isNaN(ms)) {
			reject(`Invalid milliseconds passed in: ${time}`);
		}
		setTimeout(() => resolve(), ms);
	});
};
