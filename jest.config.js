module.exports = {
	"setupFilesAfterEnv": ["./__tests__/_setup.js"],
	"testPathIgnorePatterns": ["__tests__/_setup.js"],
	"coverageReporters": ["json", "lcov", "text", "html"]
};