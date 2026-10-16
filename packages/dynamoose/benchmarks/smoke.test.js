const {execFileSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {publishedBaselineDirectory} = require("./builds");

const benchmark = path.join(__dirname, "benchmark.js");
const stages = ["getAttributeValue", "getAttributeTypeDetails", "attributes", "getTypePaths", "objectFromSchema-toDynamo", "objectFromSchema-fromDynamo", "save-conform"];

describe("benchmark --quick", () => {
	let directory;
	let output;
	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-benchmark-"));
		const jsonFile = path.join(directory, "results.json");
		execFileSync(process.execPath, ["--expose-gc", benchmark, "--quick", "--json", jsonFile], {"stdio": "pipe"});
		output = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
	});
	afterAll(() => {
		fs.rmSync(directory, {"recursive": true, "force": true});
	});

	// A dropped operation or an operation that never ran would make a comparison silently incomplete.
	it("Should report every operation of every schema", () => {
		expect(output.results.map((result) => `${result.schema} ${result.operation}`)).toEqual([
			"small create",
			"small create-request",
			"small get",
			"small update",
			"medium create",
			"medium create-request",
			"medium get",
			"medium update",
			"medium update-nested",
			"large create",
			"large create-request",
			"large get",
			"large update",
			"large update-nested",
			"extra-large create",
			"extra-large create-request",
			"extra-large get",
			"extra-large update",
			"extra-large update-nested",
			"order create",
			"order create-request",
			"order get",
			"order update",
			"order update-nested"
		]);
	});

	it("Should report every stage of every schema", () => {
		const schemas = ["small", "medium", "large", "extra-large", "order"];
		expect(output.stages.map((result) => `${result.schema} ${result.operation}`)).toEqual(schemas.flatMap((schema) => stages.map((stage) => `${schema} ${stage}`)));
	});

	it("Should report a positive finite ops/s for both builds", () => {
		for (const result of [...output.results, ...output.stages]) {
			for (const build of ["baseline", "current"]) {
				expect(Number.isFinite(result[build].median) && result[build].median > 0).toBe(true);
			}
		}
	});
});

describe("benchmark --profile", () => {
	let directory;
	let stdout;
	let profileFile;
	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-profile-"));
		profileFile = path.join(directory, "update.cpuprofile");
		stdout = execFileSync(process.execPath, ["--expose-gc", benchmark, "--profile", "update", "large", "--quick", "--out", profileFile], {"encoding": "utf8"});
	});
	afterAll(() => {
		fs.rmSync(directory, {"recursive": true, "force": true});
	});

	it("Should write a CPU profile with samples", () => {
		const profile = JSON.parse(fs.readFileSync(profileFile, "utf8"));
		expect(profile.nodes.length).toBeGreaterThan(1);
		expect(profile.samples.length).toBeGreaterThan(0);
	});

	// The profile must cover the operation of the chosen build: the current build's Schema.js does the
	// lookups of an update, so it must show up among the functions and the files.
	it("Should print functions and files of the profiled build", () => {
		const section = (title) => stdout.split(`\n${title}\n`)[1].split("\n\n")[0];
		expect(section("top functions by self time")).toMatch(/ dist\/Schema\.js:\d+/);
		expect(section("top functions by total time")).toMatch(/Item\.objectFromSchema +dist\/Item\.js:\d+/);
		expect(section("self time per file")).toMatch(/ dist\/Schema\.js$/m);
	});
});

// The CI gate runs this mode.
describe("benchmark --gate", () => {
	const gate = (args, env) => execFileSync(process.execPath, ["--expose-gc", benchmark, "--gate", ...args], {"encoding": "utf8", "stdio": "pipe", "env": {...process.env, "BASELINE": publishedBaselineDirectory, ...env}});

	// Two quick rounds can never reach significance, so it must pass.
	it("Should gate create, get and update on large and order, the rest report only", () => {
		const stdout = gate(["--quick"]);
		const table = (title) => stdout.split(`${title}\n`)[1].split("\n\n")[0].trimEnd().split("\n").slice(1).map((line) => line.split(/ +/u).slice(0, 2).join(" "));
		expect(table("confirmed by a second run")).toEqual(["large create", "large get", "large update", "order create", "order get", "order update"]);
		expect(table("operations (report only)")).toEqual(["large create-request", "large update-nested", "order create-request", "order update-nested"]);
		expect(table("stages (report only)")).toEqual(["large", "order"].flatMap((schema) => stages.map((stage) => `${schema} ${stage}`)));
		expect(stdout).not.toMatch(/SLOWER/u);
	});

	// Without BASELINE the gate would silently compare with the published release, not the base branch.
	it("Should refuse to run without BASELINE", () => {
		expect(() => gate(["--quick"], {"BASELINE": ""})).toThrow(/--gate needs BASELINE/u);
	});

	// Zero rounds give no samples: NaN medians, every verdict ok and a passing gate.
	it("Should refuse an invalid round count or scale", () => {
		expect(() => gate(["--quick", "--rounds", "0"])).toThrow(/--rounds must be a positive integer, got "0"/u);
		expect(() => gate(["--quick"], {"BENCHMARK_SCALE_CURRENT": "abc"})).toThrow(/BENCHMARK_SCALE_CURRENT must be a positive number/u);
	});

	// The current build's samples scaled to a tenth make every gated row much slower, in every round.
	it("Should fail, re-run and write profiles and comparisons for a confirmed slowdown", () => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-gate-"));
		try {
			let failure;
			try {
				gate(["--quick", "--rounds", "8", "--artifacts", directory], {"BENCHMARK_SCALE_CURRENT": "0.1"});
			} catch (error) {
				failure = error;
			}
			expect(failure.status).toEqual(1);
			expect(failure.stdout).toMatch(/slower, running again to confirm/u);
			expect(failure.stdout).toMatch(/confirmed slowdown: create on large/u);
			const files = fs.readdirSync(directory);
			for (const name of ["baseline-large-create.cpuprofile", "baseline-large-create.txt", "current-large-create.cpuprofile", "current-large-create.txt", "large-create-comparison.txt"]) {
				expect(files).toContain(name);
			}
			expect(fs.readFileSync(path.join(directory, "large-create-comparison.txt"), "utf8")).toMatch(/^self time per call, largest growth first\n/u);
		} finally {
			fs.rmSync(directory, {"recursive": true, "force": true});
		}
	});
});

// A schema from outside the repository runs through EXTRA_SCHEMA; a module it cannot load must not pass
// unnoticed as a run without that schema.
describe("benchmark EXTRA_SCHEMA", () => {
	it("Should run an operation on the extra schema", () => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-extra-"));
		try {
			const moduleFile = path.join(directory, "extra.js");
			fs.writeFileSync(moduleFile, `module.exports = {...require(${JSON.stringify(path.join(__dirname, "fixtures", "order-schema.js"))}), "name": "extra"};`);
			const stdout = execFileSync(process.execPath, ["--expose-gc", benchmark, "--profile", "create-request", "extra", "--quick", "--out", path.join(directory, "extra.cpuprofile")], {"encoding": "utf8", "env": {...process.env, "EXTRA_SCHEMA": moduleFile}});
			expect(stdout).toMatch(/^create-request on extra, current build /);
		} finally {
			fs.rmSync(directory, {"recursive": true, "force": true});
		}
	});
});
