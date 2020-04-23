module.exports = (version) => {
	const regex = /^v?((?:\d\.?){1,3})(?:-(.*)\.(\d*))?$/gmu;
	const [,main,tag,tagNumber] = regex.exec(version);
	const obj = {
		main,
		tag,
		"npmtag": tag || "latest",
		tagNumber,
		"isPrerelease": Boolean(tag)
	};

	switch(obj.npmtag) {
	case "latest":
		obj.websites3bucket = "dynamoosejs.com";
		break;
	default:
		obj.websites3bucket = "";
		break;
	}

	return obj;
};
