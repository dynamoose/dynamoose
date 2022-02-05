const exec = require("./exec");
const path = require("path");

(async () => {
	const workspacePackages = require("./workspacePackages");
	for (const pkg of workspacePackages) {
		await exec("npm install", {
			"cwd": path.resolve(__dirname, "..", "workspaces", pkg)
		});
		await exec(`npm publish --tag ${process.env.TAG}`, {
			"env": {
				"NODE_AUTH_TOKEN": process.env.NODE_AUTH_TOKEN
			},
			"cwd": path.resolve(__dirname, "..", "workspaces", pkg)
		});
	}
})();
