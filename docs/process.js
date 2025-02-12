const fs = require("fs").promises;
const path = require("path");
const {mkdirp} = require("mkdirp");
const jsdoc2md = require("jsdoc-to-markdown");
const git = require("simple-git");

(async () => {
	const docsSrcPath = path.join(__dirname, "docs_src");
	const docsPath = path.join(__dirname, "docs");
	await mkdirp(docsPath);

	function regexNestedBraces (number, count = 1, previousString = "[^\\}\\{]*") {
		if (count === number) {
			return previousString;
		}

		// return nested(number, count + 1, previousString.replace(`[^\\}\\{]*`, `(?:[^\\}\\{]*|\\{[^\\}\\{]*\\})`));
		const stringToReplace = count === 1 ? "[^\\}\\{]*" : "\\{[^\\}\\{]*\\}";
		return regexNestedBraces(number, count + 1, previousString.replace(stringToReplace, "(?:[^\\}\\{]*|\\{(?:[^\\}\\{]*|\\{[^\\}\\{]*\\})*\\})*"));
	}

	async function main (pathString) {
		const files = await fs.readdir(pathString);
		for (const file of files) {
			if (file === ".DS_Store") {
				continue;
			}

			// Check to see if file is a directory
			const filePath = path.join(pathString, file);
			const stats = await fs.stat(filePath);
			if (stats.isDirectory()) {
				await mkdirp(filePath.replace("docs_src", "docs"));
				await main(filePath);
			} else {
				const fileName = filePath.replace("docs_src", "docs");
				let fileContents = await fs.readFile(filePath, "utf8");
				const regex = /^dyno_jsdoc_([^|]*)\|(.+)$/gmu;

				let match;

				do {
					match = regex.exec(fileContents);
					if (match) {
						let [full, name, contents] = match;
						const shouldPreprocessSourceFile = name.split(".").splice(1).join(".") === "d.ts";
						if (shouldPreprocessSourceFile) {
							const sourceFileContents = await fs.readFile(path.join(__dirname, "..", "packages", "dynamoose", name), "utf8");
							name = name.replace(".d.ts", "-docstmp.js");
							const regexString = `(?:(?:interface )|(?:declare const ))(.+?):? \\{(${regexNestedBraces(5)})\\}`;
							const regex = new RegExp(regexString, "gmu");
							let match;

							let newSourceFileContents = "";
							do {
								match = regex.exec(sourceFileContents);
								if (match) {
									let [, name, contents] = match;

									// Remove `[attribute: string]: AttributeType;` things
									const regexString = `^(\\s*\\[[^\\*|[|\\n]+?\\])\\??: ${regexNestedBraces(4)}`;
									contents = contents.replace(new RegExp(regexString, "gmu"), "");

									newSourceFileContents += `class ${name} {\n    /**\n    * ${name} Docs Generated\n    */\n    constructor(){}\n${contents.replaceAll(/^([^*|[|\n]+?)\??: (?:[^{|\n|(]|\||\{(?:[^}{]+|(?:\{(?:[^}{]+|\{[^}{]*\})*\})*\})|(?:\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)))+/gmu, "$1;")
									// Temporary fix until I can improve the regex above
										.replaceAll(/\s\};/gmu, "")}};\n`;
								}
							} while (match);

							await fs.writeFile(path.join(__dirname, "..", "packages", "dynamoose", name), newSourceFileContents);
						}
						const sourceFilePath = path.join(__dirname, "..", "packages", "dynamoose", name);
						const md = await jsdoc2md.render({
							"files": [sourceFilePath]
						});
						const block = md.replace(/^## .*$/gmu, "").split("###").map((val) => `###${val}`).find((val) => {
							const lines = val.split("\n");
							return lines[0].toLowerCase().includes(contents.toLowerCase());
						});
						if (!block) {
							throw new Error(`Could not find block for ${contents}`);
						}
						const ignorePrefixes = ["Kind", "Returns", "Read only"].map((val) => `**${val}**:`);
						const paramArrayIndex = (() => {
							const options = ["| Param | Description |", "| Param |"];

							const option = options.find((val) => block.includes(val));
							if (option) {
								return block.split("\n").indexOf(option);
							}
						})();
						const blockFormatted = block.split("\n").filter((val, index) => {
							return index !== 0 && !ignorePrefixes.some((prefix) => val.startsWith(prefix)) && !/<a name=".*"><\/a>/gmu.test(val) && (!paramArrayIndex || index < paramArrayIndex);
						}).join("\n").trim();

						fileContents = fileContents.replace(full, blockFormatted.trim());
						if (shouldPreprocessSourceFile) {
							await fs.rm(sourceFilePath);
						}
					}
				} while (match);

				// Copy contents from `README.md` to `docs_src/getting_started/Introduction.mdx`
				if (fileName === path.join(docsPath, "getting_started", "Introduction.mdx")) {
					const readmeContents = await fs.readFile(path.join(__dirname, "..", "README.md"), "utf8");

					// Find the `<!-- block:a1507dd3-6aff-4885-a9fd-14d46a4b7743 -->` block uuid in the fileContents
					const blockUUID = /<!-- block:(.*) -->/gmu.exec(fileContents)[1];
					// Get the contents in README.md between the `<!-- start-block:a1507dd3-6aff-4885-a9fd-14d46a4b7743 -->` and `<!-- end-block:end:a1507dd3-6aff-4885-a9fd-14d46a4b7743 -->` blocks
					const readmeBlock = new RegExp(`<!-- start-block:${blockUUID} -->([\\s\\S]*?)<!-- end-block:${blockUUID} -->`, "gmu").exec(readmeContents)[1].replaceAll("##", "#");
					// Replace the contents in `docs_src/getting_started/Introduction.mdx` with the contents from README.md
					fileContents = fileContents.replace(`<!-- block:${blockUUID} -->`, readmeBlock);
				}

				await fs.writeFile(fileName, fileContents);
			}
		}

		// Create version page
		const version = require("../packages/dynamoose/package.json").version;
		const gitCommit = (await git(path.join(__dirname, "..")).raw(["rev-parse", "HEAD"])).trim();
		await fs.writeFile(path.join(docsPath, "version.md"), `---\ncustom_edit_url: null\n---\n# Version\n\n**npm Version**: ${version}\n\n**Git Commit**: [${gitCommit}](https://github.com/dynamoose/dynamoose/commit/${gitCommit})`);
	}

	await main(docsSrcPath);
})();
