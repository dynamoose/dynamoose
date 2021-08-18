import array_flatten = require("./array_flatten");
import {ConditionStorageTypeNested} from "../Condition";
import {ModelIndexes} from "../Model";

interface IndexSpecification {
	tableIndex: boolean;
	indexName?: string;
}

export default function (tableHashKey: string, indexes: ModelIndexes, comparisonChart: ConditionStorageTypeNested): IndexSpecification {
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

	// If no index is found and hash key exists, use table index
	if (!index && comparisonChart[tableHashKey]?.type === "EQ") {
		return {"tableIndex": true};
	}

	return {"tableIndex": false, "indexName": index?.IndexName ?? null};
}
