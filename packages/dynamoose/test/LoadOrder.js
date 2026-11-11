// A program may load any dynamoose module first (a service imports `dynamoose/dist/Table` or `dynamoose/dist/Item` for `instanceof`, or a type
// file pulls in `dynamoose/dist/Condition`), and the modules require each other, so each one must load on its own without reaching another half-loaded.
const modules = ["Condition", "Item", "Schema", "Model", "ItemRetriever", "Transaction", "Table", "Instance", "index"];

describe("Load order", () => {
	modules.forEach((name) => {
		it(`Should load ../dist/${name} as the first dynamoose module`, () => {
			jest.isolateModules(() => {
				expect(() => require(`../dist/${name}`)).not.toThrow();
			});
		});
	});

	it("Should load ../dist/Table first and then create a model's table", () => {
		jest.isolateModules(() => {
			const {Table} = require("../dist/Table");
			const dynamoose = require("../dist");
			const model = dynamoose.model("LoadOrderDog", {"id": Number}, {"create": false, "waitForActive": false});
			const table = model.table();
			expect(table).toBeInstanceOf(Table);
			expect(table.name).toEqual("LoadOrderDog");
		});
	});
});
