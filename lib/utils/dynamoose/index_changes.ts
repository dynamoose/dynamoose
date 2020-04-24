import obj from "../object";
import { Model } from "../../Model";
import { Document } from "../../Document";
import { IndexItem } from "../../Schema";

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

const index_changes = async (model: Model<Document>, existingIndexes = []) => {
	const output: (ModelIndexAddChange | ModelIndexDeleteChange)[] = [];
	const expectedIndexes = await model.schema.getIndexes(model);

	// Indexes to delete
	const deleteIndexes: ModelIndexDeleteChange[] = existingIndexes.filter((index) => !(expectedIndexes.GlobalSecondaryIndexes || []).find((searchIndex) => obj.equals(index, searchIndex))).map((index) => ({"name": (index.IndexName as string), "type": ModelIndexChangeType.delete}));
	output.push(...deleteIndexes);

	// Indexes to create
	const createIndexes: ModelIndexAddChange[] = (expectedIndexes.GlobalSecondaryIndexes || []).filter((index) => ![...output.map((i) => (i as {name: string; type: string}).name), ...existingIndexes.map((i) => i.IndexName)].includes(index.IndexName)).map((index) => ({
		"type": ModelIndexChangeType.add,
		"spec": index
	}));
	output.push(...createIndexes);

	return output;
};

export default index_changes;
