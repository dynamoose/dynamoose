module.exports = {
	"exclude": [
		"test",
		"coverage",
		".eslintrc.js",
		".mocharc.js",
		"publish",
		"utils/source-map-stacktrace-parser",
		"docs",
		"nyc.config.js"
	],
	"all": true,
	"reporter": [
		"html",
		"text",
		"lcovonly"
	]
};
