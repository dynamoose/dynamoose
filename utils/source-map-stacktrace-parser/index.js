const core = require("@actions/core");
const {SourceMapConsumer} = require("source-map");
const simpleGit = require("simple-git");
const path = require("path");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs/promises");

const comment = process.env.comment;
const commentLines = comment.trim().split("\n");

(async () => {
	let outputtrace = [];

	if (commentLines.shift().trim() === "@dynamoose/bot stacktrace-parser") {
		const commitHash = commentLines.shift().replace("Commit Hash: ", "").trim();

		const repoPath = path.join(__dirname, "dynamoose");
		const packagePath = path.join(repoPath, "packages", "dynamoose");

		await simpleGit().clone("https://github.com/dynamoose/dynamoose.git", repoPath);
		await simpleGit(repoPath).checkout(commitHash);
		await exec("npm install", {"cwd": repoPath});
		await exec("npm run build:sourcemap", {"cwd": packagePath});

		for (let i = 0; i < commentLines.length; i++) {
			const line = commentLines[i];
			if (line.includes("dynamoose/dist")) {
				const regexResult = /(dynamoose\/dist)\/(.*?):(\d+):?(\d+)?/gu.exec(line);
				if (regexResult) {
					const filePath = regexResult[1];
					const file = regexResult[2];
					const lineNumber = parseInt(regexResult[3]);
					const column = parseInt(regexResult[4]);
					const sourceMap = await fs.readFile(path.join(packagePath, "dist", `${file}.map`), "utf8");
					const consumer = await new Promise((resolve) => {
						SourceMapConsumer.with(sourceMap, null, resolve);
					});
					const result = consumer.originalPositionFor({"line": lineNumber, "column": column});
					if (result.source && result.line) {
						outputtrace.push(line.replace(regexResult[0], `${path.join(`/${filePath}`, result.source).substring(1)}:${result.line}:${result.column}`));
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

		console.log(outputtrace.join("\n"));
	}

	core.setOutput("outputtrace", outputtrace.join("\n"));
})();
