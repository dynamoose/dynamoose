import array_flatten = require("./array_flatten");
import {ConditionStorageTypeNested} from "../Condition";
import {ModelIndexes} from "../Model";

export default function (indexes: ModelIndexes, comparisonChart: ConditionStorageTypeNested): string | null {
	const validIndexes = array_flatten(Object.values(indexes))
		.map((index) => {
			const {hash, range} = index.KeySchema.reduce((res, item) => {
				res[item.KeyType.toLowerCase()] = item.AttributeName;
				return res;
			}, {});

			index._hashKey = hash;
			index._rangeKey = range;

			return index;
		})
		.filter((index) => comparisonChart[index._hashKey]?.type === "EQ");

	const index = validIndexes.find((index) => comparisonChart[index._rangeKey]) || validIndexes[0];
	return index?.IndexName ?? null;
}
