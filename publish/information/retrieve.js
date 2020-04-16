module.exports = (version) => {
	const regex = /^v?((?:\d\.?){1,3})(?:-(.*)\.(\d*))?$/gmu;
	const [,main,tag,tagNumber] = regex.exec(version);
	return {main, tag, tagNumber};
};