const versionWebsiteBuckets = {
	"2": "v2.dynamoosejs.com",
	"3": "v3.dynamoosejs.com"
};
const versionNPMTags = {
	"2": "latest-2",
	"3": "latest-3"
};

module.exports = (version) => {
	const regex = /^v?((?:\d\.?){1,3})(?:-(.*)\.(\d*))?$/gmu;
	const [, main, tag, tagNumber] = regex.exec(version);
	const obj = {
		main,
		tag,
		"npmtag": tag || "latest",
		tagNumber,
		"isPrerelease": Boolean(tag)
	};
	const majorVersion = obj.main.split(".")[0];

	const versionNPMTag = versionNPMTags[majorVersion];
	if (versionNPMTag) {
		obj.npmtag = versionNPMTag;
	}

	if (obj.npmtag === "latest") {
		obj.websites3bucket = "dynamoosejs.com";
	} else {
		const versionWebsiteBucket = versionWebsiteBuckets[majorVersion];
		if (versionWebsiteBucket) {
			obj.websites3bucket = versionWebsiteBucket;
		} else if (obj.npmtag === "alpha") {
			obj.websites3bucket = "alpha.dynamoosejs.com";
		} else if (obj.npmtag === "beta") {
			obj.websites3bucket = "beta.dynamoosejs.com";
		} else {
			obj.websites3bucket = "";
		}
	}

	return obj;
};
