import array_flatten from "./array_flatten";
import {ConditionStorageTypeNested} from "../Condition";
import {ModelIndexes} from "../Model";

interface IndexSpecification {
	tableIndex: boolean;
	indexName?: string;
}

export default function (modelIndexes: ModelIndexes, comparisonChart: ConditionStorageTypeNested): IndexSpecification {
	const validIndexes = array_flatten(Object.entries(modelIndexes)
		.map(([key, indexes]) => {
			indexes = Array.isArray(indexes) ? indexes : [indexes];
			return indexes.map((index) => {
				const {hash, range} = index.KeySchema.reduce((res, item) => {
					res[item.KeyType.toLowerCase()] = item.AttributeName;
					return res;
				}, {});

				index._hashKey = hash;
				index._rangeKey = range;

				index._tableIndex = key === "TableIndex";

				return index;
			});
		}))
		.filter((index) => comparisonChart[index._hashKey]?.type === "EQ");

	const index = validIndexes.find((index) => comparisonChart[index._rangeKey]) || validIndexes.find((index) => index._tableIndex) || validIndexes[0];

	return {"tableIndex": index?._tableIndex ?? false, "indexName": index?.IndexName ?? null};
}
