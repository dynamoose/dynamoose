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
	const output: (ModelIndexAddChange | ModelIndexDeleteChange)[] = [];
	const expectedIndexes = await model.getIndexes();

	// Indexes to delete
	const identiticalProperties = ["IndexName", "KeySchema", "Projection", "ProvisionedThroughput"]; // This array represents the properties in the indexes that should match between existingIndexes (from DynamoDB) and expectedIndexes. This array will not include things like `IndexArn`, `ItemCount`, etc, since those properties do not exist in expectedIndexes
	const deleteIndexes: ModelIndexDeleteChange[] = existingIndexes.filter((index) => !(expectedIndexes.GlobalSecondaryIndexes || []).find((searchIndex) => obj.equals(obj.pick(index, ), obj.pick(searchIndex as any, ["IndexName", "KeySchema", "Projection", "ProvisionedThroughput"])))).map((index) => ({"name": index.IndexName as string, "type": ModelIndexChangeType.delete}));
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
