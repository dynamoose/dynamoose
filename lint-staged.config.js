const { CLIEngine } = require("eslint");
const cli = new CLIEngine({});

module.exports = {
	"*.{js,ts}": (files) => `npm run lint:fix -- ${files.filter((file) => !cli.isPathIgnored(file)).join(" ")}`
};
