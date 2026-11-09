// Jest resolver. The published baseline needs dynamoose-utils, and npm meets that with the workspace
// package (same version number), so both builds would run the current utils and a change there could
// not show in the equivalence suite. A require of dynamoose-utils from inside the baseline gets the
// published copy (devDependency dynamoose-utils-baseline) instead.
const fs = require("fs");
const path = require("path");

module.exports = (request, options) => {
	if (request === "dynamoose-utils" || request.startsWith("dynamoose-utils/")) {
		let baseline;
		try {
			baseline = fs.realpathSync(path.dirname(options.defaultResolver("dynamoose-baseline/package.json", {...options, "basedir": options.rootDir})));
		} catch (error) {
			// Without the baseline installed, resolve as usual, so only the suites that load the baseline fail, and with its name.
			return options.defaultResolver(request, options);
		}
		const from = fs.realpathSync(options.basedir);
		if (from === baseline || from.startsWith(baseline + path.sep)) {
			return options.defaultResolver(request.replace(/^dynamoose-utils/u, "dynamoose-utils-baseline"), options);
		}
	}
	return options.defaultResolver(request, options);
};
