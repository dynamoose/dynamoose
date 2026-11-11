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

	it("Should load ../dist/Condition first and then build an Item from a DynamoDB response", () => {
		jest.isolateModules(() => {
			require("../dist/Condition");
			const dynamoose = require("../dist");
			const model = dynamoose.model("LoadOrderCat", {"id": Number, "name": String}, {"create": false, "waitForActive": false});
			const {itemFromDynamoResponse} = require("../dist/Item");
			const item = itemFromDynamoResponse(model, {"id": {"N": "1"}, "name": {"S": "Bob"}});
			expect(item.toJSON()).toEqual({"id": 1, "name": "Bob"});
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
