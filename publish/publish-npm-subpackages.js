const exec = require("./exec");
const path = require("path");

(async () => {
	const workspacePackages = require("./workspacePackages");
	for (const pkg of workspacePackages) {
		console.log(`[${pkg}] Starting publish`);

		console.log((await exec("which node")).output);
		console.log((await exec("which npm")).output);
		console.log((await exec("node -v")).output);
		console.log((await exec("npm -v")).output);

		console.log(`[${pkg}] npm install`);
		await exec("npm install", {
			"cwd": path.resolve(__dirname, "..", "workspaces", pkg)
		});
		console.log(`[${pkg}] npm publish --tag ${process.env.TAG}`);
		await exec(`npm publish --tag ${process.env.TAG}`, {
			"env": {
				"NODE_AUTH_TOKEN": process.env.NODE_AUTH_TOKEN
			},
			"cwd": path.resolve(__dirname, "..", "workspaces", pkg)
		});
		console.log(`[${pkg}] Finished publish`);
	}
})();
