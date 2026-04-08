const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./perf.config");

let Bench;
async function loadTinybench () {
	if (!Bench) {
		const tinybench = await import("tinybench");
		Bench = tinybench.Bench;
	}
	return Bench;
}

/**
 * Generates a deterministic hardware fingerprint from system info.
 * This ensures baselines are only compared against runs from the same
 * machine/environment (e.g., same CPU, same Node.js major version).
 */
function getHardwareFingerprint () {
	const cpuModel = os.cpus()[0]?.model || "unknown";
	const cpuCount = os.cpus().length;
	const nodeMajor = process.version.split(".")[0];
	const platform = os.platform();
	const arch = os.arch();

	const raw = `${cpuModel}|${cpuCount}|${nodeMajor}|${platform}|${arch}`;
	const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);

	return {
		hash,
		"details": {cpuModel, cpuCount, nodeMajor, platform, arch}
	};
}

/**
 * Gets the baseline file path for a given suite name and hardware fingerprint.
 */
function getBaselinePath (suiteName, fingerprintHash) {
	const dir = path.resolve(__dirname, config.baselinesDir);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {"recursive": true});
	}
	return path.join(dir, `${suiteName}-${fingerprintHash}.json`);
}

/**
 * Loads a previously saved baseline for the given suite and hardware fingerprint.
 * Returns null if no baseline exists.
 */
function loadBaseline (suiteName, fingerprintHash) {
	const filePath = getBaselinePath(suiteName, fingerprintHash);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Saves the current results as a new baseline.
 */
function saveBaseline (suiteName, fingerprintHash, results) {
	const filePath = getBaselinePath(suiteName, fingerprintHash);
	fs.writeFileSync(filePath, JSON.stringify(results, null, "\t"));
}

/**
 * Compares current results against a baseline and detects regressions.
 * Returns an array of comparison objects for each test.
 */
function detectRegressions (currentResults, baseline, options = {}) {
	const warningThreshold = options.warningThreshold ?? config.warningThreshold;
	const failureThreshold = options.failureThreshold ?? config.failureThreshold;

	return currentResults.map((current) => {
		const baselineTest = baseline.tests.find((b) => b.name === current.name);
		if (!baselineTest) {
			return {...current, "status": "new", "percentChange": null};
		}

		// Compare mean execution times (higher mean = slower = regression)
		const percentChange = (current.meanTime - baselineTest.meanTime) / baselineTest.meanTime * 100;

		let status = "pass";
		if (percentChange > failureThreshold) {
			status = "fail";
		} else if (percentChange > warningThreshold) {
			status = "warn";
		} else if (percentChange < -warningThreshold) {
			status = "improved";
		}

		return {
			...current,
			status,
			percentChange,
			"baselineMeanTime": baselineTest.meanTime,
			"baselineOpsPerSec": baselineTest.opsPerSec
		};
	});
}

/**
 * Formats a number of nanoseconds into a human-readable string.
 */
function formatTime (ns) {
	if (ns < 1000) {
		return `${ns.toFixed(2)} ns`;
	} else if (ns < 1_000_000) {
		return `${(ns / 1000).toFixed(2)} µs`;
	} else if (ns < 1_000_000_000) {
		return `${(ns / 1_000_000).toFixed(2)} ms`;
	}
	return `${(ns / 1_000_000_000).toFixed(2)} s`;
}

/**
 * Formats a number with commas for readability.
 */
function formatNumber (num) {
	return Math.round(num).toLocaleString();
}

/**
 * Pads a string to a given length.
 */
function padEnd (str, len) {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

/**
 * Pads a string to a given length from the start.
 */
function padStart (str, len) {
	return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

const STATUS_ICONS = {
	"pass": "\x1b[32m✓\x1b[0m",
	"warn": "\x1b[33m⚠\x1b[0m",
	"fail": "\x1b[31m✗\x1b[0m",
	"improved": "\x1b[36m↑\x1b[0m",
	"new": "\x1b[34m●\x1b[0m"
};

const STATUS_LABELS = {
	"pass": "\x1b[32mpass\x1b[0m",
	"warn": "\x1b[33mwarning\x1b[0m",
	"fail": "\x1b[31mFAIL\x1b[0m",
	"improved": "\x1b[36mimproved\x1b[0m",
	"new": "\x1b[34mnew\x1b[0m"
};

/**
 * Prints results in a human-readable CLI table format.
 */
function printCliResults (suiteName, comparedResults, fingerprint, hasBaseline) {
	console.log("");
	console.log(`\x1b[1m  Performance: ${suiteName}\x1b[0m`);
	console.log(`  Hardware: ${fingerprint.details.cpuModel} (${fingerprint.details.cpuCount} cores)`);
	console.log(`  Node.js: ${process.version} | ${fingerprint.details.platform}/${fingerprint.details.arch}`);
	console.log(`  Fingerprint: ${fingerprint.hash}`);
	console.log("");

	if (!hasBaseline) {
		console.log("  \x1b[33mNo baseline found for this hardware. Run with --save-baseline to create one.\x1b[0m");
		console.log("");
	}

	// Table header
	const nameWidth = Math.max(20, ...comparedResults.map((r) => r.name.length)) + 2;
	const header = `  ${padEnd("Test", nameWidth)} ${padStart("ops/sec", 14)} ${padStart("Mean", 14)} ${padStart("Margin", 10)} ${hasBaseline ? padStart("vs Baseline", 14) + " Status" : ""}`;
	console.log(header);
	console.log("  " + "─".repeat(header.length - 2));

	for (const result of comparedResults) {
		const name = padEnd(result.name, nameWidth);
		const ops = padStart(formatNumber(result.opsPerSec), 14);
		const mean = padStart(formatTime(result.meanTime), 14);
		const margin = padStart(`±${result.marginOfError.toFixed(2)}%`, 10);

		let comparison = "";
		if (hasBaseline && result.percentChange !== null) {
			const sign = result.percentChange > 0 ? "+" : "";
			const color = result.percentChange > config.warningThreshold ? "\x1b[31m" : result.percentChange < -config.warningThreshold ? "\x1b[36m" : "\x1b[0m";
			comparison = `${padStart(`${color}${sign}${result.percentChange.toFixed(1)}%\x1b[0m`, 23)} ${STATUS_ICONS[result.status]} ${STATUS_LABELS[result.status]}`;
		} else if (hasBaseline && result.status === "new") {
			comparison = `${padStart("—", 14)} ${STATUS_ICONS.new} ${STATUS_LABELS.new}`;
		}

		console.log(`  ${name} ${ops} ${mean} ${margin} ${comparison}`);
	}

	console.log("");

	// Summary
	const failures = comparedResults.filter((r) => r.status === "fail");
	const warnings = comparedResults.filter((r) => r.status === "warn");
	const improved = comparedResults.filter((r) => r.status === "improved");

	if (failures.length > 0) {
		console.log(`  \x1b[31m✗ ${failures.length} regression(s) detected exceeding ${config.failureThreshold}% threshold\x1b[0m`);
	}
	if (warnings.length > 0) {
		console.log(`  \x1b[33m⚠ ${warnings.length} warning(s) exceeding ${config.warningThreshold}% threshold\x1b[0m`);
	}
	if (improved.length > 0) {
		console.log(`  \x1b[36m↑ ${improved.length} test(s) improved\x1b[0m`);
	}
	if (failures.length === 0 && warnings.length === 0 && hasBaseline) {
		console.log("  \x1b[32m✓ No regressions detected\x1b[0m");
	}

	console.log("");

	return failures.length;
}

/**
 * Outputs results in JSON format for CI consumption (github-action-benchmark compatible).
 */
function outputJsonResults (suiteName, comparedResults, fingerprint) {
	const output = comparedResults.map((result) => ({
		"name": result.name,
		"unit": "ops/sec",
		"value": Math.round(result.opsPerSec),
		"range": `±${result.marginOfError.toFixed(2)}%`,
		"extra": [
			`Mean: ${formatTime(result.meanTime)}`,
			`Suite: ${suiteName}`,
			`Fingerprint: ${fingerprint.hash}`
		].join(" | ")
	}));
	return output;
}

/**
 * Main entry point: runs a performance test suite.
 *
 * @param {string} suiteName - Name of the test suite
 * @param {Function} setupFn - Function that receives a `bench` Tinybench instance to add tasks to
 * @param {object} [options] - Optional overrides for config
 * @returns {Promise<{results: object[], failures: number}>}
 */
async function runSuite (suiteName, setupFn, options = {}) {
	const time = options.time ?? config.time;
	const iterations = options.iterations ?? config.iterations;
	const warmupIterations = options.warmupIterations ?? config.warmupIterations;
	const outputFormat = process.env.PERF_OUTPUT_FORMAT || options.outputFormat || config.outputFormat;
	const saveBaselineFlag = process.argv.includes("--save-baseline");

	const fingerprint = getHardwareFingerprint();

	const BenchClass = await loadTinybench();

	// Create and configure the bench
	const bench = new BenchClass({time, iterations, warmupIterations});

	// Let the caller add tasks
	await setupFn(bench);

	// Run the benchmarks
	await bench.run();

	// Extract results
	const currentResults = bench.tasks.map((task) => {
		const result = task.result;
		const latency = result.latency;
		const throughput = result.throughput;
		return {
			"name": task.name,
			"opsPerSec": throughput.mean,
			"meanTime": latency.mean * 1_000_000, // convert ms to ns
			"medianTime": latency.p50 * 1_000_000,
			"stdDev": latency.sd * 1_000_000,
			"marginOfError": latency.rme,
			"samples": latency.samplesCount,
			"min": latency.min * 1_000_000,
			"max": latency.max * 1_000_000,
			"p75": latency.p75 * 1_000_000,
			"p99": latency.p99 * 1_000_000,
			"p995": latency.p995 * 1_000_000
		};
	});

	// Save baseline if requested
	if (saveBaselineFlag) {
		const baselineData = {
			"timestamp": new Date().toISOString(),
			"fingerprint": fingerprint,
			"tests": currentResults
		};
		saveBaseline(suiteName, fingerprint.hash, baselineData);
		if (outputFormat === "cli") {
			console.log(`  \x1b[32m✓ Baseline saved for "${suiteName}" (fingerprint: ${fingerprint.hash})\x1b[0m`);
		}
	}

	// Load baseline and compare
	const baseline = loadBaseline(suiteName, fingerprint.hash);
	let comparedResults;
	if (baseline) {
		comparedResults = detectRegressions(currentResults, baseline, options);
	} else {
		comparedResults = currentResults.map((r) => ({...r, "status": "new", "percentChange": null}));
	}

	// Output results
	let failures = 0;
	if (outputFormat === "json") {
		const jsonResults = outputJsonResults(suiteName, comparedResults, fingerprint);
		// In JSON mode, we append to a global results array
		if (!global.__perfResults) {
			global.__perfResults = [];
		}
		global.__perfResults.push(...jsonResults);
	} else {
		failures = printCliResults(suiteName, comparedResults, fingerprint, !!baseline);
	}

	return {"results": comparedResults, failures};
}

/**
 * Writes all accumulated JSON results to stdout (for CI).
 */
function flushJsonResults () {
	if (global.__perfResults && global.__perfResults.length > 0) {
		console.log(JSON.stringify(global.__perfResults, null, "\t"));
	}
}

module.exports = {
	runSuite,
	flushJsonResults,
	getHardwareFingerprint,
	loadBaseline,
	saveBaseline,
	detectRegressions
};
