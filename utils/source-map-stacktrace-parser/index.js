const core = require("@actions/core");
const { SourceMapConsumer } = require("source-map");
const simpleGit = require("simple-git");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs/promises");

const comment = core.getInput("comment") || `
@dynamoose/bot stacktrace-parser
Commit Hash: 2286b41d0554c770d1d733117711c52dcf33df31
/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:591
        return utils.object.get(result.schema, part);
                                       ^

TypeError: Cannot read property 'schema' of undefined
    at split.reduce.schema (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:591:40)
    at Array.reduce (<anonymous>)
    at Schema.getAttributeValue (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:580:137)
    at Schema.getAttributeSettingValue (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:384:37)
    at Schema.<anonymous> (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:370:95)
    at Generator.next (<anonymous>)
    at /Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:8:71
    at new Promise (<anonymous>)
    at __awaiter (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:4:12)
    at Schema.defaultCheck (/Users/charliefish/tmp/node_modules/dynamoose/dist/Schema.js:368:16)
`;
const commentLines = comment.trim().split("\n");

(async () => {
	let outputtrace = [];
	console.log(commentLines);

	if (commentLines.shift() === "@dynamoose/bot stacktrace-parser") {
		const commitHash = commentLines.shift().replace("Commit Hash: ", "");
		// await simpleGit().clone("https://github.com/dynamoose/dynamoose.git");
		// await simpleGit(path.join(__dirname, "dynamoose")).checkout(commitHash);
		// await exec(`cd ${path.join(__dirname, "dynamoose")} && npm install`);

		for (let i = 0; i < commentLines.length; i++) {
			const line = commentLines[i];
			if (line.includes("dynamoose/dist")) {
				const regexResult = /dynamoose\/dist\/(.*?):(\d+?):(\d+)/gu.exec(line);
				if (regexResult) {
					const file = regexResult[1];
					const lineNumber = regexResult[2];
					const column = regexResult[3];
					const sourceMap = await fs.readFile(path.join(__dirname, "dynamoose", "dist", `${file}.map`), "utf8");
					const consumer = await (new Promise((resolve, reject) => {
						SourceMapConsumer.with(sourceMap, null, resolve);
					}));
					console.log(consumer);
					console.log(consumer.originalPositionFor({"line": 1, "column": 1}));
					const result = consumer.originalPositionFor({ "line": lineNumber, column });
					console.log("result", result);
					console.log("original file path", path.join(__dirname, "dynamoose", "dist", `${file}.map`));
					console.log("original line number", lineNumber);
					console.log("original column", column);
					if (result.source && result.line && result.column) {
						outputtrace.push(line.replace(regexResult[0], `dynamoose/lib/${result.source}:${result.line}:${result.column}`));
					} else {
						outputtrace.push(line);
					}
				} else {
					outputtrace.push(line);
				}
			} else {
				outputtrace.push(line);
			}
		}
		console.log(outputtrace);
	}

	core.setOutput("outputtrace", outputtrace.join("\n"));
})();
