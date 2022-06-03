const exec = require("./exec");
const path = require("path");
const fs = require("fs").promises;

(async () => {
	const workspacePackages = require("./workspacePackages");
	const dynamoosePackage = require("../package.json");

	const allPackages = [...workspacePackages, dynamoosePackage.name];
	const dependencies = ["dependencies", "devDependencies", "peerDependencies"];

	for (const pkg of workspacePackages) {
		console.log(`[${pkg}] Starting publish`);

		console.log((await exec("which node")).output);
		console.log((await exec("which npm")).output);
		console.log((await exec("node -v")).output);
		console.log((await exec("npm -v")).output);

		const pacakgeJSONPath = path.resolve(__dirname, "..", "packages", pkg, "package.json");
		const packageJSON = await fs.readFile(pacakgeJSONPath);
		const packageJSONObject = JSON.parse(packageJSON);
		dependencies.forEach((depType) => {
			allPackages.forEach((pkg) => {
				if (packageJSONObject[depType] && packageJSONObject[depType][pkg]) {
					packageJSONObject[depType][pkg] = dynamoosePackage.version;
				}
			});
		});
		await fs.writeFile(pacakgeJSONPath, JSON.stringify(packageJSONObject, null, 2));

		console.log(`[${pkg}] npm install`);
		await exec("npm install", {
			"cwd": path.resolve(__dirname, "..", "packages", pkg)
		});
		console.log(`[${pkg}] npm publish --tag ${process.env.TAG}`);
		await exec(`npm publish --tag ${process.env.TAG}`, {
			"env": {
				"NODE_AUTH_TOKEN": process.env.NODE_AUTH_TOKEN
			},
			"cwd": path.resolve(__dirname, "..", "packages", pkg)
		});
		console.log(`[${pkg}] Finished publish`);
	}
})();
