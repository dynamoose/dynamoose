import {runSuite, BenchInstance} from "../harness";
import dynamoose = require("../../../dist");
import ModelStore from "../../../dist/ModelStore";

export default async function run (): Promise<void> {
	// We need to set defaults to avoid actual DynamoDB table operations
	dynamoose.Table.defaults.set({"create": false, "waitForActive": false});

	let modelCounter = 0;
	function uniqueModelName (): string {
		return `PerfModel${modelCounter++}`;
	}

	await runSuite("model", (bench: BenchInstance) => {
		bench.add("Model - simple creation", () => {
			const name = uniqueModelName();
			dynamoose.model(name, {"id": String, "name": String});
			ModelStore.clear();
		});

		bench.add("Model - creation with complex schema", () => {
			const name = uniqueModelName();
			dynamoose.model(name, {
				"id": String,
				"sk": {"type": String, "rangeKey": true},
				"name": {"type": String, "required": true},
				"email": {"type": String, "required": true},
				"age": Number,
				"tags": {"type": Array, "schema": [String]},
				"metadata": {
					"type": Object,
					"schema": {
						"source": String,
						"version": Number
					}
				}
			});
			ModelStore.clear();
		});

		bench.add("Model - creation with multiple schemas", () => {
			const name = uniqueModelName();
			dynamoose.model(name, [
				new dynamoose.Schema({"id": String, "name": String}),
				new dynamoose.Schema({"id": String, "age": Number})
			]);
			ModelStore.clear();
		});

		bench.add("Model - retrieval from store", () => {
			const name = uniqueModelName();
			dynamoose.model(name, {"id": String});
			// Retrieve the same model from the store
			dynamoose.model(name);
			ModelStore.clear();
		});

		const schemaForReuse = new dynamoose.Schema({"id": String, "name": String, "age": Number});
		bench.add("Model - creation with pre-built Schema", () => {
			const name = uniqueModelName();
			dynamoose.model(name, schemaForReuse);
			ModelStore.clear();
		});
	});

	dynamoose.Table.defaults.set({});
}
