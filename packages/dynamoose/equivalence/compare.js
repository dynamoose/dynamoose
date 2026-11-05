// Runs one equivalence case through one dynamoose build and records everything a caller can observe:
// each DynamoDB request, each call to a user function (in order, interleaved with the requests), the
// value or error of each step and whether it was a synchronous throw or a rejected promise, and the
// state of every tracked object (caller inputs, Item instances) after each step.
// Values are recorded as plain trees, so two builds (whose classes differ) compare with toStrictEqual.
// Key order is recorded per step, as a list of [path, Object.keys(object)].
const {loadBuild, publishedBaselineDirectory, currentDirectory} = require("../benchmarks/builds");

// Always the published release: the BASELINE variable of the benchmark does not apply here.
const builds = {
	"baseline": loadBuild(publishedBaselineDirectory),
	"current": loadBuild(currentDirectory)
};

// The methods `lib/aws/ddb/internal.ts` calls on the client.
const ddbMethods = ["describeTable", "createTable", "updateTable", "updateTimeToLive", "describeTimeToLive", "listTagsOfResource", "tagResource", "untagResource", "getItem", "deleteItem", "updateItem", "putItem", "batchWriteItem", "batchGetItem", "query", "scan", "transactGetItems", "transactWriteItems"];

// Deep copy that keeps Date, Set, Map, Buffer and typed array instances, so each build gets the same
// input without sharing (and mutating) the other build's objects. Other non-plain objects throw.
function clone (value) {
	if (Buffer.isBuffer(value)) {
		return Buffer.from(value);
	}
	if (value instanceof Uint8Array) {
		return new Uint8Array(value);
	}
	if (value instanceof Date) {
		return new Date(value.getTime());
	}
	if (value instanceof Set) {
		return new Set([...value].map(clone));
	}
	if (value instanceof Map) {
		return new Map([...value].map(([key, entry]) => [clone(key), clone(entry)]));
	}
	if (Array.isArray(value)) {
		return value.map(clone);
	}
	if (value && typeof value === "object") {
		// Any other object would be shared by both builds, so a change one build makes would reach the other.
		if (Object.getPrototypeOf(value) !== Object.prototype) {
			throw new Error(`clone cannot copy a ${className(value)} object`);
		}
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
	}
	return value;
}

function className (value) {
	const prototype = Object.getPrototypeOf(value);
	if (prototype === null) {
		return "null";
	}
	return prototype.constructor ? prototype.constructor.name : "(no constructor)";
}

function snapshotter (build, keyOrder) {
	const {internalProperties} = build;
	const seen = new Map();

	function internalPropertiesOf (item) {
		try {
			return item.getInternalProperties(internalProperties);
		} catch (error) {
			if (error instanceof TypeError) {
				return undefined;
			}
			throw error;
		}
	}

	function ownKeys (value, path) {
		const keys = Object.keys(value);
		keyOrder.push([path, keys]);
		return keys;
	}

	function object (value, path, skip = []) {
		const result = {};
		for (const key of ownKeys(value, path)) {
			if (!skip.includes(key)) {
				// Not `result[key] =`: for "__proto__" that calls the inherited setter and adds no own key.
				Object.defineProperty(result, key, {"value": snapshot(value[key], `${path}.${key}`), "enumerable": true, "writable": true, "configurable": true});
			}
		}
		return result;
	}

	function snapshot (value, path) {
		switch (typeof value) {
		case "undefined":
		case "string":
		case "boolean":
		case "number":
		case "bigint":
			return value;
		case "symbol":
			return {"$symbol": value.description};
		case "function":
			return {"$function": value.name};
		}
		if (value === null) {
			return null;
		}
		if (seen.has(value)) {
			return {"$circular": seen.get(value)};
		}
		seen.set(value, path);
		try {
			if (Buffer.isBuffer(value)) {
				return {"$buffer": value.toString("hex")};
			}
			if (value instanceof Uint8Array) {
				return {"$uint8array": Array.from(value)};
			}
			if (value instanceof Date) {
				return {"$date": Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString()};
			}
			if (value instanceof Set) {
				return {"$set": [...value].map((entry, index) => snapshot(entry, `${path}<${index}>`))};
			}
			if (value instanceof Map) {
				return {"$map": [...value].map(([key, entry], index) => [snapshot(key, `${path}<key ${index}>`), snapshot(entry, `${path}<${index}>`)])};
			}
			if (value instanceof Error) {
				return {"$error": className(value), "name": value.name, "message": value.message, "props": object(value, path, ["stack"])};
			}
			// dynamoose's deep copy of an Item keeps the prototype but not the private internal properties.
			const internal = value instanceof build.Item ? internalPropertiesOf(value) : undefined;
			if (internal) {
				return {
					"$item": internal.model.getInternalProperties(internalProperties).name,
					"class": className(value),
					"storedInDynamo": internal.storedInDynamo,
					"original": snapshot(value.original(), `${path}.original()`),
					"own": object(value, path)
				};
			}
			if (Array.isArray(value)) {
				const indices = value.map((_, index) => `${index}`);
				const extra = ownKeys(value, path).filter((key) => !indices.includes(key));
				const result = {"$array": className(value), "items": value.map((entry, index) => snapshot(entry, `${path}[${index}]`))};
				if (extra.length) {
					result.props = Object.fromEntries(extra.map((key) => [key, snapshot(value[key], `${path}.${key}`)]));
				}
				return result;
			}
			const name = className(value);
			return name === "Object" ? object(value, path) : {"$class": name, "own": object(value, path)};
		} finally {
			seen.delete(value);
		}
	}

	return snapshot;
}

// A case is `{name, fixtures?, run (ctx)}`. `fixtures` runs once per comparison; each build gets a
// clone of its result, so random or clock-made data is the same on both sides.
async function runCase (build, testCase, fixtures) {
	const {dynamoose} = build;
	const keyOrder = [];
	const snapshot = snapshotter(build, keyOrder);
	const steps = [];
	const tracked = [];
	let events = [];
	const responses = {};

	const client = Object.fromEntries(ddbMethods.map((method) => [method, (params) => {
		events.push({"request": method, "params": snapshot(params, `request ${method}`)});
		const response = responses[method];
		return Promise.resolve(typeof response === "function" ? response(params) : clone(response || {}));
	}]));

	const prefix = testCase.name.replace(/[^A-Za-z0-9]+/g, "_");
	const ctx = {
		dynamoose,
		"fixtures": clone(fixtures),
		"name": (name) => `${prefix}_${name}`,
		"model": (name, schema, options) => dynamoose.model(ctx.name(name), schema, options),
		"respond": (method, response) => {
			responses[method] = response;
		},
		// Wraps a user function (default, set, get, validate) so that each call and its arguments are logged.
		"fn": (label, implementation) => function (...args) {
			events.push({"call": label, "args": snapshot(args, `call ${label}`)});
			return implementation.apply(this, args);
		},
		"track": (label, value) => {
			tracked.push([label, value]);
			return value;
		},
		"step": async (label, action) => {
			const record = {label};
			const finish = () => {
				record.events = events;
				events = [];
				record.tracked = tracked.map(([name, value]) => [name, snapshot(value, `${label}: ${name}`)]);
				record.keyOrder = keyOrder.splice(0);
				steps.push(record);
			};
			let result;
			try {
				result = action();
			} catch (error) {
				record.outcome = "throw";
				record.error = snapshot(error, `${label}: error`);
				finish();
				return undefined;
			}
			if (result && typeof result.then === "function") {
				try {
					const value = await result;
					record.outcome = "resolve";
					record.value = snapshot(value, `${label}: value`);
					finish();
					return value;
				} catch (error) {
					record.outcome = "reject";
					record.error = snapshot(error, `${label}: error`);
					finish();
					return undefined;
				}
			}
			record.outcome = "return";
			record.value = snapshot(result, `${label}: value`);
			finish();
			return result;
		}
	};

	dynamoose.aws.ddb.set(client);
	dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	try {
		await ctx.step("run", () => testCase.run(ctx));
	} finally {
		dynamoose.Table.defaults.set({});
		dynamoose.aws.ddb.revert();
	}
	return {steps};
}

module.exports = {builds, clone, runCase};
