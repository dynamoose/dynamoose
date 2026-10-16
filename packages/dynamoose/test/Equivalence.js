// Runs every case of equivalence/corpus.js through the published build (dynamoose-baseline) and the
// current dist in the same process, and fails on any observable difference. Nothing is recorded to
// disk: the baseline is the published package.
const fs = require("fs");
const {builds, runCase} = require("../equivalence/compare");
const corpus = require("../equivalence/corpus");

describe("Equivalence with dynamoose-baseline", () => {
	beforeEach(() => {
		// Only Date is faked: timestamps, Date.now defaults and ttl values are the same on both builds.
		jest.useFakeTimers({
			"now": new Date("2026-10-14T12:00:00.000Z"),
			"doNotFake": ["hrtime", "nextTick", "performance", "queueMicrotask", "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "setImmediate", "clearImmediate", "setInterval", "clearInterval", "setTimeout", "clearTimeout"]
		});
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it("Should compare the published release with this build", () => {
		const {devDependencies} = require("../package.json");
		expect(fs.realpathSync(builds.baseline.directory)).not.toEqual(fs.realpathSync(builds.current.directory));
		expect(`npm:dynamoose@${builds.baseline.version}`).toEqual(devDependencies["dynamoose-baseline"]);
	});

	it("Should have unique case names", () => {
		const names = corpus.map((testCase) => testCase.name);
		expect(new Set(names).size).toEqual(names.length);
	});

	it("Should see a difference in an own __proto__ or constructor key and in key order", async () => {
		// JSON.parse makes "__proto__" an own key, as a DynamoDB request or a caller input can have it.
		const record = async (json) => (await runCase(builds.current, {"name": "snapshot", "run": (ctx) => ctx.step("value", () => JSON.parse(json))}, {})).steps;
		expect(await record("{\"__proto__\": {\"S\": \"old\"}}")).not.toStrictEqual(await record("{\"__proto__\": {\"S\": \"new\"}}"));
		expect(await record("{\"constructor\": {\"S\": \"old\"}}")).not.toStrictEqual(await record("{\"constructor\": {\"S\": \"new\"}}"));
		expect(await record("{\"a\": 1, \"b\": 2}")).not.toStrictEqual(await record("{\"b\": 2, \"a\": 1}"));
		expect(await record("{\"__proto__\": {\"S\": \"same\"}}")).toStrictEqual(await record("{\"__proto__\": {\"S\": \"same\"}}"));
	});

	it.each(corpus.map((testCase) => [testCase.name, testCase]))("%s", async (name, testCase) => {
		const fixtures = testCase.fixtures ? testCase.fixtures() : {};
		const baseline = await runCase(builds.baseline, testCase, fixtures);
		const current = await runCase(builds.current, testCase, fixtures);

		// A case must reach its steps, and the steps a case expects to fail must fail on the baseline,
		// so that a broken case cannot pass by comparing two identical errors.
		const labels = baseline.steps.map((step) => step.label);
		expect(new Set(labels).size).toEqual(labels.length);
		const outcomes = Object.fromEntries(baseline.steps.map((step) => [step.label, step.outcome]));
		expect(outcomes.run).toEqual("resolve");
		for (const label of testCase.failing || []) {
			expect([label, outcomes[label]]).toEqual([label, expect.stringMatching(/^(throw|reject)$/)]);
		}
		for (const [label, outcome] of Object.entries(outcomes)) {
			if (!(testCase.failing || []).includes(label)) {
				expect([label, outcome]).toEqual([label, expect.stringMatching(/^(return|resolve)$/)]);
			}
		}

		// A deliberate behaviour change lists its steps in `differs` (with a reason) until the
		// dynamoose-baseline alias moves to a release that has the change; then the steps match and
		// this fails, so the entry is removed.
		const differs = testCase.differs ? testCase.differs.steps : [];
		if (testCase.differs) {
			expect(testCase.differs.reason).toEqual(expect.stringMatching(/\S/u));
		}
		for (const label of differs) {
			const step = (result) => result.steps.find((entry) => entry.label === label);
			expect([label, step(current)]).not.toStrictEqual([label, step(baseline)]);
		}
		const compared = (result) => result.steps.filter((entry) => !differs.includes(entry.label));
		expect(compared(current)).toStrictEqual(compared(baseline));
	});
});
