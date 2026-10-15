// Smoke test of the benchmark runner (benchmarks/benchmark.js). It lives outside test/ so the unit
// suite never runs the benchmark.
module.exports = {
	"testMatch": ["**/benchmarks/**/*.test.js"],
	"testTimeout": 120000
};
