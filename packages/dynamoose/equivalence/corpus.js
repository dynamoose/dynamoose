// Cases of the equivalence suite (test/Equivalence.js). Each case runs once per build: `run (ctx)` must
// make its own Schema and Model instances from `ctx.dynamoose`, wrap every user function with
// `ctx.fn`, track the caller's inputs and Items with `ctx.track`, and put each call in `ctx.step`.
// `failing` lists the steps that fail on the published build, so a case cannot pass by comparing two
// identical errors that nobody meant to test. `differs: {reason, steps}` lists the steps of a deliberate
// behaviour change (see test/Equivalence.js). Step labels are unique per case.
const {clone} = require("./compare");
const {"schemas": benchmarkSchemas} = require("../benchmarks/schemas");

const answer = (value) => () => clone(value);

// `new Model(data)` and `item.save(settings)` as two steps; the input and the Item stay tracked.
async function save (ctx, Model, label, data, settings) {
	const input = ctx.track(`${label} input`, data);
	const item = await ctx.step(`${label}: new`, () => new Model(input));
	ctx.track(`${label} item`, item);
	return ctx.step(label, () => item.save(settings));
}

async function update (ctx, Model, label, key, object, settings) {
	return ctx.step(label, () => Model.update(ctx.track(`${label} key`, key), ctx.track(`${label} input`, object), settings));
}

// Create, save, get, query and update on a benchmark schema (benchmarks/schemas.js).
function operationsCase (schemaName) {
	const config = benchmarkSchemas[schemaName];
	return {
		"name": `${schemaName} schema: create, save, get, query and update`,
		"fixtures": () => ({"data": config.data(), "other": config.data(), "update": config.update(), "update2": config.update(), "nested": config.nestedUpdate ? config.nestedUpdate() : undefined}),
		"run": async (ctx) => {
			const f = ctx.fixtures;
			const schema = config.create(ctx.dynamoose);
			const Model = ctx.model("Model", schema);
			const request = await save(ctx, Model, "save request", f.data, {"return": "request"});
			ctx.respond("getItem", answer({"Item": request.Item}));
			ctx.respond("query", answer({"Items": [request.Item], "Count": 1, "ScannedCount": 1}));
			ctx.respond("updateItem", answer({"Attributes": request.Item}));
			await save(ctx, Model, "save", f.other);
			await ctx.step("get", () => Model.get(ctx.track("get key", config.key(f.data))));
			await ctx.step("query", () => Model.query(schema.hashKey).eq(f.data[schema.hashKey]).exec());
			await update(ctx, Model, "update", config.key(f.data), f.update);
			await update(ctx, Model, "update request", config.key(f.data), f.update2, {"return": "request"});
			if (f.nested) {
				await update(ctx, Model, "update nested", config.key(f.data), f.nested);
			}
		}
	};
}

// Several invalid fields at once on a benchmark schema: the first error reported must not change.
function invalidCase (schemaName, breakData, invalidUpdate, failing = ["save invalid", "update invalid"]) {
	const config = benchmarkSchemas[schemaName];
	return {
		"name": `${schemaName} schema: several invalid fields`,
		failing,
		"fixtures": () => {
			const data = config.data();
			breakData(data);
			return {data, "key": config.key(data), "update": invalidUpdate};
		},
		"run": async (ctx) => {
			const Model = ctx.model("Model", config.create(ctx.dynamoose));
			await save(ctx, Model, "save invalid", ctx.fixtures.data);
			await update(ctx, Model, "update invalid", ctx.fixtures.key, ctx.fixtures.update);
		}
	};
}

const benchmarkCases = [
	...["small", "medium", "large", "extra-large", "order"].map(operationsCase),
	invalidCase("small", (data) => Object.assign(data, {"age": "old", "active": "yes"}), {"age": "old"}),
	invalidCase("medium", (data) => {
		data.email = "not-an-email";
		data.preferences.theme = "blue";
		data.tags = [1, 2];
	}, {"email": "still-not-an-email"}),
	invalidCase("large", (data) => {
		data.personalInfo.firstName = "J";
		data.personalInfo.gender = "unknown";
		data.contactInfo.primaryEmail = "bad";
	}, {"$SET": {"personalInfo.gender": "unknown"}}, ["save invalid"]),
	invalidCase("extra-large", (data) => {
		data.personalInfo.gender = "unknown";
		data.complexDataTypes.numberSet = new Set(["a", "b"]);
	}, {"personalInfo": {"firstName": "J"}}),
	invalidCase("order", (data) => {
		data.status = "NOPE";
		delete data.orderNumber;
		data.browserContext.countryCode = "usa";
	}, {"status": "NOPE"})
];

const edgeCases = [
	{
		"name": "multi-type attribute",
		"failing": ["save boolean", "update boolean"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"value": {"type": [String, Number], "required": true},
				"when": [Date, String]
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save string", {"id": "1", "value": "a", "when": "soon"}, {"return": "request"});
			await save(ctx, Model, "save number", {"id": "2", "value": 2, "when": new Date(0)}, {"return": "request"});
			await save(ctx, Model, "save boolean", {"id": "3", "value": true});
			await update(ctx, Model, "update number", {"id": "1"}, {"value": 3});
			await update(ctx, Model, "update boolean", {"id": "1"}, {"value": false});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "value": {"N": "4"}, "when": {"N": "1000"}}}));
			await ctx.step("get number", () => Model.get("1"));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "value": {"S": "b"}, "when": {"S": "later"}}}));
			await ctx.step("get string", () => Model.get("1"));
		}
	},
	{
		// The path walk meets an array of attribute definitions: the per-item typeIndexOptionMap picks
		// the definition. Both definitions share `kind` and `value` with different settings.
		"name": "array of attribute definitions",
		"failing": ["save matches none", "save invalid b", "save with a default"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Model = ctx.model("Model", new Schema({
				"id": String,
				"data": [
					{"type": Object, "schema": {
						"kind": {"type": String, "enum": ["a"]},
						"value": {"type": String, "validate": ctx.fn("validate a.value", (value) => value.length > 0)}
					}},
					{"type": Object, "schema": {
						"kind": {"type": String, "enum": ["b"]},
						"value": {"type": Number, "validate": ctx.fn("validate b.value", (value) => value > 0)}
					}}
				]
			}));
			// A default inside one of the definitions is applied whichever definition the item matches.
			const WithDefault = ctx.model("WithDefault", new Schema({
				"id": String,
				"data": [
					{"type": Object, "schema": {"kind": {"type": String, "enum": ["a"]}, "extra": {"type": Number, "default": ctx.fn("default a.extra", () => 1)}}},
					{"type": Object, "schema": {"kind": {"type": String, "enum": ["b"]}}}
				]
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save b", {"id": "1", "data": {"kind": "b", "value": 2}}, {"return": "request"});
			await save(ctx, Model, "save a", {"id": "2", "data": {"kind": "a", "value": "x"}}, {"return": "request"});
			await save(ctx, Model, "save b again", {"id": "3", "data": {"kind": "b", "value": 5}}, {"return": "request"});
			await save(ctx, Model, "save matches none", {"id": "4", "data": {"kind": "c", "value": true}});
			await save(ctx, Model, "save invalid b", {"id": "5", "data": {"kind": "b", "value": -1}});
			await save(ctx, WithDefault, "save with a default", {"id": "6", "data": {"kind": "b"}});
			await update(ctx, Model, "update object", {"id": "1"}, {"data": {"kind": "b", "value": 3}});
			await update(ctx, Model, "update nested path", {"id": "1"}, {"$SET": {"data.value": "y"}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "data": {"M": {"kind": {"S": "b"}, "value": {"N": "7"}}}}}));
			await ctx.step("get b", () => Model.get("1"));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "2"}, "data": {"M": {"kind": {"S": "a"}, "value": {"S": "z"}}}}}));
			await ctx.step("get a", () => Model.get("2"));
		}
	},
	{
		// The shapes a schema generator emits for nullable fields.
		"name": "nullable types",
		"failing": ["save null in required", "save missing required"],
		"run": async (ctx) => {
			const {NULL} = ctx.dynamoose.type;
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"note": {"type": [String, NULL]},
				"amount": {"type": [String, Number, NULL]},
				"when": {"type": {"value": [Date, NULL], "settings": {"storage": "iso"}}},
				"list": {"type": [Array, NULL], "schema": [{"type": String}]},
				"tags": {"type": [Set, NULL], "schema": [{"type": String, "required": true}]},
				"mandatory": {"type": [String, NULL], "required": true}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save nulls", {"id": "1", "note": null, "amount": null, "when": null, "list": null, "tags": null, "mandatory": "m"}, {"return": "request"});
			await save(ctx, Model, "save null in required", {"id": "4", "mandatory": null});
			await save(ctx, Model, "save values", {"id": "2", "note": "n", "amount": 5, "when": new Date(1000), "list": ["a"], "tags": new Set(["t"]), "mandatory": "m"}, {"return": "request"});
			await save(ctx, Model, "save missing required", {"id": "3", "note": "n"});
			await update(ctx, Model, "update to null", {"id": "1"}, {"note": null, "when": null, "amount": "x"});
			await update(ctx, Model, "update remove", {"id": "1"}, {"$REMOVE": ["note", "list"]});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "note": {"NULL": true}, "when": {"NULL": true}, "list": {"NULL": true}, "mandatory": {"NULL": true}}}));
			await ctx.step("get nulls", () => Model.get("1"));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "2"}, "note": {"S": "n"}, "amount": {"N": "5"}, "when": {"S": "1970-01-01T00:00:01.000Z"}, "tags": {"SS": ["t"]}, "mandatory": {"S": "m"}}}));
			await ctx.step("get values", () => Model.get("2"));
		}
	},
	{
		"name": "sets",
		"failing": ["save date set"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"strings": {"type": Set, "schema": [String]},
				"numbers": {"type": Set, "schema": [Number]},
				"buffers": {"type": Set, "schema": [Buffer]},
				"dates": {"type": Set, "schema": [Date]}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save sets", {"id": "1", "strings": new Set(["a", "b"]), "numbers": new Set([1, 2]), "buffers": new Set([Buffer.from("x")])}, {"return": "request"});
			await save(ctx, Model, "save arrays", {"id": "2", "strings": ["a"], "numbers": [3], "buffers": [Buffer.from("y")], "dates": [new Date(2000)]}, {"return": "request"});
			await save(ctx, Model, "save date set", {"id": "3", "dates": new Set([new Date(1000)])}, {"return": "request"});
			await update(ctx, Model, "update add and delete", {"id": "1"}, {"$ADD": {"strings": ["c"], "numbers": new Set([3])}, "$DELETE": {"strings": ["a"], "numbers": [1]}});
			await update(ctx, Model, "update set", {"id": "1"}, {"numbers": new Set([9])});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "strings": {"SS": ["a", "b"]}, "numbers": {"NS": ["1", "2"]}, "buffers": {"BS": [Buffer.from("x")]}, "dates": {"NS": ["1000"]}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "lists of maps",
		"failing": ["save missing sku"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"lines": {"type": Array, "schema": [{"type": Object, "schema": {
					"sku": {"type": String, "required": true},
					"qty": {"type": Number, "default": ctx.fn("default qty", () => 1)},
					"meta": {"type": Object, "schema": {"color": String}}
				}}]}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save lines", {"id": "1", "lines": [{"sku": "a", "qty": 2, "meta": {"color": "red"}}, {"sku": "b"}]}, {"return": "request"});
			await save(ctx, Model, "save missing sku", {"id": "2", "lines": [{"qty": 1}]});
			await update(ctx, Model, "update list index", {"id": "1"}, {"$SET": {"lines.1.qty": 5}});
			await update(ctx, Model, "update map in a list", {"id": "1"}, {"$SET": {"lines.0.meta.color": "blue"}});
			await update(ctx, Model, "update whole list", {"id": "1"}, {"lines": [{"sku": "d", "meta": {"color": "green"}}]});
			await update(ctx, Model, "update remove index", {"id": "1"}, {"$REMOVE": ["lines.0"]});
			await update(ctx, Model, "update append", {"id": "1"}, {"$ADD": {"lines": [{"sku": "c"}]}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "lines": {"L": [{"M": {"sku": {"S": "a"}, "qty": {"N": "2"}}}, {"M": {"sku": {"S": "b"}}}]}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "combine, also as range key",
		"failing": ["update", "update partial combine", "update key combine attribute"],
		"run": async (ctx) => {
			const {COMBINE} = ctx.dynamoose.type;
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"pk": {"type": String, "hashKey": true},
				"sk": {"type": COMBINE(["kind", "ref"], "#"), "rangeKey": true},
				"kind": String,
				"ref": String,
				"label": COMBINE(["kind", "name"]),
				"name": String,
				"note": String
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save request", {"pk": "p", "kind": "order", "ref": "1", "name": "first"}, {"return": "request"});
			await save(ctx, Model, "save", {"pk": "p", "kind": "order", "ref": "2", "name": "second"});
			await save(ctx, Model, "save explicit combine", {"pk": "p", "sk": "given", "kind": "order", "ref": "3"}, {"return": "request"});
			await update(ctx, Model, "update", {"pk": "p", "sk": "order#1"}, {"note": "n"});
			await update(ctx, Model, "update partial combine", {"pk": "p", "sk": "order#1"}, {"name": "renamed"});
			await update(ctx, Model, "update key combine attribute", {"pk": "p", "sk": "order#1"}, {"name": "renamed", "kind": "invoice"});
			ctx.respond("getItem", answer({"Item": {"pk": {"S": "p"}, "sk": {"S": "order#1"}, "kind": {"S": "order"}, "ref": {"S": "1"}, "label": {"S": "order,first"}, "name": {"S": "first"}}}));
			await ctx.step("get", () => Model.get({"pk": "p", "sk": "order#1"}));
		}
	},
	{
		"name": "defaults, function defaults and forceDefault",
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"version": {"type": Number, "default": ctx.fn("default version", () => 1), "forceDefault": true},
				"createdBy": {"type": String, "default": ctx.fn("default createdBy", () => "system")},
				"status": {"type": String, "default": "NEW"},
				"stamp": {"type": Date, "default": ctx.fn("default stamp", () => new Date())},
				"nested": {"type": Object, "schema": {"level": {"type": Number, "default": 0}}}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save empty", {"id": "1"}, {"return": "request"});
			await save(ctx, Model, "save given", {"id": "2", "version": 5, "createdBy": "user", "status": "OLD", "nested": {}}, {"return": "request"});
			await save(ctx, Model, "save undefined marker", {"id": "3", "status": ctx.dynamoose.type.UNDEFINED}, {"return": "request"});
			const item = await ctx.step("new item", () => new Model(ctx.track("item input", {"id": "4"})));
			ctx.track("item", item);
			await ctx.step("save item once", () => item.save());
			await ctx.step("save item twice", () => item.save());
			await update(ctx, Model, "update", {"id": "1"}, {"status": "DONE"});
			await update(ctx, Model, "update add", {"id": "1"}, {"$ADD": {"version": 1}});
		}
	},
	{
		"name": "get and set modifiers",
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Model = ctx.model("Model", new Schema({
				"id": String,
				"name": {
					"type": String,
					"set": ctx.fn("set name", (value, oldValue) => `${value}`.trim() + (oldValue ? `<${oldValue}` : "")),
					"get": ctx.fn("get name", (value) => `${value}`.toUpperCase())
				},
				"code": {"type": String, "set": ctx.fn("async set code", async (value) => `${value}!`)}
			}));
			const Whole = ctx.model("Whole", new Schema({"id": String, "count": Number}, {
				"set": ctx.fn("schema set", (object) => ({...object, "count": (object.count || 0) + 1})),
				"get": ctx.fn("schema get", (object) => ({...object, "count": (object.count || 0) * 10}))
			}));
			ctx.respond("updateItem", answer({}));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "name": {"S": "bob"}, "code": {"S": "c!"}}}));
			await save(ctx, Model, "save", {"id": "1", "name": " bob ", "code": "c"}, {"return": "request"});
			const item = await ctx.step("get", () => Model.get("1"));
			ctx.track("got item", item);
			await ctx.step("mutate and save", () => {
				item.name = " tim ";
				return item.save({"return": "request"});
			});
			await update(ctx, Model, "update", {"id": "1"}, {"name": " ann ", "code": "d"});
			await save(ctx, Whole, "save whole", {"id": "1", "count": 1}, {"return": "request"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "count": {"N": "2"}}}));
			await ctx.step("get whole", () => Whole.get("1"));
		}
	},
	{
		"name": "validate",
		"failing": ["save several invalid", "save validator throws", "save async invalid", "save schema invalid"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Model = ctx.model("Model", new Schema({
				"id": String,
				"email": {"type": String, "validate": ctx.fn("validate email", (value) => value.includes("@"))},
				"code": {"type": String, "validate": /^[A-Z]{3}$/},
				"fixed": {"type": String, "validate": "ok"},
				"risky": {"type": String, "validate": ctx.fn("validate risky", (value) => {
					if (value === "boom") {
						throw new Error("validator exploded");
					}
					return true;
				})},
				"later": {"type": Number, "validate": ctx.fn("async validate later", async (value) => value < 10)},
				"nested": {"type": Object, "schema": {"n": {"type": Number, "validate": ctx.fn("validate nested.n", (value) => value >= 0)}}}
			}, {"validate": ctx.fn("schema validate", (object) => object.id !== "forbidden")}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save valid", {"id": "1", "email": "a@b", "code": "ABC", "fixed": "ok", "risky": "fine", "later": 1, "nested": {"n": 1}}, {"return": "request"});
			await save(ctx, Model, "save several invalid", {"id": "2", "email": "nope", "code": "abc", "fixed": "no", "nested": {"n": -1}});
			await save(ctx, Model, "save validator throws", {"id": "3", "risky": "boom"});
			await save(ctx, Model, "save async invalid", {"id": "4", "later": 11});
			await save(ctx, Model, "save schema invalid", {"id": "forbidden"});
			await update(ctx, Model, "update valid", {"id": "1"}, {"email": "c@d"});
			await update(ctx, Model, "update invalid nested", {"id": "1"}, {"$SET": {"nested.n": -5}});
		}
	},
	{
		"name": "enum",
		"failing": ["save invalid status", "save invalid nested", "update invalid"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"status": {"type": String, "enum": ["A", "B"], "required": true},
				"nested": {"type": Object, "schema": {"level": {"type": Number, "enum": [1, 2]}}}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save valid", {"id": "1", "status": "A", "nested": {"level": 2}}, {"return": "request"});
			await save(ctx, Model, "save invalid status", {"id": "2", "status": "C"});
			await save(ctx, Model, "save invalid nested", {"id": "3", "status": "B", "nested": {"level": 3}});
			await update(ctx, Model, "update invalid", {"id": "1"}, {"status": "Z"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "status": {"S": "Q"}, "nested": {"M": {"level": {"N": "9"}}}}}));
			await ctx.step("get stored outside enum", () => Model.get("1"));
		}
	},
	{
		"name": "saveUnknown paths",
		"failing": ["update listed paths"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Listed = ctx.model("Listed", new Schema({"id": String, "meta": Object, "list": Array, "known": String}, {"saveUnknown": ["meta.**", "extra", "list.*"]}));
			const Everything = ctx.model("Everything", new Schema({"id": String}, {"saveUnknown": true}));
			ctx.respond("updateItem", answer({}));
			const unknown = () => ({"meta": {"a": 1, "deep": {"b": [1, {"c": "d"}]}}, "extra": {"x": 1}, "list": [1, "two", {"three": 3}], "dropped": true});
			await save(ctx, Listed, "save listed", {"id": "1", "known": "k", ...unknown()}, {"return": "request"});
			await save(ctx, Everything, "save everything", {"id": "1", ...unknown()}, {"return": "request"});
			await update(ctx, Listed, "update listed paths", {"id": "1"}, {"$SET": {"meta.deep.e": 5, "dropped": 1, "extra": "y"}});
			await update(ctx, Everything, "update everything", {"id": "1"}, {"other": "x", "nested": {"y": 1}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "known": {"S": "k"}, "meta": {"M": {"z": {"N": "1"}}}, "extra": {"S": "e"}, "dropped": {"BOOL": true}}}));
			await ctx.step("get listed", () => Listed.get("1"));
			await ctx.step("get everything", () => Everything.get("1"));
		}
	},
	{
		// Unknown keys named like Object.prototype members; some of them fail on the published build.
		"name": "saveUnknown keys named like Object.prototype members",
		"failing": ["save meta.constructor", "save everything constructor", "get listed"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Listed = ctx.model("Listed", new Schema({"id": String, "meta": Object}, {"saveUnknown": ["meta.**"]}));
			const Everything = ctx.model("Everything", new Schema({"id": String}, {"saveUnknown": true}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Listed, "save meta.constructor", {"id": "1", "meta": {"constructor": "c"}}, {"return": "request"});
			await save(ctx, Listed, "save meta.toString", {"id": "1", "meta": {"toString": "t", "hasOwnProperty": "h"}}, {"return": "request"});
			await save(ctx, Everything, "save everything valueOf", {"id": "1", "valueOf": 1, "hasOwnProperty": "h", "toString": "t"}, {"return": "request"});
			await save(ctx, Everything, "save everything constructor", {"id": "1", "constructor": "c"}, {"return": "request"});
			await update(ctx, Listed, "update meta.constructor", {"id": "1"}, {"$SET": {"meta.constructor": "x"}});
			await update(ctx, Everything, "update everything", {"id": "1"}, {"constructor": "x", "nested": {"toString": 1}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "meta": {"M": {"constructor": {"S": "c"}, "toString": {"N": "1"}}}, "valueOf": {"S": "v"}}}));
			await ctx.step("get listed", () => Listed.get("1"));
			await ctx.step("get everything", () => Everything.get("1"));
		}
	},
	{
		"name": "date storages",
		"failing": ["save number for iso", "save invalid date"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"ms": Date,
				"seconds": {"type": {"value": Date, "settings": {"storage": "seconds"}}},
				"iso": {"type": {"value": Date, "settings": {"storage": "iso"}}}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save dates", {"id": "1", "ms": new Date(1500), "seconds": new Date(2500), "iso": new Date(3500)}, {"return": "request"});
			await save(ctx, Model, "save numbers", {"id": "2", "ms": 1500, "seconds": 2500}, {"return": "request"});
			await save(ctx, Model, "save number for iso", {"id": "4", "iso": 3500});
			await save(ctx, Model, "save invalid date", {"id": "3", "ms": "yesterday"});
			await update(ctx, Model, "update", {"id": "1"}, {"ms": new Date(1), "seconds": new Date(1999), "iso": new Date(2)});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "ms": {"N": "1500"}, "seconds": {"N": "2"}, "iso": {"S": "1970-01-01T00:00:03.500Z"}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "nested paths and list indices",
		"failing": ["update nested type mismatch"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"profile": {"type": Object, "schema": {
					"name": String,
					"age": Number,
					"address": {"type": Object, "schema": {"city": String, "zip": {"type": String, "default": "00000"}}}
				}},
				"tags": {"type": Array, "schema": [String]},
				"matrix": {"type": Array, "schema": [{"type": Array, "schema": [Number]}]}
			}));
			ctx.respond("updateItem", answer({"Attributes": {"id": {"S": "1"}, "profile": {"M": {"name": {"S": "n"}}}, "tags": {"L": [{"S": "a"}]}}}));
			await save(ctx, Model, "save", {"id": "1", "profile": {"name": "n", "age": 3, "address": {"city": "c"}}, "tags": ["a", "b"], "matrix": [[1, 2], [3]]}, {"return": "request"});
			await update(ctx, Model, "update deep path", {"id": "1"}, {"$SET": {"profile.address.city": "x", "profile.name": "o"}});
			await update(ctx, Model, "update list index", {"id": "1"}, {"$SET": {"tags.1": "z"}});
			await update(ctx, Model, "update nested list index", {"id": "1"}, {"$SET": {"matrix.0.1": 9}});
			await update(ctx, Model, "update remove paths", {"id": "1"}, {"$REMOVE": ["profile.age", "tags.0"]});
			await update(ctx, Model, "update undescribed nested key", {"id": "1"}, {"$SET": {"profile.unknown": 1}});
			await update(ctx, Model, "update nested object", {"id": "1"}, {"profile": {"name": "m", "address": {"city": "y"}}});
			await update(ctx, Model, "update nested type mismatch", {"id": "1"}, {"$SET": {"profile.age": "old"}});
		}
	},
	{
		// The model's table is made on the first call, after the Schema constructor looked up every
		// attribute; it adds the ttl attribute to the schema then.
		"name": "table expires from model options",
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({"id": String, "name": String}), {"expires": 60000});
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save", {"id": "1", "name": "n"}, {"return": "request"});
			await save(ctx, Model, "save with ttl", {"id": "2", "ttl": new Date(5000)}, {"return": "request"});
			await update(ctx, Model, "update", {"id": "1"}, {"name": "m"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "ttl": {"N": "1000"}}}));
			await ctx.step("get expired", () => Model.get("1"));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "ttl": {"N": "4000000000"}}}));
			await ctx.step("get live", () => Model.get("1"));
		}
	},
	{
		"name": "table expires on an explicit table",
		"run": async (ctx) => {
			const Other = ctx.model("Other", new ctx.dynamoose.Schema({"id": String, "name": String}));
			new ctx.dynamoose.Table(ctx.name("Table"), [Other], {"expires": {"ttl": 1000, "attribute": "expiresAt", "items": {"returnExpired": false}}});
			await save(ctx, Other, "save", {"id": "1"}, {"return": "request"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "expiresAt": {"N": "1000"}}}));
			await ctx.step("get expired", () => Other.get("1"));
			ctx.respond("query", answer({"Items": [{"id": {"S": "1"}, "expiresAt": {"N": "1000"}}, {"id": {"S": "2"}, "expiresAt": {"N": "4000000000"}}], "Count": 2}));
			await ctx.step("query", () => Other.query("id").eq("1").exec());
		}
	},
	{
		"name": "dynamoose.type.THIS",
		"run": async (ctx) => {
			const Model = ctx.model("Model", {"id": Number, "name": String, "parent": ctx.dynamoose.type.THIS});
			await save(ctx, Model, "save id", {"id": 1, "name": "child", "parent": 2}, {"return": "request"});
			const parent = await ctx.step("new parent", () => new Model({"id": 3, "name": "parent"}));
			await save(ctx, Model, "save item", {"id": 4, "parent": parent}, {"return": "request"});
			ctx.respond("getItem", answer({"Item": {"id": {"N": "1"}, "parent": {"N": "2"}}}));
			await ctx.step("get", () => Model.get(1));
		}
	},
	{
		"name": "model-typed attributes",
		"run": async (ctx) => {
			const User = ctx.model("User", {"id": Number, "name": String});
			const Game = ctx.model("Game", {"id": Number, "owner": User, "players": {"type": Array, "schema": [User]}});
			await save(ctx, Game, "save ids", {"id": 1, "owner": 2, "players": [2, 3]}, {"return": "request"});
			const owner = await ctx.step("new owner", () => new User({"id": 5, "name": "o"}));
			await save(ctx, Game, "save items", {"id": 2, "owner": owner, "players": [owner]}, {"return": "request"});
			ctx.respond("getItem", answer({"Item": {"id": {"N": "1"}, "owner": {"N": "2"}, "players": {"L": [{"N": "2"}]}}}));
			await ctx.step("get", () => Game.get(1));
		}
	},
	{
		"name": "model with several schemas",
		"failing": ["save b with default", "save matches none"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Model = ctx.model("Model", [
				new Schema({"id": String, "kind": {"type": String, "enum": ["a"]}, "a": String}),
				new Schema({"id": String, "kind": {"type": String, "enum": ["b"]}, "b": {"type": Number, "default": ctx.fn("default b", () => 7)}})
			]);
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save a", {"id": "1", "kind": "a", "a": "x"}, {"return": "request"});
			await save(ctx, Model, "save b", {"id": "2", "kind": "b", "b": 1}, {"return": "request"});
			await save(ctx, Model, "save b with default", {"id": "4", "kind": "b"}, {"return": "request"});
			await save(ctx, Model, "save matches none", {"id": "3", "kind": "c"});
			await update(ctx, Model, "update", {"id": "2"}, {"b": 8});
			ctx.respond("query", answer({"Items": [{"id": {"S": "1"}, "kind": {"S": "a"}, "a": {"S": "x"}}, {"id": {"S": "1"}, "kind": {"S": "b"}, "b": {"N": "1"}}], "Count": 2}));
			await ctx.step("query mixed", () => Model.query("id").eq("1").exec());
		}
	},
	{
		"name": "alias and map",
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"_id": {"type": String, "hashKey": true, "map": "id"},
				"data": {"type": String, "alias": ["info", "details"]},
				"plain": String
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save aliases", {"id": "1", "info": "i", "plain": "p"}, {"return": "request"});
			await save(ctx, Model, "save names", {"_id": "2", "data": "d"}, {"return": "request"});
			await update(ctx, Model, "update", {"id": "1"}, {"details": "x"});
			ctx.respond("getItem", answer({"Item": {"_id": {"S": "1"}, "data": {"S": "d"}, "plain": {"S": "p"}}}));
			await ctx.step("get", () => Model.get({"id": "1"}));
		}
	},
	{
		"name": "timestamps",
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const Plain = ctx.model("Plain", new Schema({"id": String, "name": String}, {"timestamps": true}));
			const Custom = ctx.model("Custom", new Schema({"id": String, "name": String}, {"timestamps": {
				"createdAt": ["created", "createdOn"],
				"updatedAt": {"modified": {"type": {"value": Date, "settings": {"storage": "seconds"}}}}
			}}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Plain, "save plain", {"id": "1", "name": "n"}, {"return": "request"});
			await save(ctx, Custom, "save custom", {"id": "1", "name": "n"}, {"return": "request"});
			await save(ctx, Custom, "save custom given", {"id": "2", "created": new Date(1000), "modified": new Date(2000)}, {"return": "request"});
			await update(ctx, Plain, "update plain", {"id": "1"}, {"name": "m"});
			await update(ctx, Custom, "update custom", {"id": "1"}, {"name": "m"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "created": {"N": "1000"}, "createdOn": {"N": "1000"}, "modified": {"N": "2"}}}));
			await ctx.step("get custom", () => Custom.get("1"));
		}
	},
	{
		"name": "constant",
		"failing": ["save wrong constant"],
		"run": async (ctx) => {
			const {CONSTANT} = ctx.dynamoose.type;
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({"id": String, "kind": CONSTANT("order"), "version": CONSTANT(2), "live": {"type": CONSTANT(true)}}));
			await save(ctx, Model, "save valid", {"id": "1", "kind": "order", "version": 2, "live": true}, {"return": "request"});
			await save(ctx, Model, "save wrong constant", {"id": "2", "kind": "invoice"});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "kind": {"S": "order"}, "version": {"N": "2"}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "any",
		"run": async (ctx) => {
			const {ANY} = ctx.dynamoose.type;
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({"id": String, "data": ANY, "object": {"type": Object, "schema": ANY}, "list": {"type": Array, "schema": ANY}}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save string", {"id": "1", "data": "s", "object": {"a": 1}, "list": [1, "a"]}, {"return": "request"});
			await save(ctx, Model, "save nested", {"id": "2", "data": {"when": new Date(1000), "set": new Set(["a"]), "list": [null, true]}, "object": {"deep": {"x": [1]}}, "list": [{"a": 1}]}, {"return": "request"});
			await update(ctx, Model, "update", {"id": "1"}, {"data": 5, "object": {"b": 2}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "data": {"M": {"x": {"N": "1"}}}, "object": {"M": {"a": {"S": "b"}}}, "list": {"L": [{"N": "1"}]}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "nested Schema instance",
		"failing": ["save missing nested required"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const address = new Schema({"city": {"type": String, "required": true}, "zip": {"type": String, "default": "00000"}});
			const Model = ctx.model("Model", new Schema({"id": String, "address": {"type": Object, "schema": address}, "addresses": {"type": Array, "schema": [{"type": Object, "schema": address}]}}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save", {"id": "1", "address": {"city": "c"}, "addresses": [{"city": "d", "zip": "1"}]}, {"return": "request"});
			await save(ctx, Model, "save missing nested required", {"id": "2", "address": {"zip": "2"}});
			await update(ctx, Model, "update", {"id": "1"}, {"$SET": {"address.city": "e"}});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "address": {"M": {"city": {"S": "c"}}}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "update operators $ADD, $REMOVE and $DELETE",
		"failing": ["update add to a string"],
		"run": async (ctx) => {
			const {Schema, Condition} = ctx.dynamoose;
			const Model = ctx.model("Model", new Schema({
				"id": String,
				"count": Number,
				"tags": {"type": Set, "schema": [String]},
				"list": {"type": Array, "schema": [String]},
				"note": String,
				"other": {"type": String, "default": "x"}
			}));
			ctx.respond("updateItem", answer({"Attributes": {"id": {"S": "1"}, "count": {"N": "3"}, "tags": {"SS": ["b"]}}}));
			await update(ctx, Model, "update add", {"id": "1"}, {"$ADD": {"count": 2, "tags": ["b"], "list": ["z"]}});
			await update(ctx, Model, "update remove", {"id": "1"}, {"$REMOVE": ["note"]});
			await update(ctx, Model, "update remove string", {"id": "1"}, {"$REMOVE": "other"});
			await update(ctx, Model, "update delete", {"id": "1"}, {"$DELETE": {"tags": ["a"]}});
			await update(ctx, Model, "update combined", {"id": "1"}, {"$SET": {"note": "n"}, "$ADD": {"count": 1}, "$REMOVE": ["other"], "list": ["a"]});
			await update(ctx, Model, "update with condition", {"id": "1"}, {"count": 4}, {"condition": new Condition("count").gt(1)});
			await update(ctx, Model, "update request", {"id": "1"}, {"$ADD": {"count": 1}}, {"return": "request"});
			await update(ctx, Model, "update add to a string", {"id": "1"}, {"$ADD": {"note": 1}});
			await ctx.step("update key in body", () => Model.update(ctx.track("key in body", {"id": "1", "count": 9})));
		}
	},
	{
		"name": "transactions",
		"failing": ["transaction invalid create"],
		"run": async (ctx) => {
			const {Condition} = ctx.dynamoose;
			const Order = ctx.model("Order", new ctx.dynamoose.Schema({"id": String, "total": {"type": Number, "required": true}, "status": {"type": String, "default": "NEW"}}));
			const Line = ctx.model("Line", new ctx.dynamoose.Schema({"id": String, "qty": Number}));
			ctx.respond("transactWriteItems", answer({}));
			await ctx.step("transaction write", () => ctx.dynamoose.transaction([
				Order.transaction.create({"id": "1", "total": 5}),
				Order.transaction.update({"id": "2"}, {"$ADD": {"total": 1}}),
				Line.transaction.delete({"id": "3"}),
				Line.transaction.condition("4", new Condition("qty").exists())
			]));
			await ctx.step("transaction request", () => ctx.dynamoose.transaction([Order.transaction.create({"id": "5", "total": 1})], {"return": "request"}));
			await ctx.step("transaction invalid create", () => ctx.dynamoose.transaction([Order.transaction.create({"id": "6"})]));
			ctx.respond("transactGetItems", answer({"Responses": [{"Item": {"id": {"S": "1"}, "total": {"N": "5"}}}, {"Item": {"id": {"S": "3"}, "qty": {"N": "2"}}}]}));
			await ctx.step("transaction get", () => ctx.dynamoose.transaction([Order.transaction.get("1"), Line.transaction.get("3")]));
		}
	},
	{
		"name": "sequence of calls on one model",
		"failing": ["save rejected by DynamoDB"],
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"name": String,
				"count": {"type": Number, "default": 0},
				"tags": {"type": Set, "schema": [String]}
			}, {"timestamps": true}));
			const request = await save(ctx, Model, "save request", {"id": "1", "name": "first", "tags": ["a"]}, {"return": "request"});
			ctx.respond("getItem", answer({"Item": request.Item}));
			const item = await ctx.step("get", () => Model.get("1"));
			ctx.track("got item", item);
			await ctx.step("mutate and save", () => {
				item.name = "second";
				item.count += 1;
				return item.save();
			});
			await ctx.step("save again unchanged", () => item.save({"return": "request"}));
			ctx.respond("updateItem", answer({"Attributes": request.Item}));
			await update(ctx, Model, "update", {"id": "1"}, {"name": "third"});
			await ctx.step("create", () => Model.create(ctx.track("create input", {"id": "2", "name": "created"})));
			await ctx.step("create without overwrite", () => Model.create(ctx.track("create input 2", {"id": "3"}), {"overwrite": false, "return": "request"}));
			ctx.respond("deleteItem", answer({}));
			await ctx.step("delete", () => Model.delete("2"));
			ctx.respond("getItem", answer({}));
			await ctx.step("get missing", () => Model.get("2"));
			ctx.respond("batchGetItem", answer({"Responses": {[ctx.name("Model")]: [request.Item]}, "UnprocessedKeys": {}}));
			await ctx.step("batch get", () => Model.batchGet(["1", "9"]));
			ctx.respond("putItem", () => Promise.reject(Object.assign(new Error("The conditional request failed"), {"name": "ConditionalCheckFailedException"})));
			await ctx.step("save rejected by DynamoDB", () => new Model({"id": "4"}).save());
			await ctx.step("save after rejection", () => new Model({"id": "5"}).save({"return": "request"}));
		}
	},
	{
		// The Set branch of getAttributeTypeDetails reads the schema setting, which calls a function-valued
		// schema on every lookup. The function answers differently on each call.
		"name": "function-valued Set schema",
		// Which type the codes schema gives depends on how many calls came before.
		"failing": ["save codes"],
		"run": async (ctx) => {
			let calls = 0;
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"tags": {"type": Set, "schema": ctx.fn("schema tags", () => [String])},
				"codes": {"type": Set, "schema": ctx.fn("schema codes", () => calls++ % 2 ? [Number] : [String])}
			}));
			ctx.respond("updateItem", answer({}));
			await save(ctx, Model, "save request", {"id": "1", "tags": new Set(["a"])}, {"return": "request"});
			await save(ctx, Model, "save codes", {"id": "3", "codes": new Set(["x"])}, {"return": "request"});
			await save(ctx, Model, "save", {"id": "2", "tags": ["b"]});
			await update(ctx, Model, "update", {"id": "1"}, {"tags": new Set(["c"])});
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "tags": {"SS": ["a"]}, "codes": {"SS": ["x"]}}}));
			await ctx.step("get", () => Model.get("1"));
		}
	},
	{
		"name": "populate",
		"run": async (ctx) => {
			const User = ctx.model("User", {"id": Number, "name": String});
			const Game = ctx.model("Game", {"id": Number, "name": String, "owner": User});
			ctx.respond("getItem", (params) => Promise.resolve(params.TableName === ctx.name("User") ? {"Item": {"id": {"N": "2"}, "name": {"S": "owner"}}} : {"Item": {"id": {"N": "1"}, "name": {"S": "game"}, "owner": {"N": "2"}}}));
			const game = await ctx.step("get", () => Game.get(1));
			ctx.track("game", game);
			await ctx.step("populate", () => game.populate());
		}
	},
	{
		"name": "create table request with indexes",
		"run": async (ctx) => {
			const Model = ctx.model("Model", new ctx.dynamoose.Schema({
				"id": String,
				"sk": {"type": String, "rangeKey": true},
				"email": {"type": String, "index": {"type": "global", "name": "emailIndex", "rangeKey": "createdAt"}},
				"createdAt": {"type": Number, "index": {"type": "local", "name": "createdIndex"}},
				"profile": {"type": Object, "schema": {"city": String}}
			}));
			await ctx.step("create table request", () => Model.table().create({"return": "request"}));
		}
	},
	{
		// The public Schema methods called directly, in a sequence that reuses paths: the cache must not
		// change any result, and a caller that changes a returned value must not change the next result.
		"name": "Schema methods called directly",
		"failing": ["type details of a path into an array of definitions with a map that misses it", "type details of a list index path"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const schema = new Schema({
				"id": String,
				"ttl": String,
				"address": {"type": Object, "schema": {"city": String, "zip": {"type": [String, Number]}}},
				"when": {"type": {"value": Date, "settings": {"storage": "iso"}}},
				"tags": {"type": Set, "schema": [String]},
				"data": [
					{"type": Object, "schema": {"a": String}},
					{"type": Object, "schema": {"b": Number}}
				]
			}, {"saveUnknown": true});
			const attributes = await ctx.step("attributes", () => schema.attributes());
			await ctx.step("change the returned attributes", () => attributes.push("changed"));
			await ctx.step("attributes again", () => schema.attributes());
			for (const path of ["address.city", "address.zip", "when", "tags", "data", "data.b", "constructor", "address.toString"]) {
				await ctx.step(`value of ${path}`, () => schema.getAttributeValue(path));
				await ctx.step(`value of ${path} again`, () => schema.getAttributeValue(path));
			}
			await ctx.step("value of data.b with a map", () => schema.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 1}}));
			await ctx.step("value of data.b with a map that misses it", () => schema.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 0}}));
			await ctx.step("value of data.b without a map after a map", () => schema.getAttributeValue("data.b"));
			await ctx.step("type details of data.b", () => schema.getAttributeTypeDetails("data.b"));
			await ctx.step("type details of a path into an array of definitions with a map that misses it", () => schema.getAttributeTypeDetails("data.b", {"typeIndexOptionMap": {"data": 0}}));
			for (const path of ["address.city", "address.zip", "when", "tags", "ttl"]) {
				const details = await ctx.step(`type details of ${path}`, () => schema.getAttributeTypeDetails(path));
				await ctx.step(`change the type details of ${path}`, () => {
					for (const entry of Array.isArray(details) ? details : [details]) {
						entry.name = "Changed";
						entry.dynamodbType = "N";
						entry.typeSettings.changed = true;
						if (entry.set) {
							entry.set.name = "Changed Set";
						}
						if (entry.customType) {
							entry.customType.functions.toDynamo = () => "changed";
						}
					}
				});
				await ctx.step(`type details of ${path} again`, () => schema.getAttributeTypeDetails(path));
				await ctx.step(`type of ${path}`, () => schema.getAttributeType(path));
			}
			await ctx.step("type details of a list index path", () => schema.getAttributeTypeDetails("tags.3", {"standardKey": true}));
			// The table writes a Date ttl attribute over the declared String one.
			new ctx.dynamoose.Table(ctx.name("Table"), [ctx.model("Model", schema)], {"expires": 1000, "initialize": false});
			await ctx.step("attributes after the ttl write", () => schema.attributes());
			await ctx.step("value of ttl after the ttl write", () => schema.getAttributeValue("ttl"));
			await ctx.step("type details of ttl after the ttl write", () => schema.getAttributeTypeDetails("ttl"));
			await ctx.step("type of ttl after the ttl write", () => schema.getAttributeType("ttl"));
		}
	},
	{
		// A non-string key throws a TypeError whose message V8 builds from the source expression that
		// failed, so the lookup must fail in an expression of the same shape as in the baseline.
		"name": "Schema lookups with a non-string key",
		"failing": ["5", "[\"a\"]", "{}"].flatMap((key) => [true, false].flatMap((standardKey) => [`value of ${key} with standardKey ${standardKey}`, `type details of ${key} with standardKey ${standardKey}`])),
		"run": async (ctx) => {
			const schema = new ctx.dynamoose.Schema({"id": String, "a": {"type": Object, "schema": {"b": String}}});
			for (const key of [5, ["a"], {}]) {
				for (const standardKey of [true, false]) {
					await ctx.step(`value of ${JSON.stringify(key)} with standardKey ${standardKey}`, () => schema.getAttributeValue(key, {standardKey}));
					await ctx.step(`type details of ${JSON.stringify(key)} with standardKey ${standardKey}`, () => schema.getAttributeTypeDetails(key, {standardKey}));
				}
			}
		}
	},
	{
		// getAttributeTypeDetails writes the schema into the definition's own THIS settings object on every
		// lookup. With one definition in two schemas, each lookup must write its own schema again.
		"name": "THIS definition shared by two schemas",
		"run": async (ctx) => {
			const definition = {"type": {"value": ctx.dynamoose.type.THIS, "settings": {}}};
			const A = ctx.model("A", new ctx.dynamoose.Schema({"id": String, "ref": definition}));
			const B = ctx.model("B", new ctx.dynamoose.Schema({"pk": Number, "ref": definition}));
			ctx.track("definition", definition);
			await ctx.step("create b", () => B.create(ctx.track("create b input", {"pk": 1, "ref": 2})));
			await ctx.step("create a", () => A.create(ctx.track("create a input", {"id": "1", "ref": "2"})));
			await ctx.step("create b again", () => B.create(ctx.track("create b again input", {"pk": 3, "ref": 4})));
			ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "ref": {"S": "2"}}}));
			await ctx.step("get a", () => A.get("1"));
		}
	},
	{
		// A type lookup can write the THIS settings object and then throw (a THIS Set on a schema with a range
		// key). attributes() swallows the error; the write must still happen on each call, because a result
		// the caller kept from the other schema reads that settings object.
		"name": "THIS Set definition shared by two schemas, one lookup throws",
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const definition = {"type": {"value": Set, "settings": {}}, "schema": [ctx.dynamoose.type.THIS]};
			const B = new Schema({"pk": Number, "refs": definition});
			const A = new Schema({"id": String, "sk": {"type": String, "rangeKey": true}, "refs": definition});
			const details = await ctx.step("type details of b", () => B.getAttributeTypeDetails("refs"));
			const isOfType = () => details.customType.functions.isOfType(new Set([1]), "toDynamo");
			await ctx.step("b result checks a number", isOfType);
			await ctx.step("attributes of a", () => A.attributes());
			await ctx.step("b result after attributes of a", isOfType);
			await ctx.step("type details of b again", () => B.getAttributeTypeDetails("refs"));
			await ctx.step("attributes of a again", () => A.attributes());
			await ctx.step("b result after attributes of a again", isOfType);
		}
	},
	{
		// User code that replaces a public lookup method (a spy, a plugin) must see every call dynamoose
		// makes through it, with the same arguments, also for a schema whose lookups ran before.
		"name": "replaced Schema lookup methods",
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const schema = new Schema({
				"id": String,
				"name": String,
				"tags": {"type": Set, "schema": [String]},
				"address": {"type": Object, "schema": {"city": String}}
			});
			const Model = ctx.model("Model", schema);
			ctx.respond("updateItem", answer({}));
			const operations = async (label) => {
				await save(ctx, Model, `${label}: save`, {"id": "1", "name": "n", "tags": new Set(["a"]), "address": {"city": "c"}}, {"return": "request"});
				await update(ctx, Model, `${label}: update`, {"id": "1"}, {"name": "m", "address": {"city": "d"}});
				ctx.respond("getItem", answer({"Item": {"id": {"S": "1"}, "name": {"S": "n"}, "tags": {"SS": ["a"]}}}));
				await ctx.step(`${label}: get`, () => Model.get("1"));
				await ctx.step(`${label}: attributes`, () => schema.attributes());
			};
			await operations("warm");
			for (const method of ["getAttributeTypeDetails", "getAttributeValue", "getAttributeSettingValue", "getAttributeType"]) {
				const original = Schema.prototype[method];
				Schema.prototype[method] = ctx.fn(method, function (...args) {
					return original.apply(this, args);
				});
				try {
					await operations(`${method} replaced`);
					await operations(`${method} replaced, again`);
				} finally {
					Schema.prototype[method] = original;
				}
			}
		}
	},
	{
		// The Schema constructor writes the timestamp attributes into the caller's definition object, which
		// an earlier schema can hold as a nested schema.
		"name": "timestamps schema built on a nested definition of an earlier schema",
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const nested = ctx.track("nested definition", {"street": String});
			const schema = new Schema({"id": String, "address": {"type": Object, "schema": nested}});
			const Model = ctx.model("Model", schema);
			await ctx.step("attributes before", () => schema.attributes());
			await ctx.step("new timestamps schema", () => new Schema(nested, {"timestamps": true}).attributes());
			await ctx.step("attributes after", () => schema.attributes());
			await ctx.step("value of address.createdAt", () => schema.getAttributeValue("address.createdAt"));
			await save(ctx, Model, "save", {"id": "1", "address": {"street": "s", "createdAt": new Date(0)}}, {"return": "request"});
		}
	},
	{
		// The constructor writes the timestamp attributes one at a time and throws on one the definition
		// already has, so the attributes it wrote before the throw stay in the caller's definition object.
		"name": "timestamps schema that throws after writing into a nested definition of an earlier schema",
		"failing": ["new timestamps schema"],
		"run": async (ctx) => {
			const {Schema} = ctx.dynamoose;
			const nested = ctx.track("nested definition", {"street": String});
			const schema = new Schema({"id": String, "address": {"type": Object, "schema": nested}});
			const Model = ctx.model("Model", schema);
			await save(ctx, Model, "save before", {"id": "1", "address": {"street": "s"}}, {"return": "request"});
			await ctx.step("new timestamps schema", () => new Schema(nested, {"timestamps": {"createdAt": "created", "updatedAt": "street"}}));
			await ctx.step("attributes after", () => schema.attributes());
			await save(ctx, Model, "save after", {"id": "2", "address": {"street": "s", "created": new Date(5)}}, {"return": "request"});
		}
	}
];

module.exports = [...benchmarkCases, ...edgeCases];
