import array_flatten from "./array_flatten";
import {ConditionStorageTypeNested} from "../Condition";
import {ModelIndexes} from "../Model";

interface IndexSpecification {
	tableIndex: boolean;
	indexName?: string;
}

const RANGE_TYPES = new Set(["EQ", "LE", "LT", "GE", "GT", "BETWEEN", "BEGINS_WITH"]);

export default function (modelIndexes: ModelIndexes, comparisonChart: ConditionStorageTypeNested): IndexSpecification {
	const annotated = array_flatten(Object.entries(modelIndexes)
		.map(([key, indexes]) => {
			indexes = Array.isArray(indexes) ? indexes : [indexes];
			return indexes.map((index) => {
				const {hash, range} = (index.KeySchema as {AttributeName: string; KeyType: string}[]).reduce((res: {hash: string[]; range: string[]}, item) => {
					res[item.KeyType.toLowerCase()].push(item.AttributeName);
					return res;
				}, {"hash": [], "range": []});

				index._hashKeys = hash;
				index._rangeKeys = range;
				index._tableIndex = key === "TableIndex";

				// All partition attributes must be conditioned with EQ.
				const allHashEq = hash.length > 0 && hash.every((attr) => comparisonChart[attr]?.type === "EQ");
				index._usable = allHashEq;

				// Longest left-to-right sort-key prefix that is conditioned (equality until an
				// inequality, which must be the last conditioned sort attr).
				let prefix = 0;
				let sawInequality = false;
				for (const attr of range) {
					const t = comparisonChart[attr]?.type;
					if (!t || !RANGE_TYPES.has(t)) {
						break;
					}
					if (t === "EQ") {
						if (sawInequality) {
							break;
						}
						prefix++;
					} else {
						if (sawInequality) {
							break;
						}
						prefix++;
						sawInequality = true;
					}
				}
				index._sortPrefix = prefix;

				// Mirrors the sort-key rules the query validator in ItemRetriever enforces: no condition
				// after an unconditioned attribute, and no condition after an inequality.
				let sortKeysValid = true;
				let unconditionedSeen = false;
				let inequalitySeen = false;
				for (const attr of range) {
					const t = comparisonChart[attr]?.type;
					if (!t || !RANGE_TYPES.has(t)) {
						unconditionedSeen = true;
					} else if (unconditionedSeen || inequalitySeen) {
						sortKeysValid = false;
					} else if (t !== "EQ") {
						inequalitySeen = true;
					}
				}
				index._sortKeysValid = sortKeysValid;

				return index;
			});
		}));

	// Prefer indexes the query validator accepts. A rejected index stays only when no index passes,
	// so the validator reports the problem instead of the lookup failing with "Index can't be found".
	const usable = annotated.filter((index) => index._usable);
	const validUsable = usable.filter((index) => index._sortKeysValid);
	const candidates = validUsable.length > 0 ? validUsable : usable;
	// Rank by the longest left-to-right sort-key prefix conditioned. On a tie, prefer the table
	// index (matching legacy selection), then fall back to insertion order.
	const bestPrefix = candidates.reduce((max, index) => Math.max(max, index._sortPrefix), 0);
	const topUsable = candidates.filter((index) => index._sortPrefix === bestPrefix);
	const chosen = topUsable.find((index) => index._tableIndex) || topUsable[0];

	return {"tableIndex": chosen?._tableIndex ?? false, "indexName": chosen?.IndexName ?? null};
}
