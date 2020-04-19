const core = require("@actions/core");
const package = require("../../package.json");
const version = package.version;
const obj = require("./retrieve")(version);

Object.entries(obj).forEach((entry) => {
	const [key, value] = entry;
	if (typeof value !== "string") {
		return;
	}
	core.setOutput(key, value);
});

console.log(obj);
