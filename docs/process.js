const fs = require("fs").promises;
const path = require("path");
const mkdirp = require("mkdirp");
const jsdoc2md = require("jsdoc-to-markdown");

(async () => {
	const docsSrcPath = path.join(__dirname, "docs_src");
	await mkdirp(path.join(__dirname, "docs"));

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
							const sourceFileContents = await fs.readFile(path.join(__dirname, "..", name), "utf8");
							name = name.replace(".d.ts", "-docstmp.js");
							const regexString = `interface (.+?) \\{(${regexNestedBraces(5)})\\}`;
							const regex = new RegExp(regexString, "gmu");
							let match;

							let newSourceFileContents = "";
							do {
								match = regex.exec(sourceFileContents);
								if (match) {
									let [, name, contents] = match;

									// Remove `[attribute: string]: AttributeType;` things
									const regexString = `^(\\s*\\[[^\\*|[|\\n]+?\\])\\??: ${regexNestedBraces(2)}`;
									contents = contents.replace(new RegExp(regexString, "gmu"), "");

									newSourceFileContents += `class ${name} {\n    /**\n    * ${name} Docs Generated\n    */\n    constructor(){}\n${contents.replaceAll(/^([^*|[|\n]+?)\??: (?:[^{|\n|(]|\||\{(?:[^}{]+|(?:\{(?:[^}{]+|\{[^}{]*\})*\})*\})|(?:\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)))+/gmu, "$1;")}};\n`;
								}
							} while (match);

							await fs.writeFile(path.join(__dirname, "..", name), newSourceFileContents);
						}
						const sourceFilePath = path.join(__dirname, "..", name);
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
						const ignorePrefixes = ["Kind", "Returns"].map((val) => `**${val}**:`);
						const blockFormatted = block.split("\n").filter((val, index) => {
							return index !== 0 && !ignorePrefixes.some((prefix) => val.startsWith(prefix)) && !/<a name=".*"><\/a>/gmu.test(val);
						}).join("\n").trim();

						fileContents = fileContents.replace(full, blockFormatted.trim());
						if (shouldPreprocessSourceFile) {
							await fs.rm(sourceFilePath);
						}
					}
				} while (match);

				await fs.writeFile(fileName, fileContents);
			}
		}
	}

	await main(docsSrcPath);
})();
