const core = require("@actions/core");
const sourceMap = require("source-map");

const comment = core.getInput("comment");
const commentLines = comment.split("\n");

let outputtrace = "";

if (commentLines.shift() === "@dynamoose/bot stacktrace-parser") {
	const commitHash = commentLines.shift().replace("Commit Hash: ", "");
	// const stackTrace =

}

core.setOutput("outputtrace", outputtrace);
