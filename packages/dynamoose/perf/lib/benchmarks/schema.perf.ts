import {runSuite, BenchInstance} from "../harness";
import dynamoose = require("../../../dist");
import ModelStore from "../../../dist/ModelStore";

export default async function run (): Promise<void> {
	ModelStore.clear();

	await runSuite("schema", (bench: BenchInstance) => {
		bench.add("Schema - simple (3 attributes)", () => {
			new dynamoose.Schema({
				"id": String,
				"name": String,
				"age": Number
			});
		});
	});
}
