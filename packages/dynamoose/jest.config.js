module.exports = {
	"testMatch": ["**/test/**/*.[jt]s?(x)"],
	"testEnvironment": "./test/_environment.js",
	"setupFilesAfterEnv": ["./test/_setup.js"],
	"testPathIgnorePatterns": ["test/_setup.js", "test/_environment.js", "test/.eslintrc.js", "test/types/"],
	"coverageReporters": ["json", "lcov", "text", "html"],
	"transformIgnorePatterns": ["dist/.+\\.js", "test/.+\\.js"]
};
