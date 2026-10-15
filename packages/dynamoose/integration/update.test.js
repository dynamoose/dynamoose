// Model.update against a real DynamoDB. The unit suite checks the request dynamoose builds; these
// check what DynamoDB accepts and what it stores, read back raw so the attribute types are visible.
const dynamoose = require("../dist");
const {DynamoDB} = require("@aws-sdk/client-dynamodb");

const ddb = new DynamoDB({
	"endpoint": process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
	"region": "local",
	"credentials": {"accessKeyId": "local", "secretAccessKey": "local"}
});
dynamoose.aws.ddb.set(ddb);

let tableCount = 0;
const key = {"id": {"N": "1"}};

// Creates a fresh table for the schema and seeds `item` (raw DynamoDB JSON) as it is.
async function setup (schema, item, schemaSettings) {
	const name = `Update${process.pid}_${tableCount++}`;
	const Model = dynamoose.model(name, new dynamoose.Schema(schema, schemaSettings));
	const table = new dynamoose.Table(name, [Model], {"create": false, "waitForActive": false});
	await table.create();
	if (item) {
		await ddb.putItem({"TableName": name, "Item": {...key, ...item}});
	}
	const raw = async () => (await ddb.getItem({"TableName": name, "Key": key})).Item;
	return {Model, raw};
}

describe("Model.update against DynamoDB", () => {
	describe("nested $REMOVE", () => {
		it("removes a nested key under a required parent and keeps its siblings", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "metadata": {"type": Object, "required": true, "schema": {"subMerchantId": String, "mcc": String}}},
				{"metadata": {"M": {"subMerchantId": {"S": "sub"}, "mcc": {"S": "5411"}}}}
			);
			await Model.update({"id": 1}, {"$REMOVE": ["metadata.subMerchantId"]});
			expect(await raw()).toEqual({...key, "metadata": {"M": {"mcc": {"S": "5411"}}}});
		});

		it("removes a nested key under a parent with a default, without writing the default", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "settings": {"type": Object, "default": {"theme": "light"}, "schema": {"theme": String, "lang": String}}},
				{"settings": {"M": {"theme": {"S": "dark"}, "lang": {"S": "es"}}}}
			);
			await Model.update({"id": 1}, {"$REMOVE": ["settings.theme"]});
			expect(await raw()).toEqual({...key, "settings": {"M": {"lang": {"S": "es"}}}});
		});

		it("refuses to remove a required nested key and leaves the item as it was", async () => {
			const seed = {"metadata": {"M": {"mcc": {"S": "5411"}}}};
			const {Model, raw} = await setup({"id": Number, "metadata": {"type": Object, "schema": {"mcc": {"type": String, "required": true}}}}, seed);
			await expect(Model.update({"id": 1}, {"$REMOVE": ["metadata.mcc"]})).rejects.toThrow("metadata.mcc is a required property");
			expect(await raw()).toEqual({...key, ...seed});
		});

		it("removes a list element in a required list", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "tags": {"type": Array, "required": true, "schema": [String]}},
				{"tags": {"L": [{"S": "a"}, {"S": "b"}, {"S": "c"}]}}
			);
			await Model.update({"id": 1}, {"$REMOVE": ["tags[1]"]});
			expect(await raw()).toEqual({...key, "tags": {"L": [{"S": "a"}, {"S": "c"}]}});
		});

		it("removes a key inside a list element", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "reps": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "email": String}}]}},
				{"reps": {"L": [{"M": {"name": {"S": "a"}, "email": {"S": "a@x"}}}]}}
			);
			await Model.update({"id": 1}, {"$REMOVE": ["reps[0].email"]});
			expect(await raw()).toEqual({...key, "reps": {"L": [{"M": {"name": {"S": "a"}}}]}});
		});

		it("removes a nested path set to undefined", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "meta": {"type": Object, "schema": {"name": String, "mcc": String}}},
				{"meta": {"M": {"name": {"S": "x"}, "mcc": {"S": "5411"}}}}
			);
			await Model.update({"id": 1}, {"$SET": {"meta.name": undefined}});
			expect(await raw()).toEqual({...key, "meta": {"M": {"mcc": {"S": "5411"}}}});
		});
	});

	describe("nested $SET", () => {
		it("writes one nested key and keeps its siblings", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "business": {"type": Object, "schema": {"name": String, "address": {"type": Object, "schema": {"city": String, "zip": String}}}}},
				{"business": {"M": {"name": {"S": "ACME"}, "address": {"M": {"city": {"S": "Málaga"}, "zip": {"S": "29001"}}}}}}
			);
			await Model.update({"id": 1}, {"$SET": {"business.address.city": "Madrid"}});
			expect(await raw()).toEqual({...key, "business": {"M": {"name": {"S": "ACME"}, "address": {"M": {"city": {"S": "Madrid"}, "zip": {"S": "29001"}}}}}});
		});

		it("stores a nested Date with its storage setting and reads it back as a Date", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "meta": {"type": Object, "schema": {"at": {"type": {"value": Date, "settings": {"storage": "seconds"}}}}}},
				{"meta": {"M": {}}}
			);
			await Model.update({"id": 1}, {"$SET": {"meta.at": new Date(1700000000000)}});
			expect(await raw()).toEqual({...key, "meta": {"M": {"at": {"N": "1700000000"}}}});
			expect((await Model.get({"id": 1})).meta.at).toEqual(new Date(1700000000000));
		});

		it("stores a Date inside a list element", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "items": {"type": Array, "schema": [{"type": Object, "schema": {"at": Date, "label": String}}]}},
				{"items": {"L": [{"M": {"label": {"S": "a"}}}, {"M": {"label": {"S": "b"}}}]}}
			);
			await Model.update({"id": 1}, {"$SET": {"items[1].at": new Date(1700000000000)}});
			expect(await raw()).toEqual({...key, "items": {"L": [{"M": {"label": {"S": "a"}}}, {"M": {"label": {"S": "b"}, "at": {"N": "1700000000000"}}}]}});
		});

		it("applies a nested set modifier", async () => {
			const {Model, raw} = await setup({"id": Number, "meta": {"type": Object, "schema": {"name": {"type": String, "set": (val) => val.toUpperCase()}}}}, {"meta": {"M": {}}});
			await Model.update({"id": 1}, {"$SET": {"meta.name": "acme"}});
			expect(await raw()).toEqual({...key, "meta": {"M": {"name": {"S": "ACME"}}}});
		});

		it("refuses a nested value outside the enum and leaves the item as it was", async () => {
			const seed = {"meta": {"M": {"status": {"S": "A"}}}};
			const {Model, raw} = await setup({"id": Number, "meta": {"type": Object, "schema": {"status": {"type": String, "enum": ["A", "B"]}}}}, seed);
			await expect(Model.update({"id": 1}, {"$SET": {"meta.status": "Z"}})).rejects.toThrow("meta.status must equal");
			expect(await raw()).toEqual({...key, ...seed});
		});

		it("refuses a nested value of the wrong type and leaves the item as it was", async () => {
			const seed = {"stats": {"M": {"count": {"N": "2"}}}};
			const {Model, raw} = await setup({"id": Number, "stats": {"type": Object, "schema": {"count": Number}}}, seed);
			await expect(Model.update({"id": 1}, {"$SET": {"stats.count": "abc"}})).rejects.toThrow("Expected stats.count to be of type number, instead found type string.");
			expect(await raw()).toEqual({...key, ...seed});
		});

		it("refuses a nested value that fails validation and leaves the item as it was", async () => {
			const seed = {"stats": {"M": {"count": {"N": "2"}}}};
			const {Model, raw} = await setup({"id": Number, "stats": {"type": Object, "schema": {"count": {"type": Number, "validate": (val) => val > 0}}}}, seed);
			await expect(Model.update({"id": 1}, {"$SET": {"stats.count": -1}})).rejects.toThrow("stats.count with a value of -1 had a validation error");
			expect(await raw()).toEqual({...key, ...seed});
		});

		it("skips a nested key inside a schemaless Object and writes the rest", async () => {
			const {Model, raw} = await setup({"id": Number, "name": String, "data": Object}, {"data": {"M": {"keep": {"S": "x"}}}});
			await Model.update({"id": 1}, {"$SET": {"data.extra": {"n": 1}, "name": "y"}});
			expect(await raw()).toEqual({...key, "name": {"S": "y"}, "data": {"M": {"keep": {"S": "x"}}}});
		});

		it("skips a nested key the schema does not declare and writes the rest", async () => {
			const {Model, raw} = await setup({"id": Number, "meta": {"type": Object, "schema": {"name": String}}}, {"meta": {"M": {"name": {"S": "x"}}}});
			await Model.update({"id": 1}, {"$SET": {"meta.extra": 1, "meta.name": "y"}});
			expect(await raw()).toEqual({...key, "meta": {"M": {"name": {"S": "y"}}}});
		});

		it("writes a nested key that saveUnknown covers as it is", async () => {
			const {Model, raw} = await setup({"id": Number, "data": Object}, {"data": {"M": {"keep": {"S": "x"}}}}, {"saveUnknown": ["data.**"]});
			await Model.update({"id": 1}, {"$SET": {"data.extra": {"n": 1, "tags": ["a"]}}});
			expect(await raw()).toEqual({...key, "data": {"M": {"keep": {"S": "x"}, "extra": {"M": {"n": {"N": "1"}, "tags": {"L": [{"S": "a"}]}}}}}});
		});

		it("writes a nested forced default without a top-level attribute named after its path", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "business": {"type": Object, "schema": {"tier": {"type": String, "default": "basic", "forceDefault": true}, "name": String}}},
				{"business": {"M": {"tier": {"S": "pro"}}}}
			);
			await Model.update({"id": 1}, {"$SET": {"business.name": "ACME"}});
			expect(await raw()).toEqual({...key, "business": {"M": {"tier": {"S": "pro"}, "name": {"S": "ACME"}}}});
			await Model.update({"id": 1}, {"$SET": {"business.tier": "pro"}});
			expect(await raw()).toEqual({...key, "business": {"M": {"tier": {"S": "basic"}, "name": {"S": "ACME"}}}});
		});

		it("still writes a top-level forced default that shares its name with a nested key", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "status": {"type": String, "default": "active", "forceDefault": true}, "meta": {"type": Object, "schema": {"status": String}}},
				{"meta": {"M": {}}}
			);
			await Model.update({"id": 1}, {"$SET": {"meta.status": "x"}});
			expect(await raw()).toEqual({...key, "status": {"S": "active"}, "meta": {"M": {"status": {"S": "x"}}}});
		});
	});

	it("applies a top-level value, a nested $SET and a nested $REMOVE in one update, with timestamps", async () => {
		const {Model, raw} = await setup(
			{"id": Number, "status": String, "metadata": {"type": Object, "required": true, "schema": {"subMerchantId": String, "mcc": String, "at": Date}}},
			{"status": {"S": "PENDING"}, "metadata": {"M": {"subMerchantId": {"S": "sub"}, "mcc": {"S": "5411"}}}},
			{"timestamps": {"createdAt": null, "updatedAt": "updatedAt"}}
		);
		await Model.update({"id": 1}, {"status": "ACTIVE", "$SET": {"metadata.at": new Date(1700000000000)}, "$REMOVE": ["metadata.subMerchantId"]});
		const {updatedAt, ...item} = await raw();
		expect(item).toEqual({...key, "status": {"S": "ACTIVE"}, "metadata": {"M": {"mcc": {"S": "5411"}, "at": {"N": "1700000000000"}}}});
		expect(Number(updatedAt.N)).toBeGreaterThan(1700000000000);
	});

	describe("$ADD", () => {
		it("adds an array to a nested string set", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "meta": {"type": Object, "schema": {"tags": {"type": Set, "schema": [String]}}}},
				{"meta": {"M": {"tags": {"SS": ["a"]}}}}
			);
			await Model.update({"id": 1}, {"$ADD": {"meta.tags": ["b"]}});
			expect((await raw()).meta.M.tags.SS.sort()).toEqual(["a", "b"]);
		});

		it("deletes an array from a nested string set", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "meta": {"type": Object, "schema": {"tags": {"type": Set, "schema": [String]}}}},
				{"meta": {"M": {"tags": {"SS": ["a", "b"]}}}}
			);
			await Model.update({"id": 1}, {"$DELETE": {"meta.tags": ["a"]}});
			expect(await raw()).toEqual({...key, "meta": {"M": {"tags": {"SS": ["b"]}}}});
		});

		it("adds to a nested number", async () => {
			const {Model, raw} = await setup({"id": Number, "stats": {"type": Object, "schema": {"count": Number}}}, {"stats": {"M": {"count": {"N": "2"}}}});
			await Model.update({"id": 1}, {"$ADD": {"stats.count": 3}});
			expect(await raw()).toEqual({...key, "stats": {"M": {"count": {"N": "5"}}}});
		});
	});

	describe("value types", () => {
		it("stores a list as a list when a set attribute is removed in the same update", async () => {
			const {Model, raw} = await setup(
				{"id": Number, "tags": {"type": Set, "schema": [String]}, "list": {"type": Array, "schema": [String]}},
				{"tags": {"SS": ["x"]}}
			);
			await Model.update({"id": 1}, {"$REMOVE": ["tags"], "$SET": {"list": ["a", "b"]}});
			expect(await raw()).toEqual({...key, "list": {"L": [{"S": "a"}, {"S": "b"}]}});
		});

		it("stores one object used for two attributes in both", async () => {
			const address = {"city": "Málaga"};
			const addressSchema = {"type": Object, "schema": {"city": String}};
			const {Model, raw} = await setup({"id": Number, "billing": addressSchema, "shipping": addressSchema});
			await Model.update({"id": 1, "billing": address, "shipping": address});
			expect(await raw()).toEqual({...key, "billing": {"M": {"city": {"S": "Málaga"}}}, "shipping": {"M": {"city": {"S": "Málaga"}}}});
		});
	});

	describe("combine", () => {
		const schema = {"id": Number, "name": String, "first": String, "last": String, "full": {"type": {"value": "Combine", "settings": {"attributes": ["first", "last"], "separator": " "}}}};

		it("leaves the combine attribute as it is when no source is written", async () => {
			const {Model, raw} = await setup(schema, {"first": {"S": "Ada"}, "last": {"S": "Lovelace"}, "full": {"S": "Ada Lovelace"}});
			await Model.update({"id": 1}, {"name": "x"});
			expect((await raw()).full).toEqual({"S": "Ada Lovelace"});
		});

		it("recomputes the combine attribute when all sources are written", async () => {
			const {Model, raw} = await setup(schema, {"first": {"S": "Ada"}, "last": {"S": "Lovelace"}, "full": {"S": "Ada Lovelace"}});
			await Model.update({"id": 1}, {"first": "Grace", "last": "Hopper"});
			expect((await raw()).full).toEqual({"S": "Grace Hopper"});
		});

		it("updates a model whose hash key is a combine attribute", async () => {
			const name = `UpdateCombineKey${process.pid}`;
			const Model = dynamoose.model(name, new dynamoose.Schema({
				"pk": {"type": {"value": "Combine", "settings": {"attributes": ["a", "b"], "separator": "#"}}, "hashKey": true},
				"a": String,
				"b": String,
				"note": String
			}));
			await new dynamoose.Table(name, [Model], {"create": false, "waitForActive": false}).create();
			await Model.create({"a": "x", "b": "y"});
			await Model.update({"pk": "x#y"}, {"note": "hi"});
			expect((await ddb.getItem({"TableName": name, "Key": {"pk": {"S": "x#y"}}})).Item.note).toEqual({"S": "hi"});
		});
	});
});

describe("transaction get against DynamoDB", () => {
	it("applies schema get modifiers", async () => {
		const {Model} = await setup({"id": Number, "name": {"type": String, "get": (val) => `got ${val}`}}, {"name": {"S": "x"}});
		const [item] = await dynamoose.transaction([Model.transaction.get({"id": 1})]);
		expect(item.name).toEqual("got x");
	});
});
