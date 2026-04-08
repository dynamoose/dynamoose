export interface PerfConfig {
	warmupIterations: number;
	time: number;
	iterations: number;
	warningThreshold: number;
	failureThreshold: number;
	baselinesDir: string;
	outputFormat: string;
}

const config: PerfConfig = {
	// Number of warm-up iterations before measurement begins
	"warmupIterations": 10,

	// Time in milliseconds each benchmark runs for
	"time": 1000,

	// Minimum number of iterations per benchmark
	"iterations": 100,

	// Percentage slowdown that triggers a warning (yellow)
	"warningThreshold": 10,

	// Percentage slowdown that triggers a failure (red)
	"failureThreshold": 20,

	// Directory for storing baselines (relative to perf/)
	"baselinesDir": ".perf-baselines",

	// Output format: "cli" for pretty terminal output, "json" for CI consumption
	"outputFormat": "cli"
};

export default config;
