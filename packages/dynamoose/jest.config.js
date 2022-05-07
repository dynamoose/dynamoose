module.exports = {
	"testMatch": ["**/test/**/*.[jt]s?(x)"],
	"setupFilesAfterEnv": ["./test/_setup.js"],
	"testPathIgnorePatterns": ["test/_setup.js", "test/.eslintrc.js", "test/types/"],
	"coverageReporters": ["json", "lcov", "text", "html"],
	"transformIgnorePatterns": ["dist/.+\\.js", "test/.+\\.js"]
};
