const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// The CI gate fails a pull request only on a slowdown of a gated operation that is large, significant
// and still there in a second run. All other operations and the stages are report only.
const gate = {
	"schemas": ["large", "order"],
	"operations": ["create", "get", "update"],
	"maxSlowdownPercent": 15,
	"alpha": 0.01
};
const isGated = (result) => result.kind === "operation" && gate.schemas.includes(result.schema) && gate.operations.includes(result.operation);

const normalCdf = (z) => {
	// Abramowitz and Stegun 7.1.26, error below 1.5e-7.
	const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
	const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z / 2);
	return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};

// One-sided Mann-Whitney U test, normal approximation with tie and continuity correction: the
// probability that samples `a` rank this low against samples `b` by chance.
function mannWhitneyLess (a, b) {
	const all = [...a.map((value) => ({value, "fromA": true})), ...b.map((value) => ({value, "fromA": false}))].sort((x, y) => x.value - y.value);
	let rankSumA = 0;
	let tieTerm = 0;
	for (let start = 0; start < all.length;) {
		let end = start;
		while (end + 1 < all.length && all[end + 1].value === all[start].value) {
			end++;
		}
		const ties = end - start + 1;
		tieTerm += ties ** 3 - ties;
		for (let index = start; index <= end; index++) {
			if (all[index].fromA) {
				rankSumA += (start + end) / 2 + 1;
			}
		}
		start = end + 1;
	}
	const n = all.length;
	const u = rankSumA - a.length * (a.length + 1) / 2;
	const mean = a.length * b.length / 2;
	const sd = Math.sqrt(a.length * b.length / 12 * (n + 1 - tieTerm / (n * (n - 1))));
	return sd === 0 ? 1 : normalCdf((u - mean + 0.5) / sd);
}

function gateVerdict (baselineSamples, currentSamples) {
	const baseline = median(baselineSamples);
	const current = median(currentSamples);
	const change = (current / baseline - 1) * 100;
	const p = mannWhitneyLess(currentSamples, baselineSamples);
	// Compared as a product, not through `change`: (85 / 100 - 1) * 100 is -15.000000000000002.
	return {change, p, "slower": current < baseline * (1 - gate.maxSlowdownPercent / 100) && p < gate.alpha};
}

module.exports = {gate, isGated, gateVerdict, median};
