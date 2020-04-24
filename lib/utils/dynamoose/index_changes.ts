import obj from "../object";
import { Model } from "../../Model";
import { Document } from "../../Document";
import { IndexItem } from "../../Schema";

enum ModelIndexChangeType {
	add = "add",
	delete = "delete"
}

export interface ModelIndexChange {
	type: ModelIndexChangeType;
	spec?: IndexItem; // TODO: this is required if type = "add", and non existant otherwise, need to figure out how to better type that other than optional
	name?: string; // TODO: this is required if type = "delete", and non existant otherwise, need to figure out how to better type that other than optional
}

const index_changes = async (model: Model<Document>, existingIndexes = []) => {
	const output: ModelIndexChange[] = [];
	const expectedIndexes = await model.schema.getIndexes(model);

	// Indexes to delete
	output.push(...existingIndexes.filter((index) => !(expectedIndexes.GlobalSecondaryIndexes || []).find((searchIndex) => obj.equals(index, searchIndex))).map((index) => ({"name": (index.IndexName as string), "type": ModelIndexChangeType.delete})));

	// Indexes to create
	output.push(...(expectedIndexes.GlobalSecondaryIndexes || []).filter((index) => ![...output.map((i) => (i as {name: string; type: string}).name), ...existingIndexes.map((i) => i.IndexName)].includes(index.IndexName)).map((index) => ({
		"spec": index,
		"type": ModelIndexChangeType.add
	})));

	return output;
};

export default index_changes;
