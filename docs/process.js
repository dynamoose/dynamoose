const fs = require("fs").promises;
const path = require("path");
const mkdirp = require("mkdirp");
const jsdoc2md = require("jsdoc-to-markdown");

(async () => {
	const docsSrcPath = path.join(__dirname, "docs_src");
	await mkdirp(path.join(__dirname, "docs"));

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
						const [full, name, contents] = match;
						const md = await jsdoc2md.render({
							"files": [path.join(__dirname, "..", name)]
						});
						const block = md.split("###").map((val) => `###${val}`).find((val) => {
							const lines = val.split("\n");
							return lines[0].includes(contents);
						});
						if (!block) {
							throw new Error(`Could not find block for ${contents}`);
						}
						const ignorePrefixes = ["Kind", "Returns"].map((val) => `**${val}**:`);
						const blockFormatted = block.split("\n").map((val) => val.trim()).filter((val, index) => {
							return index !== 0 && !ignorePrefixes.some((prefix) => val.startsWith(prefix)) && !/<a name=".*"><\/a>/gmu.test(val);
						}).join("\n").trim();

						fileContents = fileContents.replace(full, blockFormatted);
					}
				} while (match);

				await fs.writeFile(fileName, fileContents);
			}
		}
	}

	await main(docsSrcPath);
})();
