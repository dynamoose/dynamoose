const versionWebsiteBuckets = {
	"2": "v2.dynamoosejs.com"
};
const versionNPMTags = {
	"2": "dynamoose-v2"
};

module.exports = (version) => {
	const regex = /^v?((?:\d\.?){1,3})(?:-(.*)\.(\d*))?$/gmu;
	const res = regex.exec(version);
	const obj = {
		"main": res[1],
		"tag": res[2],
		"npmtag": res[2] || "latest",
		"tagNumber": res[3],
		"isPrerelease": Boolean(res[2])
	};
	console.log(obj);
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
