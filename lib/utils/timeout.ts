module.exports = (ms) => {
	ms = parseInt(ms);
	return new Promise((resolve, reject) => {
		if (isNaN(ms)) {
			reject(`Invalid miliseconds passed in: ${ms}`);
		}
		setTimeout(() => resolve(), ms);
	});
};
