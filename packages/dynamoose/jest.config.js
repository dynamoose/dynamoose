module.exports = {
	"testMatch": ["**/test/**/*.[jt]s?(x)"],
	"setupFilesAfterEnv": ["./test/_setup.js"],
	"testPathIgnorePatterns": ["test/_setup.js", "test/.eslintrc.js", "test/types/"],
	"coverageReporters": ["json", "lcov", "text", "html"],
	// The equivalence harness and the benchmark schemas are test tooling, not library code. The
	// suites load them, so without this they are instrumented and counted.
	"coveragePathIgnorePatterns": ["<rootDir>/equivalence/", "<rootDir>/benchmarks/"],
	"transformIgnorePatterns": ["dist/.+\\.js", "test/.+\\.js"]
};
