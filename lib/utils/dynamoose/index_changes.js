const obj = require("../object");

module.exports = async (model, existingIndexes = []) => {
	const output = [];
	const expectedIndexes = await model.schema.getIndexes(model);

	// Indexes to delete
	output.push(...existingIndexes.filter((index) => !(expectedIndexes.GlobalSecondaryIndexes || []).find((searchIndex) => obj.equals(index, searchIndex))).map((index) => ({"name": index.IndexName, "type": "delete"})));

	// Indexes to create
	output.push(...(expectedIndexes.GlobalSecondaryIndexes || []).filter((index) => ![...output.map((i) => i.name), ...existingIndexes.map((i) => i.IndexName)].includes(index.IndexName)).map((index) => ({
		"type": "add",
		"spec": index
	})));

	return output;
};
