import obj = require("../object");
import {Model} from "../../Model";
import {Document} from "../../Document";
import {IndexItem} from "../../Schema";

export enum ModelIndexChangeType {
	add = "add",
	delete = "delete"
}

export interface ModelIndexAddChange {
	type: ModelIndexChangeType.add;
	spec: IndexItem;
}
export interface ModelIndexDeleteChange {
	type: ModelIndexChangeType.delete;
	name: string;
}

const index_changes = async (model: Model<Document>, existingIndexes = []): Promise<(ModelIndexAddChange | ModelIndexDeleteChange)[]> => {
	const expectedIndexes = await model.schema.getIndexes(model);

	const aggregator = (indexes: IndexItem[], map: (index) => ModelIndexAddChange | ModelIndexDeleteChange): (ModelIndexAddChange | ModelIndexDeleteChange)[] => {
		const selectedIndexes = indexes || [];
		const discriminatedIndexes = existingIndexes.filter((index) => !selectedIndexes.find((searchIndex) => obj.equals(index, searchIndex)));
		return discriminatedIndexes.map(map);
	};

	const mapAddChange = (index): ModelIndexAddChange | ModelIndexDeleteChange => ({"spec": index, "type": ModelIndexChangeType.add}) as ModelIndexAddChange;
	const mapDeleteChange = (index): ModelIndexAddChange | ModelIndexDeleteChange => ({"name": index.IndexName as string, "type": ModelIndexChangeType.delete}) as ModelIndexDeleteChange;

	return Promise.resolve([
		...aggregator(expectedIndexes.GlobalSecondaryIndexes, mapAddChange),
		...aggregator(expectedIndexes.GlobalSecondaryIndexes, mapDeleteChange),
		...aggregator(expectedIndexes.LocalSecondaryIndexes, mapAddChange),
		...aggregator(expectedIndexes.LocalSecondaryIndexes, mapDeleteChange)
	]);
};

export default index_changes;
