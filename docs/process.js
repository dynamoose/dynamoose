const fs = require("fs").promises;
const path = require("path");
const mkdirp = require("mkdirp");

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
				// Copy file
				const fileName = filePath.replace("docs_src", "docs");
				await fs.copyFile(filePath, fileName);
			}
		}
	}

	await main(docsSrcPath);
})();
