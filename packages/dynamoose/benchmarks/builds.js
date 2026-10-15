// Loads a dynamoose build (a package directory with a built dist) for the benchmark and the equivalence
// suite.
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

module.exports = {
	loadBuild,
	// The published release the equivalence suite compares with (devDependency dynamoose-baseline).
	"publishedBaselineDirectory": path.dirname(require.resolve("dynamoose-baseline/package.json")),
	"currentDirectory": path.resolve(__dirname, "..")
};
