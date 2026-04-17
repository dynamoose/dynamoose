import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import config from "./perf.config";

// --- Types ---

export interface HardwareDetails {
	cpuModel: string;
	cpuCount: number;
	nodeMajor: string;
	platform: string;
	arch: string;
}

export interface HardwareFingerprint {
	hash: string;
	details: HardwareDetails;
}

export interface BenchmarkResult {
	name: string;
	opsPerSec: number;
	meanTime: number;
	medianTime: number;
	stdDev: number;
	marginOfError: number;
	samples: number;
	min: number;
	max: number;
	p75: number;
	p99: number;
	p995: number;
}

export type ComparedStatus = "pass" | "warn" | "fail" | "improved" | "new";

export interface ComparedResult extends BenchmarkResult {
	status: ComparedStatus;
	percentChange: number | null;
	baselineMeanTime?: number;
	baselineOpsPerSec?: number;
}

export interface BaselineData {
	timestamp: string;
	fingerprint: HardwareFingerprint;
	tests: BenchmarkResult[];
}

export interface RunSuiteOptions {
	time?: number;
	iterations?: number;
	warmupIterations?: number;
	outputFormat?: string;
	warningThreshold?: number;
	failureThreshold?: number;
}

export interface RunSuiteResult {
	results: ComparedResult[];
	failures: number;
}

/**
 * Minimal interface for the Tinybench `Bench` instance exposed to benchmark setup functions.
 */
export interface BenchInstance {
	add(name: string, fn: () => void | Promise<void>): unknown;
}

interface JsonOutputEntry {
	name: string;
	unit: string;
	value: number;
	range: string;
	extra: string;
}

// Module-level accumulator for JSON results across suite runs
const jsonResultsAccumulator: JsonOutputEntry[] = [];

// Lazy-loaded Bench class from tinybench (ESM-only package)
let BenchClass: any;
async function loadTinybench (): Promise<any> {
	if (!BenchClass) {
		const tinybench = await import("tinybench");
		BenchClass = tinybench.Bench;
	}
	return BenchClass;
}

/**
 * Generates a deterministic hardware fingerprint from system info.
 * This ensures baselines are only compared against runs from the same
 * machine/environment (e.g., same CPU, same Node.js major version).
 */
export function getHardwareFingerprint (): HardwareFingerprint {
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
function getBaselinePath (suiteName: string, fingerprintHash: string): string {
	// Resolve relative to the perf/ directory (one level up from compiled dist/)
	const dir = path.resolve(__dirname, "..", config.baselinesDir);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {"recursive": true});
	}
	return path.join(dir, `${suiteName}-${fingerprintHash}.json`);
}

/**
 * Loads a previously saved baseline for the given suite and hardware fingerprint.
 * Returns null if no baseline exists.
 */
export function loadBaseline (suiteName: string, fingerprintHash: string): BaselineData | null {
	const filePath = getBaselinePath(suiteName, fingerprintHash);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Saves the current results as a new baseline.
 */
export function saveBaseline (suiteName: string, fingerprintHash: string, results: BaselineData): void {
	const filePath = getBaselinePath(suiteName, fingerprintHash);
	fs.writeFileSync(filePath, JSON.stringify(results, null, "\t"));
}

/**
 * Compares current results against a baseline and detects regressions.
 * Returns an array of comparison objects for each test.
 */
export function detectRegressions (currentResults: BenchmarkResult[], baseline: BaselineData, options: RunSuiteOptions = {}): ComparedResult[] {
	const warningThreshold = options.warningThreshold ?? config.warningThreshold;
	const failureThreshold = options.failureThreshold ?? config.failureThreshold;

	return currentResults.map((current) => {
		const baselineTest = baseline.tests.find((b) => b.name === current.name);
		if (!baselineTest) {
			return {...current, "status": "new" as const, "percentChange": null};
		}

		// Compare mean execution times (higher mean = slower = regression)
		const percentChange = (current.meanTime - baselineTest.meanTime) / baselineTest.meanTime * 100;

		let status: ComparedStatus = "pass";
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
function formatTime (ns: number): string {
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
function formatNumber (num: number): string {
	return Math.round(num).toLocaleString();
}

/**
 * Pads a string to a given length.
 */
function padEnd (str: string, len: number): string {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

/**
 * Pads a string to a given length from the start.
 */
function padStart (str: string, len: number): string {
	return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

const STATUS_ICONS: Record<ComparedStatus, string> = {
	"pass": "\x1b[32m✓\x1b[0m",
	"warn": "\x1b[33m⚠\x1b[0m",
	"fail": "\x1b[31m✗\x1b[0m",
	"improved": "\x1b[36m↑\x1b[0m",
	"new": "\x1b[34m●\x1b[0m"
};

const STATUS_LABELS: Record<ComparedStatus, string> = {
	"pass": "\x1b[32mpass\x1b[0m",
	"warn": "\x1b[33mwarning\x1b[0m",
	"fail": "\x1b[31mFAIL\x1b[0m",
	"improved": "\x1b[36mimproved\x1b[0m",
	"new": "\x1b[34mnew\x1b[0m"
};

/**
 * Prints results in a human-readable CLI table format.
 */
function printCliResults (suiteName: string, comparedResults: ComparedResult[], fingerprint: HardwareFingerprint, hasBaseline: boolean): number {
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
			let color = "\x1b[0m";
			if (result.percentChange > config.warningThreshold) {
				color = "\x1b[31m";
			} else if (result.percentChange < -config.warningThreshold) {
				color = "\x1b[36m";
			}
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
function outputJsonResults (suiteName: string, comparedResults: ComparedResult[], fingerprint: HardwareFingerprint): JsonOutputEntry[] {
	return comparedResults.map((result) => ({
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
}

/**
 * Main entry point: runs a performance test suite.
 *
 * A **suite** is a logical grouping of related benchmarks (e.g., "schema", "condition").
 * The `setupFn` receives a Tinybench `Bench` instance to add individual benchmarks to.
 */
export async function runSuite (suiteName: string, setupFn: (bench: BenchInstance) => void | Promise<void>, options: RunSuiteOptions = {}): Promise<RunSuiteResult> {
	const time = options.time ?? config.time;
	const iterations = options.iterations ?? config.iterations;
	const warmupIterations = options.warmupIterations ?? config.warmupIterations;
	const outputFormat = process.env.PERF_OUTPUT_FORMAT || options.outputFormat || config.outputFormat;
	const saveBaselineFlag = process.argv.includes("--save-baseline");

	const fingerprint = getHardwareFingerprint();

	const Bench = await loadTinybench();

	// Create and configure the bench
	const bench = new Bench({time, iterations, warmupIterations});

	// Let the caller add tasks
	await setupFn(bench);

	// Run the benchmarks
	await bench.run();

	// Extract results
	const currentResults: BenchmarkResult[] = bench.tasks.map((task: any) => {
		const result = task.result;
		const latency = result.latency;
		const throughput = result.throughput;
		return {
			"name": task.name as string,
			"opsPerSec": throughput.mean as number,
			"meanTime": (latency.mean as number) * 1_000_000, // convert ms to ns
			"medianTime": (latency.p50 as number) * 1_000_000,
			"stdDev": (latency.sd as number) * 1_000_000,
			"marginOfError": latency.rme as number,
			"samples": latency.samplesCount as number,
			"min": (latency.min as number) * 1_000_000,
			"max": (latency.max as number) * 1_000_000,
			"p75": (latency.p75 as number) * 1_000_000,
			"p99": (latency.p99 as number) * 1_000_000,
			"p995": (latency.p995 as number) * 1_000_000
		};
	});

	// Save baseline if requested
	if (saveBaselineFlag) {
		const baselineData: BaselineData = {
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
	let comparedResults: ComparedResult[];
	if (baseline) {
		comparedResults = detectRegressions(currentResults, baseline, options);
	} else {
		comparedResults = currentResults.map((r) => ({...r, "status": "new" as const, "percentChange": null}));
	}

	// Output results
	let failures = 0;
	if (outputFormat === "json") {
		const jsonResults = outputJsonResults(suiteName, comparedResults, fingerprint);
		jsonResultsAccumulator.push(...jsonResults);
	} else {
		failures = printCliResults(suiteName, comparedResults, fingerprint, !!baseline);
	}

	return {"results": comparedResults, failures};
}

/**
 * Writes all accumulated JSON results to stdout (for CI).
 */
export function flushJsonResults (): void {
	if (jsonResultsAccumulator.length > 0) {
		console.log(JSON.stringify(jsonResultsAccumulator, null, "\t"));
	}
}
