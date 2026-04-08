import {flushJsonResults} from "./harness";
import * as path from "path";
import * as fs from "fs";

async function main (): Promise<void> {
	const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
	const benchmarkDir = path.join(__dirname, "benchmarks");

	// Discover all compiled benchmark files
	const allBenchmarkFiles = fs.readdirSync(benchmarkDir)
		.filter((f) => f.endsWith(".perf.js"))
		.map((f) => f.replace(".perf.js", ""));

	// If specific suites were requested via args, filter to those
	const suitesToRun = args.length > 0 ? allBenchmarkFiles.filter((name) => args.includes(name)) : allBenchmarkFiles;

	if (suitesToRun.length === 0) {
		console.error("No benchmark suites found to run.");
		console.error(`Available suites: ${allBenchmarkFiles.join(", ")}`);
		process.exit(1);
	}

	const outputFormat = process.env.PERF_OUTPUT_FORMAT || "cli";
	if (outputFormat === "cli") {
		console.log("\n\x1b[1m  Dynamoose Performance Tests\x1b[0m");
		console.log(`  Running ${suitesToRun.length} suite(s): ${suitesToRun.join(", ")}`);
		if (process.argv.includes("--save-baseline")) {
			console.log("  \x1b[33mMode: saving baselines\x1b[0m");
		}
	}

	let totalFailures = 0;
	for (const suite of suitesToRun) {
		const suiteMod = require(path.join(benchmarkDir, `${suite}.perf.js`));
		const suiteFn = suiteMod.default || suiteMod;
		const result = await suiteFn();
		if (result && result.failures) {
			totalFailures += result.failures;
		}
	}

	// Flush JSON output if in JSON mode
	if (outputFormat === "json") {
		flushJsonResults();
	}

	if (totalFailures > 0) {
		if (outputFormat === "cli") {
			console.log(`\x1b[31m  ✗ ${totalFailures} total regression(s) detected\x1b[0m\n`);
		}
		process.exit(1);
	} else if (outputFormat === "cli") {
		console.log("\x1b[32m  ✓ All performance tests passed\x1b[0m\n");
	}
}

main().catch((err) => {
	console.error("Performance test error:", err);
	process.exit(1);
});
