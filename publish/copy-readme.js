const fs = require("fs").promises;
const path = require("path");

(async () => {
	const packagesContents = await fs.readdir(path.join(__dirname, "..", "packages"));
	const packages = (await Promise.all(packagesContents.map(async (package) => {
		const isFolder = (await fs.stat(path.join(__dirname, "..", "packages", package))).isDirectory();
		return isFolder ? package : null;
	}))).filter((package) => Boolean(package));

	await Promise.all(packages.map(async (package) => {
		// Check if the package has a README.md file
		const readmePath = path.join(__dirname, "..", "packages", package, "README.md");
		if (!await fileExists(readmePath)) {
			// If not, copy the README.md file from the root of the project
			await fs.copyFile(path.join(__dirname, "..", "README.md"), readmePath);
		}
	}));
})();

const fileExists = async (filePath) => {
	try {
		await fs.access(filePath);
		return true;
	} catch (e) {
		return false;
	}
};
