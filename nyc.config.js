module.exports = {
	"exclude": [
		"test",
		"coverage",
		".eslintrc.js",
		".mocharc.js",
		"publish",
		"docs",
		"nyc.config.js",
		".huskyrc.js",
		"lint-staged.config.js",
	],
	"all": true,
	"reporter": ["html", "text", "lcovonly"],
};
