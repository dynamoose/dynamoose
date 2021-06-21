import {ConditionStorageTypeNested} from "../Condition";

export default function (hashKeyOfTable: string, rangeKeyOfTable: string | void, chart: ConditionStorageTypeNested): boolean {
	const hashKeyInQuery = Object.entries(chart).find(([fieldName, {type}]) => type === "EQ" && fieldName === hashKeyOfTable);

	// If no hash key exists in the query, the table index cannot be used
	if (!hashKeyInQuery) {
		return false;
	}

	// If the hash key is the only key in the query, the table index can be used
	const isOneKeyQuery = Object.keys(chart).length === 1;
	if (isOneKeyQuery) {
		return true;
	}

	// If the table has a range key and it exists in the query, the table index can be used
	if (rangeKeyOfTable && chart[rangeKeyOfTable]) {
		return true;
	}

	// Otherwise, the table index cannot be used
	return false;
}
