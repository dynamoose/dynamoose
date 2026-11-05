// CPU-only benchmark: runs the same operations through the current build (`dist`) and the published
// baseline (`dynamoose-baseline`) in one process, against a stub DynamoDB client that never touches
// the network. Usage: node --expose-gc benchmarks/benchmark.js [--quick] [--json <file>]
// Profile one operation or stage: node --expose-gc benchmarks/benchmark.js --profile <name> <schema>
// [--build current|baseline] [--out <file>] [--quick]
// EXTRA_SCHEMA=<module> adds one more schema, in the shape of fixtures/order-schema.js.
// BASELINE=<package directory> replaces dynamoose-baseline with the build in that directory.
// CI gate: BASELINE=<base build> node --expose-gc benchmarks/benchmark.js --gate [--artifacts <directory>]
// [--quick] [--rounds <n>]. --quick: 2 rounds of 20 ms, never significant.
// BENCHMARK_SCALE_CURRENT=<factor> multiplies the current build's samples, only so a test can reach the
// gate's failure path.
const fs = require("fs");
const inspector = require("inspector");
const path = require("path");
const {performance} = require("perf_hooks");
const {promisify} = require("util");
const {loadBuild, publishedBaselineDirectory, currentDirectory} = require("./builds");
const {gate, isGated, gateVerdict, median} = require("./gate");
const schemas = {...require("./schemas").schemas};

const builds = {
	"baseline": loadBuild(process.env.BASELINE ? path.resolve(process.env.BASELINE) : publishedBaselineDirectory),
	"current": loadBuild(currentDirectory)
};
const currentScale = process.env.BENCHMARK_SCALE_CURRENT ? Number(process.env.BENCHMARK_SCALE_CURRENT) : 1;
if (!(currentScale > 0 && Number.isFinite(currentScale))) {
	throw new Error(`BENCHMARK_SCALE_CURRENT must be a positive number, got "${process.env.BENCHMARK_SCALE_CURRENT}"`);
}

if (process.env.EXTRA_SCHEMA) {
	const extra = require(path.resolve(process.env.EXTRA_SCHEMA));
	if (!extra.name || schemas[extra.name]) {
		throw new Error(`EXTRA_SCHEMA must export a "name" that is not taken, got "${extra.name}"`);
	}
	schemas[extra.name] = extra;
}

// Each operation gets a fresh input from `prepare` (not timed), then `run` is timed.
const operations = {
	"create": {
		"prepare": (s) => new s.Model(s.config.data()),
		"run": (s, item) => item.save()
	},
	"create-request": {
		"prepare": (s) => new s.Model(s.config.data()),
		"run": (s, item) => item.save({"return": "request"})
	},
	"get": {
		"prepare": (s) => s.config.key(s.reference),
		"run": (s, key) => s.Model.get(key)
	},
	"update": {
		"prepare": (s) => [s.config.key(s.reference), s.config.update()],
		"run": (s, [key, update]) => s.Model.update(key, update)
	},
	"update-nested": {
		"needs": "nestedUpdate",
		"prepare": (s) => [s.config.key(s.reference), s.config.nestedUpdate()],
		"run": (s, [key, update]) => s.Model.update(key, update)
	}
};

// Report-only micro-benchmarks of internal stages. The settings copy the ones `save` and `get` pass.
// A lookup stage counts one pass over all attributes of the schema as one op.
const saveToDynamoSettings = {"type": "toDynamo", "defaults": true, "validate": true, "required": true, "enum": true, "forceDefault": true, "combine": true, "saveUnknown": true, "customTypesDynamo": true, "updateTimestamps": true, "modifiers": ["set"], "mapAttributes": true};
const getFromDynamoSettings = {"type": "fromDynamo", "customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "mapAttributes": true};
const saveConformSettings = {"type": "fromDynamo", "combine": true, "customTypesDynamo": true, "saveUnknown": true, "modifiers": ["get"], "mapAttributes": true};
const stages = {
	"getAttributeValue": {
		"prepare": (s) => s.attributes,
		"run": (s, attributes) => attributes.forEach((attribute) => s.schema.getAttributeValue(attribute))
	},
	"getAttributeTypeDetails": {
		"prepare": (s) => s.attributes,
		"run": (s, attributes) => attributes.forEach((attribute) => s.schema.getAttributeTypeDetails(attribute))
	},
	"attributes": {
		"prepare": () => undefined,
		"run": (s) => s.schema.attributes()
	},
	"getTypePaths": {
		"prepare": (s) => s.reference,
		"run": (s, object) => s.schema.getTypePaths(object, {"type": "toDynamo"})
	},
	"objectFromSchema-toDynamo": {
		"prepare": (s) => new s.Model(s.config.data()),
		"run": (s, item) => s.Item.objectFromSchema(item, s.Model.Model, saveToDynamoSettings)
	},
	"objectFromSchema-fromDynamo": {
		"prepare": (s) => new s.Model(s.stored, {"type": "fromDynamo"}),
		"run": (s, item) => s.Item.objectFromSchema(item, s.Model.Model, getFromDynamoSettings)
	},
	"save-conform": {
		"prepare": (s) => new s.Model(s.stored),
		"run": (s, item) => item.conformToSchema(saveConformSettings)
	}
};

// Canned responses keyed by table name: what DynamoDB would return for the stored reference item.
const storedItems = {};
const stubClient = {
	"putItem": () => Promise.resolve({}),
	"getItem": (params) => Promise.resolve({"Item": storedItems[params.TableName]}),
	"updateItem": (params) => Promise.resolve({"Attributes": storedItems[params.TableName]})
};

async function setup () {
	const suites = [];
	for (const [schemaName, config] of Object.entries(schemas)) {
		const tableName = `Benchmark_${schemaName}`;
		const models = {};
		const schemaInstances = {};
		for (const [buildName, build] of Object.entries(builds)) {
			build.dynamoose.aws.ddb.set(stubClient);
			schemaInstances[buildName] = config.create(build.dynamoose);
			models[buildName] = build.dynamoose.model(tableName, schemaInstances[buildName], {"create": false, "waitForActive": false});
		}
		const reference = config.data();
		const request = await new models.baseline(reference).save({"return": "request"});
		storedItems[tableName] = request.Item;
		const shared = {config, reference, models, schemaInstances, "stored": request.Item};
		for (const [operationName, operation] of Object.entries(operations)) {
			if (operation.needs && !config[operation.needs]) {
				continue;
			}
			suites.push({"kind": "operation", "schema": schemaName, "operation": operationName, "steps": operation, ...shared});
		}
		for (const [stageName, stage] of Object.entries(stages)) {
			suites.push({"kind": "stage", "schema": schemaName, "operation": stageName, "steps": stage, ...shared});
		}
	}
	return suites;
}

function stateFor (suite, buildName) {
	const schema = suite.schemaInstances[buildName];
	return {
		"Model": suite.models[buildName],
		"Item": builds[buildName].Item,
		schema,
		"attributes": schema.attributes(),
		"config": suite.config,
		"reference": suite.reference,
		"stored": suite.stored
	};
}

async function measure (suite, buildName, durationMs) {
	const state = stateFor(suite, buildName);
	let count = 0;
	let elapsed = 0;
	while (elapsed < durationMs) {
		const input = suite.steps.prepare(state);
		const start = performance.now();
		await suite.steps.run(state, input);
		elapsed += performance.now() - start;
		count++;
	}
	return count / (elapsed / 1000);
}

async function run (suites, {rounds, roundMs, warmupMs}) {
	const buildNames = Object.keys(builds);
	for (const suite of suites) {
		for (const buildName of buildNames) {
			await measure(suite, buildName, warmupMs);
		}
	}

	const samples = suites.map(() => ({"baseline": [], "current": []}));
	for (let round = 0; round < rounds; round++) {
		// Alternate which build goes first, so neither one always runs on a warmer heap.
		const order = round % 2 ? [...buildNames].reverse() : buildNames;
		for (const [index, suite] of suites.entries()) {
			for (const buildName of order) {
				global.gc();
				const scale = buildName === "current" ? currentScale : 1;
				samples[index][buildName].push(await measure(suite, buildName, roundMs) * scale);
			}
		}
	}

	return suites.map((suite, index) => {
		const baseline = median(samples[index].baseline);
		const current = median(samples[index].current);
		return {
			"kind": suite.kind,
			"schema": suite.schema,
			"operation": suite.operation,
			"baseline": {"median": baseline, "samples": samples[index].baseline},
			"current": {"median": current, "samples": samples[index].current},
			"change": (current / baseline - 1) * 100
		};
	});
}

// Columns listed in `leftColumns` are padded on the right, all others on the left.
function formatRows (rows, leftColumns) {
	const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
	return rows.map((row) => row.map((cell, column) => leftColumns.includes(column) ? cell.padEnd(widths[column]) : cell.padStart(widths[column])).join("  ").trimEnd()).join("\n");
}

const formatChange = (change) => `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;

function printTable (results, nameHeader) {
	const rows = [["schema", nameHeader, "baseline ops/s", "current ops/s", "change"]];
	for (const result of results) {
		rows.push([result.schema, result.operation, result.baseline.median.toFixed(1), result.current.median.toFixed(1), formatChange(result.change)]);
	}
	console.log(formatRows(rows, [0, 1]));
}

function displayFile (url) {
	if (!url) {
		return "(vm)";
	}
	const file = url.startsWith("file://") ? new URL(url).pathname : url;
	const nodeModules = file.lastIndexOf("/node_modules/");
	if (nodeModules !== -1) {
		return file.slice(nodeModules + 1);
	}
	return path.isAbsolute(file) ? path.relative(currentDirectory, file) : file;
}

// Self time: samples whose top frame is the function. Total time: samples with the function anywhere on
// the stack, counted once per sample so recursion does not count twice. Sample i lasts until sample i + 1.
function analyzeProfile (profile) {
	const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
	const parents = new Map();
	for (const node of profile.nodes) {
		for (const child of node.children || []) {
			parents.set(child, node.id);
		}
	}
	const functions = new Map();
	const functionOf = (node) => {
		const {functionName, url, lineNumber, columnNumber} = node.callFrame;
		const key = `${functionName}|${url}|${lineNumber}|${columnNumber}`;
		if (!functions.has(key)) {
			functions.set(key, {"name": functionName || "(anonymous)", "file": displayFile(url), "line": lineNumber + 1, "self": 0, "total": 0});
		}
		return functions.get(key);
	};
	const stacks = new Map();
	const stackOf = (id) => {
		if (!stacks.has(id)) {
			const stack = new Set();
			for (let current = id; current !== undefined; current = parents.get(current)) {
				const node = nodes.get(current);
				if (node.callFrame.functionName !== "(root)") {
					stack.add(functionOf(node));
				}
			}
			stacks.set(id, stack);
		}
		return stacks.get(id);
	};

	let totalTime = 0;
	for (let index = 0; index < profile.samples.length; index++) {
		const duration = profile.timeDeltas[index + 1] || 0;
		totalTime += duration;
		const id = profile.samples[index];
		functionOf(nodes.get(id)).self += duration;
		for (const entry of stackOf(id)) {
			entry.total += duration;
		}
	}

	const files = new Map();
	for (const entry of functions.values()) {
		files.set(entry.file, (files.get(entry.file) || 0) + entry.self);
	}
	return {totalTime, "functions": [...functions.values()], files};
}

function formatProfile ({totalTime, functions, files}, limit) {
	const ms = (microseconds) => (microseconds / 1000).toFixed(1);
	const share = (microseconds) => `${(microseconds / totalTime * 100).toFixed(1)}%`;
	const functionRows = (sortKey) => {
		const rows = [["self ms", "self", "total ms", "total", "function", "location"]];
		for (const entry of [...functions].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, limit)) {
			rows.push([ms(entry.self), share(entry.self), ms(entry.total), share(entry.total), entry.name, `${entry.file}:${entry.line}`]);
		}
		return rows;
	};
	const fileRows = [["self ms", "self", "file"]];
	for (const [file, self] of [...files].sort((a, b) => b[1] - a[1]).slice(0, limit)) {
		fileRows.push([ms(self), share(self), file]);
	}
	return [
		`\nprofiled ${ms(totalTime)} ms\n\ntop functions by self time`,
		formatRows(functionRows("self"), [4, 5]),
		"\ntop functions by total time",
		formatRows(functionRows("total"), [4, 5]),
		"\nself time per file",
		formatRows(fileRows, [2])
	].join("\n");
}

// The functions whose self time per call grew most from the baseline to the current profile. The two
// builds live in different directories and a change moves line numbers, so a function is matched by
// name and by its path inside its build directory, else from the first dist/ or node_modules/ on.
function compareProfiles (baseline, current, limit) {
	const perCall = ({analysis, calls, directory}) => {
		const prefix = `${displayFile(directory)}/`;
		const times = new Map();
		for (const entry of analysis.functions) {
			const file = entry.file.startsWith(prefix) ? entry.file.slice(prefix.length) : entry.file.replace(/^.*?(node_modules\/|dist\/)/u, "$1");
			const key = `${entry.name} ${file}`;
			times.set(key, (times.get(key) || 0) + entry.self / calls);
		}
		return times;
	};
	const before = perCall(baseline);
	const after = perCall(current);
	const growth = [...new Set([...before.keys(), ...after.keys()])].map((key) => ({key, "baseline": before.get(key) || 0, "current": after.get(key) || 0}));
	const rows = [["baseline µs/call", "current µs/call", "growth µs/call", "function and file"]];
	for (const entry of growth.sort((a, b) => b.current - b.baseline - (a.current - a.baseline)).slice(0, limit)) {
		rows.push([entry.baseline.toFixed(1), entry.current.toFixed(1), (entry.current - entry.baseline).toFixed(1), entry.key]);
	}
	return `self time per call, largest growth first\n${formatRows(rows, [3])}`;
}

function findSuite (suites, name, schema) {
	const suite = suites.find((suite) => suite.schema === schema && suite.operation === name);
	if (!suite) {
		const known = [...new Set(suites.map((suite) => `${suite.operation} ${suite.schema}`))];
		throw new Error(`Unknown operation "${name}" on schema "${schema}". Known:\n${known.join("\n")}`);
	}
	return suite;
}

async function profileSuite (suite, buildName, {warmupMs, durationMs, outFile}) {
	// The warm-up also sizes the run, so that all inputs exist before the profiler starts.
	const opsPerSecond = await measure(suite, buildName, warmupMs);
	const state = stateFor(suite, buildName);
	const inputs = Array.from({"length": Math.max(1, Math.ceil(opsPerSecond * durationMs / 1000))}, () => suite.steps.prepare(state));
	global.gc();

	const session = new inspector.Session();
	session.connect();
	const post = promisify(session.post.bind(session));
	await post("Profiler.enable");
	await post("Profiler.setSamplingInterval", {"interval": 100});
	await post("Profiler.start");
	for (const input of inputs) {
		await suite.steps.run(state, input);
	}
	const {"profile": cpuProfile} = await post("Profiler.stop");
	session.disconnect();

	fs.writeFileSync(outFile, JSON.stringify(cpuProfile));
	return {"analysis": analyzeProfile(cpuProfile), "calls": inputs.length, "directory": builds[buildName].directory};
}

async function profile ({name, schema, buildName, warmupMs, durationMs, outFile}) {
	if (!builds[buildName]) {
		throw new Error(`Unknown build "${buildName}", use current or baseline`);
	}
	const suite = findSuite(await setup(), name, schema);
	const {analysis, calls} = await profileSuite(suite, buildName, {warmupMs, durationMs, outFile});
	console.log(`${name} on ${schema}, ${buildName} build ${builds[buildName].version}, ${calls} calls, profile written to ${outFile}`);
	console.log(formatProfile(analysis, 25));
}

function printGateTable (results) {
	const rows = [["schema", "operation", "baseline ops/s", "current ops/s", "change", "p", "verdict"]];
	for (const result of results) {
		const {change, p, slower} = gateVerdict(result.baseline.samples, result.current.samples);
		rows.push([result.schema, result.operation, result.baseline.median.toFixed(1), result.current.median.toFixed(1), formatChange(change), p.toPrecision(2), slower ? "SLOWER" : "ok"]);
	}
	console.log(formatRows(rows, [0, 1, 6]));
}

async function runGate ({settings, profileSettings, artifactsDirectory}) {
	const slower = (result) => isGated(result) && gateVerdict(result.baseline.samples, result.current.samples).slower;
	const suites = (await setup()).filter((suite) => gate.schemas.includes(suite.schema));
	const results = await run(suites, settings);
	console.log(`gate: fails on a median slowdown over ${gate.maxSlowdownPercent}% with p < ${gate.alpha} (one-sided Mann-Whitney U), confirmed by a second run`);
	printGateTable(results.filter(isGated));
	console.log("\noperations (report only)");
	printTable(results.filter((result) => result.kind === "operation" && !isGated(result)), "operation");
	console.log("\nstages (report only)");
	printTable(results.filter((result) => result.kind === "stage"), "stage");

	let failed = results.filter(slower);
	if (failed.length === 0) {
		return true;
	}
	console.log(`\n${failed.map((result) => `${result.operation} ${result.schema}`).join(", ")} slower, running again to confirm`);
	const rerun = await run(failed.map((result) => findSuite(suites, result.operation, result.schema)), settings);
	printGateTable(rerun);
	failed = rerun.filter(slower);
	if (failed.length === 0) {
		console.log("not confirmed, gate passes");
		return true;
	}

	fs.mkdirSync(artifactsDirectory, {"recursive": true});
	for (const result of failed) {
		const suite = findSuite(suites, result.operation, result.schema);
		const profiles = {};
		for (const buildName of Object.keys(builds)) {
			const base = path.join(artifactsDirectory, `${buildName}-${result.schema}-${result.operation}`);
			profiles[buildName] = await profileSuite(suite, buildName, {...profileSettings, "outFile": `${base}.cpuprofile`});
			fs.writeFileSync(`${base}.txt`, `${result.operation} on ${result.schema}, ${buildName} build (${builds[buildName].directory}), ${profiles[buildName].calls} calls\n${formatProfile(profiles[buildName].analysis, 25)}\n`);
		}
		const comparison = compareProfiles(profiles.baseline, profiles.current, 15);
		fs.writeFileSync(path.join(artifactsDirectory, `${result.schema}-${result.operation}-comparison.txt`), `${comparison}\n`);
		console.log(`\nconfirmed slowdown: ${result.operation} on ${result.schema}\n${comparison}`);
	}
	console.log(`\nprofiles and summaries written to ${artifactsDirectory}`);
	return false;
}

async function main (args) {
	if (typeof global.gc !== "function") {
		throw new Error("Run with node --expose-gc");
	}
	const quick = args.includes("--quick");
	const option = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
	const quickSettings = {"rounds": 2, "roundMs": 20, "warmupMs": 20};
	const profileSettings = quick ? {"warmupMs": 50, "durationMs": 300} : {"warmupMs": 1000, "durationMs": 5000};
	const profileIndex = args.indexOf("--profile");
	if (profileIndex !== -1) {
		const [name, schema] = args.slice(profileIndex + 1, profileIndex + 3);
		const buildName = option("--build") || "current";
		await profile({
			name,
			schema,
			buildName,
			...profileSettings,
			"outFile": option("--out") || `${buildName}-${schema}-${name}.cpuprofile`
		});
		return;
	}
	if (args.includes("--gate")) {
		// Without BASELINE the gate would compare with the published release, not with the base branch.
		if (!process.env.BASELINE) {
			throw new Error("--gate needs BASELINE=<package directory of the base build>");
		}
		const settings = quick ? quickSettings : {"rounds": 20, "roundMs": 150, "warmupMs": 300};
		if (args.includes("--rounds")) {
			const rounds = option("--rounds");
			if (!/^[1-9]\d*$/u.test(rounds === undefined ? "" : rounds)) {
				throw new Error(`--rounds must be a positive integer, got "${rounds}"`);
			}
			settings.rounds = Number(rounds);
		}
		console.log(`baseline ${builds.baseline.directory} vs current ${builds.current.directory}, node ${process.version}, ${settings.rounds} rounds of ${settings.roundMs} ms`);
		const passed = await runGate({
			settings,
			profileSettings,
			"artifactsDirectory": option("--artifacts") || "benchmark-gate"
		});
		if (!passed) {
			process.exitCode = 1;
		}
		return;
	}
	const jsonFile = option("--json");
	const settings = quick ? quickSettings : {"rounds": 10, "roundMs": 200, "warmupMs": 500};

	console.log(`baseline ${builds.baseline.version} vs current ${builds.current.version} (dist), node ${process.version}, ${settings.rounds} rounds of ${settings.roundMs} ms`);
	const all = await run(await setup(), settings);
	const results = all.filter((result) => result.kind === "operation");
	const stageResults = all.filter((result) => result.kind === "stage");
	printTable(results, "operation");
	console.log("\nstages (report only)");
	printTable(stageResults, "stage");
	if (jsonFile) {
		const output = {"node": process.version, "builds": {"baseline": builds.baseline.version, "current": builds.current.version}, ...settings, results, "stages": stageResults};
		fs.writeFileSync(jsonFile, JSON.stringify(output, null, "\t"));
	}
}

if (require.main === module) {
	main(process.argv.slice(2)).catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
