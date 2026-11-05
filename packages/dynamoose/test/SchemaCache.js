const dynamoose = require("../dist");
const Internal = require("../dist/Internal").default;
const {internalProperties} = Internal.General;

// The lookup cache must never change what a lookup returns. test/Equivalence.js compares whole
// operations with dynamoose-baseline; these tests pin the cache rules that a corpus case can miss.
describe("Schema lookup cache", () => {
	const lookupCache = (schema) => schema.getInternalProperties(internalProperties).lookupCache;
	const cachedValues = (schema) => lookupCache(schema) ? lookupCache(schema).values : new Map();
	const model = (name, schema, options = {}) => dynamoose.model(name, schema, {"create": false, "waitForActive": false, ...options});

	// A key per list index would grow the cache with the length of every list an item holds.
	it("Should keep one entry for paths that differ only in list indexes", () => {
		const schema = new dynamoose.Schema({"id": String, "lines": {"type": Array, "schema": [{"type": Object, "schema": {"sku": String}}]}});
		const before = lookupCache(schema).values.size;
		schema.getAttributeValue("lines.3.sku");
		schema.getAttributeValue("lines.7.sku");
		schema.getAttributeTypeDetails("lines.9.sku");
		expect(lookupCache(schema).values.size - before).toBeLessThanOrEqual(1);
		expect(lookupCache(schema).values.has("lines.3.sku")).toEqual(false);
	});

	// attributes() returns a new array on every call: a caller that changes the array must not change
	// the next result.
	it("Should return a new attributes array on every call", () => {
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}});
		const first = schema.attributes();
		first.push("changed");
		expect(schema.attributes()).toEqual(["id", "address", "address.city"]);
		expect(schema.attributes()).not.toBe(schema.attributes());
	});

	it("Should add the ttl attribute after a lookup when an explicit table sets expires", async () => {
		const schema = new dynamoose.Schema({"id": String});
		expect(schema.attributes()).toEqual(["id"]);
		expect(() => schema.getAttributeTypeDetails("ttl")).toThrow("Invalid Attribute: ttl");
		const Cat = model("CacheCat", schema);
		new dynamoose.Table("CacheCatTable", [Cat], {"expires": 1000, "initialize": false});

		expect(schema.attributes()).toEqual(["id", "ttl"]);
		expect(schema.getAttributeTypeDetails("ttl").name).toEqual("Date");
		const request = await Cat.create({"id": "1"}, {"return": "request"});
		expect(Object.keys(request.Item)).toEqual(["id", "ttl"]);
	});

	it("Should add the ttl attribute when the model's own table is made after the lookups", async () => {
		const schema = new dynamoose.Schema({"id": String});
		const Cat = model("CacheLazyCat", schema, {"expires": {"ttl": 1000, "attribute": "expiresAt"}});
		expect(schema.attributes()).toEqual(["id"]);

		const request = await Cat.create({"id": "1"}, {"return": "request"});
		expect(Object.keys(request.Item)).toEqual(["id", "expiresAt"]);
		expect(schema.attributes()).toEqual(["id", "expiresAt"]);
	});

	// The nested schema's attributes object is shared, so the ttl write reaches the outer schema too.
	it("Should add the ttl attribute to a schema that nests the schema the table changes", () => {
		const inner = new dynamoose.Schema({"id": String});
		const outer = new dynamoose.Schema({"id": String, "sub": inner});
		expect(outer.attributes()).toEqual(["id", "sub", "sub.id"]);
		new dynamoose.Table("CacheNestedTable", [model("CacheNested", inner)], {"expires": 1000, "initialize": false});

		expect(outer.attributes()).toEqual(["id", "sub", "sub.id", "sub.ttl"]);
		expect(outer.getAttributeTypeDetails("sub.ttl").name).toEqual("Date");
	});

	describe("Array of attribute definitions", () => {
		const schema = () => new dynamoose.Schema({
			"id": String,
			"data": [
				{"type": Object, "schema": {"a": String}},
				{"type": Object, "schema": {"b": Number}}
			]
		});

		it("Should use the typeIndexOptionMap after a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeValue("data.b")).toEqual(Number);
			expect(value.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 0}})).toBeUndefined();
			expect(value.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 1}})).toEqual(Number);
			expect(value.getAttributeValue("data", {"typeIndexOptionMap": {"data": 1}})).toBe(value.getAttributeValue("data")[1]);
		});

		it("Should not reuse a result computed with a typeIndexOptionMap for a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeValue("data", {"typeIndexOptionMap": {"data": 0}})).toEqual({"type": Object, "schema": {"a": String}});
			expect(value.getAttributeValue("data")).toHaveLength(2);
		});

		it("Should use the typeIndexOptionMap for type details after a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeTypeDetails("data.b").name).toEqual("Number");
			expect(() => value.getAttributeTypeDetails("data.b", {"typeIndexOptionMap": {"data": 0}})).toThrow("Invalid Attribute: data.b");
			expect(value.getAttributeTypeDetails("data", {"typeIndexOptionMap": {"data": 1}})).toHaveProperty("name", "Object");
		});
	});

	// Keys allowed by saveUnknown come from outside input; caching misses would grow without bound.
	// The inherited-key test below guards the own-property check; this one guards misses and throws.
	it("Should add no entry for a miss or a thrown error", () => {
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}}, {"saveUnknown": true});
		const sizes = () => cachedValues(schema).size;
		const before = sizes();

		expect(schema.getAttributeValue("unknown")).toBeUndefined();
		expect(() => schema.getAttributeValue("unknown.deeper")).toThrow(TypeError);
		expect(() => schema.getAttributeTypeDetails("unknown")).toThrow("Invalid Attribute: unknown");
		expect(() => schema.getAttributeTypeDetails("address.unknown")).toThrow("Invalid Attribute: address.unknown");
		expect(sizes()).toEqual(before);
	});

	it("Should call a function default on every call", async () => {
		const defaultFunction = jest.fn(() => "generated");
		const Cat = model("CacheDefault", {"id": String, "name": {"type": String, "default": defaultFunction}});
		const first = await Cat.create({"id": "1"}, {"return": "request"});
		const second = await Cat.create({"id": "2"}, {"return": "request"});
		expect([first.Item.name, second.Item.name]).toEqual([{"S": "generated"}, {"S": "generated"}]);
		expect(defaultFunction).toHaveBeenCalledTimes(2);
	});

	it("Should never share entries between two schemas", () => {
		const first = new dynamoose.Schema({"id": String, "data": String});
		const second = new dynamoose.Schema({"id": String, "data": Number});
		expect(first.getAttributeTypeDetails("data").name).toEqual("String");
		expect(second.getAttributeTypeDetails("data").name).toEqual("Number");
		expect(first.getAttributeValue("data")).toEqual(String);
		expect(second.getAttributeValue("data")).toEqual(Number);
	});

	// A plain object cache would return Object.prototype members for these keys.
	describe("Keys named like Object.prototype members", () => {
		const schema = () => new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}}, {"saveUnknown": true});

		it("Should resolve constructor through the attributes object", () => {
			const value = schema();
			expect(value.getAttributeValue("constructor")).toBe(Object);
			expect(value.getAttributeValue("address.constructor")).toBe(Object);
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Object");
			expect(value.getAttributeValue("constructor")).toBe(Object);
		});

		it("Should resolve __proto__ through the attributes object", () => {
			const value = schema();
			expect(value.getAttributeValue("__proto__")).toBe(Object.prototype);
			expect(() => value.getAttributeTypeDetails("__proto__")).toThrow(TypeError);
			expect(() => value.getAttributeTypeDetails("__proto__")).toThrow(TypeError);
			expect(value.getAttributeValue("__proto__")).toBe(Object.prototype);
		});

		it("Should add no entry for a key the attributes object only inherits", () => {
			const value = schema();
			value.getAttributeValue("constructor");
			value.getAttributeValue("address.toString");
			value.getAttributeTypeDetails("constructor");
			expect(cachedValues(value).has("constructor")).toEqual(false);
			expect(cachedValues(value).has("address.toString")).toEqual(false);
		});

		it("Should resolve an attribute named constructor that the schema defines", () => {
			const value = new dynamoose.Schema({"id": String, "constructor": Number});
			expect(value.getAttributeValue("constructor")).toEqual(Number);
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Number");
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Number");
		});
	});

	// getAttributeTypeDetails writes the schema into the definition's THIS settings object on each lookup.
	// A result kept from one schema would read the other schema's hash key after the other's lookup.
	it("Should give each schema its own model for a THIS definition the schemas share", async () => {
		const definition = {"type": {"value": dynamoose.type.THIS, "settings": {}}};
		const A = model("CacheThisA", new dynamoose.Schema({"id": String, "ref": definition}));
		const B = model("CacheThisB", new dynamoose.Schema({"pk": Number, "ref": definition}));
		const requests = [
			await B.create({"pk": 1, "ref": 2}, {"return": "request"}),
			await A.create({"id": "1", "ref": "2"}, {"return": "request"}),
			await B.create({"pk": 3, "ref": 4}, {"return": "request"})
		];
		expect(requests.map((request) => request.Item.ref)).toEqual([{"N": "2"}, {"S": "2"}, {"N": "4"}]);
	});

	// A spy or a plugin that replaces a public lookup method must see every call dynamoose makes through
	// it, also for a schema whose lookups the constructor already ran.
	describe("Replaced lookup methods", () => {
		const replace = (method) => {
			const original = dynamoose.Schema.prototype[method];
			const spy = jest.fn(function (...args) {
				return original.apply(this, args);
			});
			dynamoose.Schema.prototype[method] = spy;
			return {spy, "restore": () => {
				dynamoose.Schema.prototype[method] = original;
			}};
		};

		// The getAttributeValue and getAttributeSettingValue terms of the guard are checked by the corpus case
		// "replaced Schema lookup methods": a skipped call there shows only against the published build.
		it("Should call a replaced getAttributeTypeDetails on every save", async () => {
			const Cat = model("CacheSpyTypeDetails", {"id": String, "name": String, "tags": {"type": Set, "schema": [String]}});
			await Cat.create({"id": "0", "name": "a", "tags": ["a"]}, {"return": "request"});
			const {spy, restore} = replace("getAttributeTypeDetails");
			try {
				await Cat.create({"id": "1", "name": "a", "tags": ["a"]}, {"return": "request"});
				const first = spy.mock.calls.length;
				await Cat.create({"id": "2", "name": "b", "tags": ["b"]}, {"return": "request"});
				expect(first).toBeGreaterThan(0);
				expect(spy.mock.calls.length).toEqual(2 * first);
			} finally {
				restore();
			}
		});

		// Item.attributesWithSchema reads a cached tree of the attributes, which must not hide a replaced attributes().
		it("Should call a replaced attributes in every Item.attributesWithSchema call", async () => {
			const {Item} = require("../dist/Item");
			const Cat = model("CacheSpyAttributes", {"id": String, "name": String});
			const item = new Cat({"id": "1", "name": "a"});
			await Item.attributesWithSchema(item, Cat.Model);
			const {spy, restore} = replace("attributes");
			try {
				expect(await Item.attributesWithSchema(item, Cat.Model)).toEqual(["id", "name"]);
				await Item.attributesWithSchema(item, Cat.Model);
				expect(spy.mock.calls).toEqual([[], []]);
			} finally {
				restore();
			}
		});

		it("Should call a replaced getAttributeType on every attributes() call", () => {
			const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}});
			const {spy, restore} = replace("getAttributeType");
			try {
				schema.attributes();
				schema.attributes();
				expect(spy.mock.calls.map((call) => call[0])).toEqual(["id", "address", "address.city", "id", "address", "address.city"]);
			} finally {
				restore();
			}
		});
	});

	// The Schema constructor writes the timestamp attributes into the caller's definition object, which a
	// schema built earlier can hold as a nested schema.
	it("Should see the timestamp attributes a later constructor writes into a nested definition", async () => {
		const nested = {"street": String};
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": nested}});
		expect(schema.attributes()).toEqual(["id", "address", "address.street"]);
		new dynamoose.Schema(nested, {"timestamps": true});

		expect(schema.attributes()).toEqual(["id", "address", "address.street", "address.createdAt", "address.updatedAt"]);
		const request = await model("CacheTimestampsNested", schema).create({"id": "1", "address": {"street": "s", "createdAt": new Date(0)}}, {"return": "request"});
		expect(request.Item.address).toEqual({"M": {"street": {"S": "s"}, "createdAt": {"N": "0"}}});
	});

	// The constructor writes the timestamp attributes one at a time, so a throw on a later one leaves the
	// earlier ones in the caller's definition object.
	it("Should see the timestamp attributes a constructor writes into a nested definition before it throws", async () => {
		const nested = {"street": String};
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": nested}});
		const Cat = model("CacheTimestampsThrow", schema);
		await Cat.create({"id": "1", "address": {"street": "s"}}, {"return": "request"});
		expect(() => new dynamoose.Schema(nested, {"timestamps": {"createdAt": "created", "updatedAt": "street"}})).toThrow("Timestamp attributes must not be defined in schema.");

		expect(schema.attributes()).toEqual(["id", "address", "address.street", "address.created"]);
		const request = await Cat.create({"id": "2", "address": {"street": "s", "created": new Date(5)}}, {"return": "request"});
		expect(request.Item.address).toEqual({"M": {"street": {"S": "s"}, "created": {"N": "5"}}});
	});

	// Accepted, documented difference (PENDING_CHANGELOG.md, the caution in the Schema docs): the constructor
	// copies only the top level of the definition, so nested definition objects stay shared with the caller.
	// Without the cache, a lookup sees a nested definition the caller adds or replaces after the constructor;
	// with the cache it does not. If this test fails, the difference is gone: update the changelog and the docs.
	it("Should not see a nested definition replaced after the constructor (accepted difference)", () => {
		const definition = {"id": String, "address": {"type": Object, "schema": {"city": String}}};
		const schema = new dynamoose.Schema(definition);
		expect(schema.getAttributeType("address.city")).toEqual("S");
		definition.address.schema.city = Number;
		definition.address.schema.zip = String;

		expect(schema.getAttributeType("address.city")).toEqual("S"); // without the cache: "N"
		expect(schema.attributes()).toEqual(["id", "address", "address.city"]); // without the cache: also "address.zip"
	});
});
