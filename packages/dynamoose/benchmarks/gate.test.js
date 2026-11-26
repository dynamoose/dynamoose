const {gateVerdict} = require("./gate");

// Samples are ops/s per round. The gate must fail a real slowdown and pass runner noise.
describe("gateVerdict", () => {
	const baseline = [100, 101, 99, 102, 98, 100, 101, 99, 100, 100];

	it("Should fail a 20% slowdown that every round shows", () => {
		expect(gateVerdict(baseline, [80, 81, 79, 82, 78, 80, 81, 79, 80, 80]).slower).toBe(true);
	});

	it("Should pass a 20% median slowdown when the rounds overlap (noise)", () => {
		expect(gateVerdict([100, 60, 140, 100, 60, 140, 100, 60, 140, 100], [80, 140, 60, 80, 140, 60, 80, 140, 60, 80]).slower).toBe(false);
	});

	// p is about 0.03: a gate with alpha loosened toward 0.1 would fail this row.
	it("Should pass a 20% median slowdown that is not significant at p < 0.01", () => {
		const result = gateVerdict(baseline, [80, 80, 80, 80, 80, 80, 102, 101, 99, 100]);
		expect(result.p).toBeGreaterThan(0.01);
		expect(result.slower).toBe(false);
	});

	it("Should pass a significant slowdown of exactly 15%", () => {
		const result = gateVerdict(baseline, [85, 85, 85, 85, 85, 85, 85, 85, 85, 85]);
		expect(result.p).toBeLessThan(0.01);
		expect(result.slower).toBe(false);
	});
});
