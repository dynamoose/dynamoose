// Loads a dynamoose build (a package directory with a built dist) for the benchmark and the equivalence
// suite.
const fs = require("fs");
const Module = require("module");
const path = require("path");

function loadBuild (directory) {
	return {
		directory,
		"version": require(path.join(directory, "package.json")).version,
		"dynamoose": require(path.join(directory, "dist")),
		"Item": require(path.join(directory, "dist", "Item")).Item,
		"internalProperties": require(path.join(directory, "dist", "Internal")).default.General.internalProperties
	};
}

// The published release the equivalence suite compares with (devDependency dynamoose-baseline).
const publishedBaselineDirectory = path.dirname(require.resolve("dynamoose-baseline/package.json"));

// The published release needs dynamoose-utils, and npm meets that with the workspace package, so a utils
// change would run on both sides. Under Jest, equivalence/resolver.js gives the release the published copy
// (devDependency dynamoose-utils-baseline); this does the same under plain Node, for the benchmark. Only
// requires from inside the published release change, so a BASELINE checkout keeps its own dependencies.
function loadPublishedBaseline () {
	const baseline = fs.realpathSync(publishedBaselineDirectory);
	const publishedUtils = path.dirname(require.resolve("dynamoose-utils-baseline/package.json"));
	const resolveFilename = Module._resolveFilename;
	Module._resolveFilename = function (request, parent, ...rest) {
		// Node keeps the real path of a module file (no --preserve-symlinks), so no realpath here; it would throw for `[eval]`.
		const fromBaseline = Boolean(parent && parent.filename && parent.filename.startsWith(baseline + path.sep));
		if (fromBaseline && (request === "dynamoose-utils" || request.startsWith("dynamoose-utils/"))) {
			return resolveFilename.call(this, publishedUtils + request.slice("dynamoose-utils".length), parent, ...rest);
		}
		return resolveFilename.call(this, request, parent, ...rest);
	};
	return loadBuild(publishedBaselineDirectory);
}

module.exports = {
	loadBuild,
	loadPublishedBaseline,
	publishedBaselineDirectory,
	"currentDirectory": path.resolve(__dirname, "..")
};
