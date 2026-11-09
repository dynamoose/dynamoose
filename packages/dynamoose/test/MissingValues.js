const dynamoose = require("../dist");
const CustomError = require("../dist/Error").default;
const utils = require("../dist/utils").default;

// Requests DynamoDB always rejects for a missing (`undefined`), NULL or empty key value, or an `undefined` condition value, throw an `InvalidParameter` error before anything is sent.
describe("Missing and empty values", () => {
	beforeEach(() => {
		dynamoose.Table.defaults.set({"create": false, "waitForActive": false});
	});
	afterEach(() => {
		dynamoose.Table.defaults.set({});
	});

	let requests, warnSpy;
	const responses = {
		"query": () => ({"Items": []}),
		"scan": () => ({"Items": []}),
		"getItem": () => ({}),
		"putItem": () => ({}),
		"updateItem": () => ({"Attributes": {}}),
		"deleteItem": () => ({}),
		"batchGetItem": (request) => ({"Responses": Object.keys(request.RequestItems).reduce((result, table) => ({...result, [table]: []}), {}), "UnprocessedKeys": {}}),
		"batchWriteItem": () => ({"UnprocessedItems": {}}),
		"transactGetItems": () => ({"Responses": []}),
		"transactWriteItems": () => ({})
	};
	beforeEach(() => {
		requests = [];
		dynamoose.aws.ddb.set(Object.keys(responses).reduce((client, operation) => ({
			...client,
			[operation]: async (request) => {
				requests.push({operation, request});
				return responses[operation](request);
			}
		}), {}));
		warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
	});
	afterEach(() => {
		dynamoose.aws.ddb.revert();
		// No path warns any more: the request throws instead.
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	const conditionError = (attribute) => new CustomError.InvalidParameter(`The condition on "${attribute}" has no value (it is undefined).`);
	const rawError = (placeholder) => new CustomError.InvalidParameter(`The raw condition has no value for "${placeholder}" (it is undefined).`);
	const problems = {"undefined": "has no value (it is undefined)", "null": "has no value (it is null)", "empty": "has an empty value"};
	const keyConditionError = (attribute, problem) => new CustomError.InvalidParameter(`The key condition on "${attribute}" ${problems[problem]}. A query needs a value for every key condition, and DynamoDB doesn't allow an empty string or binary value for a key attribute.`);
	const beginsWithError = (attribute, type) => new CustomError.InvalidParameter(`The beginsWith condition on "${attribute}" needs a string or binary value, but the value has the DynamoDB type ${type}.`);
	const keyError = (attribute, problem) => new CustomError.InvalidParameter(`The key attribute "${attribute}" ${problems[problem]}. DynamoDB needs a value for every key attribute of the table, and doesn't allow NULL or an empty string or binary value for one.`);
	const indexKeyError = (attribute, index, problem) => new CustomError.InvalidParameter(`"${attribute}", a key attribute of the index "${index}", ${problems[problem]}. DynamoDB doesn't allow NULL or an empty string or binary value for a key attribute of an index. Leave the attribute out to leave the item out of the index.`);
	const expectRejectedBeforeSending = async (promise, error) => {
		await expect(promise).rejects.toEqual(error);
		expect(requests).toEqual([]);
	};
	const sentOperations = () => requests.map(({operation}) => operation);

	let Account;
	beforeEach(() => {
		Account = dynamoose.model("Account", new dynamoose.Schema({
			"pk": {"type": String, "hashKey": true, "alias": "email"},
			"sk": {"type": String, "rangeKey": true},
			"gpk": {"type": String, "index": {"name": "gsi", "type": "global", "rangeKey": "gsk"}},
			"gsk": String,
			"lsk": {"type": String, "index": {"name": "lsi", "type": "local"}},
			"note": String,
			"count": Number,
			"data": Buffer,
			"filled": {"type": String, "set": (value) => value === undefined ? "filled" : value},
			"address": {"type": Object, "schema": {"city": String}}
		}));
		new dynamoose.Table("Account", [Account]);
	});

	describe("Condition values that are undefined", () => {
		const chained = [
			["eq", (c) => c.eq(undefined)],
			["ne", (c) => c.ne(undefined)],
			["lt", (c) => c.lt(undefined)],
			["le", (c) => c.le(undefined)],
			["gt", (c) => c.gt(undefined)],
			["ge", (c) => c.ge(undefined)],
			["beginsWith", (c) => c.beginsWith(undefined)],
			["contains", (c) => c.contains(undefined)],
			["not().eq", (c) => c.not().eq(undefined)],
			["not().contains", (c) => c.not().contains(undefined)],
			["in with an undefined item", (c) => c.in(["a", undefined])],
			["between with an undefined first value", (c) => c.between(undefined, "z")],
			["between with an undefined second value", (c) => c.between("a", undefined)],
			["between with one value", (c) => c.between("a")],
			["in with no list", (c) => c.in(undefined)],
			["between with no values", (c) => c.between()]
		];
		chained.forEach(([name, apply]) => {
			it(`Should throw for a scan filter ${name}`, async () => {
				await expectRejectedBeforeSending(apply(Account.scan("note")).exec(), conditionError("note"));
			});
		});

		const objects = [
			["a value", {"note": undefined}],
			["eq", {"note": {"eq": undefined}}],
			["ne", {"note": {"ne": undefined}}],
			["beginsWith", {"note": {"beginsWith": undefined}}],
			["in", {"note": {"in": [undefined]}}],
			["between", {"note": {"between": ["a"]}}],
			["in and no list", {"note": {"in": undefined}}],
			["between and no list", {"note": {"between": undefined}}]
		];
		objects.forEach(([name, object]) => {
			it(`Should throw for an object scan filter with ${name}, instead of a TypeError when it is built`, async () => {
				await expectRejectedBeforeSending(Account.scan(object).exec(), conditionError("note"));
			});
		});

		it("Should throw for a query filter, in both forms", async () => {
			await expectRejectedBeforeSending(Account.query("pk").eq("a").filter("note").eq(undefined).exec(), conditionError("note"));
			await expectRejectedBeforeSending(Account.query({"pk": "a", "note": undefined}).exec(), conditionError("note"));
		});

		it("Should throw for a query key condition, in both forms", async () => {
			await expectRejectedBeforeSending(Account.query("pk").eq(undefined).exec(), conditionError("pk"));
			await expectRejectedBeforeSending(Account.query({"pk": undefined}).exec(), conditionError("pk"));
			await expectRejectedBeforeSending(Account.query("pk").eq("a").where("sk").between("a").exec(), conditionError("sk"));
		});

		it("Should name the attribute, not its alias", async () => {
			await expectRejectedBeforeSending(Account.query("email").eq(undefined).exec(), conditionError("pk"));
		});

		it("Should throw for a nested attribute", async () => {
			await expectRejectedBeforeSending(Account.scan("address.city").eq(undefined).exec(), conditionError("address.city"));
		});

		it("Should throw for a condition in a group", async () => {
			await expectRejectedBeforeSending(Account.scan(new dynamoose.Condition().where("count").gt(1).or().group((c) => c.where("note").eq(undefined))).exec(), conditionError("note"));
		});

		it("Should throw with a callback", async () => {
			const error = await new Promise((resolve) => Account.scan("note").eq(undefined).exec(resolve));
			expect(error).toEqual(conditionError("note"));
			expect(requests).toEqual([]);
		});

		it("Should throw from getRequest", async () => {
			await expectRejectedBeforeSending(Account.scan("note").eq(undefined).getRequest(), conditionError("note"));
		});

		it("Should not throw when it is built, only when a request uses it", () => {
			expect(() => new dynamoose.Condition("note").eq(undefined)).not.toThrow();
			expect(() => new dynamoose.Condition({"note": undefined, "count": {"lt": undefined}})).not.toThrow();
			expect(() => Account.query({"pk": undefined})).not.toThrow();
		});

		it("Should throw for an attribute with a set function, which doesn't run for an undefined condition value", async () => {
			await expectRejectedBeforeSending(Account.scan("filled").eq(undefined).exec(), conditionError("filled"));
		});

		it("Should send the value a set function gives a defined condition value", async () => {
			await Account.scan("filled").eq("x").exec();
			expect(requests[0].request.ExpressionAttributeValues).toEqual({":v0": {"S": "x"}});
		});

		it("Should allow exists and not().exists, which have no value", async () => {
			await Account.scan("note").exists().and().where("count").not().exists().exec();
			expect(requests[0].request.FilterExpression).toEqual("attribute_exists (#a0) AND attribute_not_exists (#a1)");
			expect(requests[0].request.ExpressionAttributeValues).toBeUndefined();
		});

		describe("Write conditions", () => {
			const condition = () => new dynamoose.Condition("note").eq(undefined);
			const writes = [
				["Model.create", () => Account.create({"pk": "a", "sk": "b"}, {"condition": condition()})],
				["item.save", () => new Account({"pk": "a", "sk": "b"}).save({"condition": condition()})],
				["Model.update", () => Account.update({"pk": "a", "sk": "b"}, {"note": "x"}, {"condition": condition()})],
				["Model.delete", () => Account.delete({"pk": "a", "sk": "b"}, {"condition": condition()})],
				["Model.update with an object condition", () => Account.update({"pk": "a", "sk": "b"}, {"note": "x"}, {"condition": new dynamoose.Condition({"note": undefined})})],
				["a transaction condition", async () => dynamoose.transaction([Account.transaction.condition({"pk": "a", "sk": "b"}, condition())])],
				["a transaction update", async () => dynamoose.transaction([Account.transaction.update({"pk": "a", "sk": "b"}, {"note": "x"}, {"condition": condition()})])],
				["a transaction create", async () => dynamoose.transaction([Account.transaction.create({"pk": "a", "sk": "b"}, {"condition": condition()})])],
				["a transaction delete", async () => dynamoose.transaction([Account.transaction.delete({"pk": "a", "sk": "b"}, {"condition": condition()})])]
			];
			writes.forEach(([name, write]) => {
				it(`Should throw for ${name}`, async () => {
					await expectRejectedBeforeSending(write(), conditionError("note"));
				});
			});

			it("Should throw for Model.update with a callback", async () => {
				const error = await new Promise((resolve) => Account.update({"pk": "a", "sk": "b"}, {"note": "x"}, {"condition": condition()}, resolve));
				expect(error).toEqual(conditionError("note"));
				expect(requests).toEqual([]);
			});

			it("Should throw for item.save with return request and a callback", async () => {
				const error = await new Promise((resolve) => new Account({"pk": "a", "sk": "b"}).save({"condition": condition(), "return": "request"}, resolve));
				expect(error).toEqual(conditionError("note"));
			});
		});

		describe("Raw conditions", () => {
			const raw = (expression, values) => new dynamoose.Condition({"FilterExpression": expression, "ExpressionAttributeNames": {"#note": "note", "#pk": "pk"}, ...values === undefined ? {} : {"ExpressionAttributeValues": values}});

			it("Should throw for an undefined value", async () => {
				await expectRejectedBeforeSending(Account.scan(raw("#note = :note", {":note": undefined})).exec(), rawError(":note"));
			});

			it("Should throw for a placeholder without a value", async () => {
				await expectRejectedBeforeSending(Account.scan(raw("#note = :note AND #pk = :pk", {":note": "a"})).exec(), rawError(":pk"));
			});

			it("Should throw for a write condition", async () => {
				await expectRejectedBeforeSending(Account.delete({"pk": "a", "sk": "b"}, {"condition": new dynamoose.Condition({"ConditionExpression": "#note = :note", "ExpressionAttributeNames": {"#note": "note"}, "ExpressionAttributeValues": {":note": undefined}})}), rawError(":note"));
			});

			it("Should allow an expression without placeholders", async () => {
				await Account.scan(raw("attribute_exists(#note)", {})).exec();
				expect(sentOperations()).toEqual(["scan"]);
			});

			it("Should allow a null value in a filter", async () => {
				await Account.scan(raw("#note = :note", {":note": null})).exec();
				expect(requests[0].request.ExpressionAttributeValues).toEqual({":note": {"NULL": true}});
			});

			it("Should send each value as given when the schema's set setting adds attributes", async () => {
				const Note = dynamoose.model("Note", new dynamoose.Schema({"pk": String, "note": String}, {"set": (item) => ({"extra": "x", ...item})}));
				new dynamoose.Table("Note", [Note]);
				await Note.scan(raw("#note = :note AND #pk = :pk", {":note": "a", ":pk": "b"})).exec();
				expect(requests[0].request.ExpressionAttributeValues).toEqual({":note": {"S": "a"}, ":pk": {"S": "b"}});
			});
		});
	});

	describe("beginsWith values that DynamoDB can't compare", () => {
		[["null", null, "NULL"], ["a number", 5, "N"], ["a boolean", true, "BOOL"], ["a list", ["a"], "L"], ["a map", {"a": "b"}, "M"]].forEach(([name, value, type]) => {
			it(`Should throw before sending for ${name} in a filter`, async () => {
				await expectRejectedBeforeSending(Account.scan("count").beginsWith(value).exec(), beginsWithError("count", type));
			});
		});

		it("Should throw for the object form and a write condition", async () => {
			await expectRejectedBeforeSending(Account.scan({"note": {"beginsWith": null}}).exec(), beginsWithError("note", "NULL"));
			await expectRejectedBeforeSending(Account.delete({"pk": "a", "sk": "b"}, {"condition": new dynamoose.Condition("note").beginsWith(null)}), beginsWithError("note", "NULL"));
		});

		it("Should throw for a number on a Number sort key, which DynamoDB doesn't allow begins_with on", async () => {
			const Reading = dynamoose.model("Reading", {"id": {"type": String, "hashKey": true}, "at": {"type": Number, "rangeKey": true}});
			new dynamoose.Table("Reading", [Reading]);
			await expectRejectedBeforeSending(Reading.query("id").eq("a").where("at").beginsWith(10).exec(), beginsWithError("at", "N"));
		});

		it("Should send a string, an empty string and a binary value", async () => {
			await Account.scan("note").beginsWith("a").exec();
			await Account.scan("note").beginsWith("").exec();
			await Account.scan("data").beginsWith(Buffer.from("a")).exec();
			expect(requests.map(({request}) => request.ExpressionAttributeValues[":v0"])).toEqual([{"S": "a"}, {"S": ""}, {"B": Buffer.from("a")}]);
		});
	});

	describe("Condition values that are null or empty, outside a key condition", () => {
		it("Should send a null filter as NULL, in both forms", async () => {
			await Account.scan("note").eq(null).exec();
			await Account.scan({"note": null}).exec();
			await Account.scan({"note": {"ne": null}}).exec();
			expect(requests.map(({request}) => [request.FilterExpression, request.ExpressionAttributeValues])).toEqual([
				["#a0 = :v0", {":v0": {"NULL": true}}],
				["#a0 = :v0", {":v0": {"NULL": true}}],
				["#a0 <> :v0", {":v0": {"NULL": true}}]
			]);
		});

		it("Should send an empty string filter", async () => {
			await Account.query("pk").eq("a").filter("note").eq("").exec();
			expect(requests[0].request.ExpressionAttributeValues).toEqual({":qhv": {"S": "a"}, ":v1": {"S": ""}});
		});

		it("Should send an empty map and binary filter value, which DynamoDB compares with", async () => {
			await Account.scan("address").eq({}).exec();
			await Account.scan("data").eq(Buffer.alloc(0)).exec();
			await Account.scan("address").eq({"city": "x"}).exec();
			expect(requests.map(({request}) => request.ExpressionAttributeValues)).toEqual([
				{":v0": {"M": {}}},
				{":v0": {"B": Buffer.alloc(0)}},
				{":v0": {"M": {"city": {"S": "x"}}}}
			]);
		});

		it("Should leave out an empty ExpressionAttributeValues", async () => {
			await Account.scan("note").exists().exec();
			expect(requests[0].request).toEqual({"TableName": "Account", "FilterExpression": "attribute_exists (#a0)", "ExpressionAttributeNames": {"#a0": "note"}});
		});

		it("Should send a null write condition", async () => {
			await Account.delete({"pk": "a", "sk": "b"}, {"condition": new dynamoose.Condition("note").eq(null)});
			expect(requests[0].request.ExpressionAttributeValues).toEqual({":v0": {"NULL": true}});
		});

		it("Should allow a null value for a table key attribute that isn't a key of the index the query uses", async () => {
			// Without `using()`, the equality on `pk` would pick the table index instead.
			await Account.query("gpk").eq("a").filter("pk").eq(null).using("gsi").exec();
			expect(requests[0].request).toEqual({
				"TableName": "Account",
				"IndexName": "gsi",
				"KeyConditionExpression": "#qha = :qhv",
				"FilterExpression": "#a1 = :v1",
				"ExpressionAttributeNames": {"#qha": "gpk", "#a1": "pk"},
				"ExpressionAttributeValues": {":qhv": {"S": "a"}, ":v1": {"NULL": true}}
			});
		});
	});

	describe("Query key conditions", () => {
		const values = [["null", null], ["empty", ""]];
		values.forEach(([problem, value]) => {
			describe(`A key condition value that is ${problem}`, () => {
				const cases = [
					["chained table hash key", () => Account.query("pk").eq(value), "pk"],
					["object table hash key", () => Account.query({"pk": value}), "pk"],
					["object table hash key with eq", () => Account.query({"pk": {"eq": value}}), "pk"],
					["table hash key by its alias", () => Account.query("email").eq(value), "pk"],
					["chained table range key", () => Account.query("pk").eq("a").where("sk").eq(value), "sk"],
					["object table range key", () => Account.query({"pk": "a", "sk": value}), "sk"],
					["table range key lt", () => Account.query("pk").eq("a").where("sk").lt(value), "sk"],
					["table range key le", () => Account.query("pk").eq("a").where("sk").le(value), "sk"],
					["table range key gt", () => Account.query("pk").eq("a").where("sk").gt(value), "sk"],
					["table range key ge", () => Account.query("pk").eq("a").where("sk").ge(value), "sk"],
					["table range key beginsWith", () => Account.query("pk").eq("a").where("sk").beginsWith(value), "sk", true],
					["object table range key beginsWith", () => Account.query({"pk": "a", "sk": {"beginsWith": value}}), "sk", true],
					["table range key between, first value", () => Account.query("pk").eq("a").where("sk").between(value, "z"), "sk"],
					["object table range key between, second value", () => Account.query({"pk": "a", "sk": {"between": ["a", value]}}), "sk"],
					["local index range key", () => Account.query("pk").eq("a").where("lsk").eq(value).using("lsi"), "lsk"],
					["global index hash key", () => Account.query("gpk").eq(value), "gpk"],
					["object global index hash key", () => Account.query({"gpk": value}), "gpk"],
					["global index hash key with using()", () => Account.query("gpk").eq(value).using("gsi"), "gpk"],
					["global index range key", () => Account.query("gpk").eq("a").where("gsk").eq(value), "gsk"],
					["object global index range key", () => Account.query({"gpk": "a", "gsk": value}), "gsk"]
				];
				cases.forEach(([name, query, attribute, isBeginsWith]) => {
					it(`Should throw before sending for the ${name}`, async () => {
						// A null `beginsWith` value fails on its type first, as it would in a filter.
						await expectRejectedBeforeSending(query().exec(), isBeginsWith && value === null ? beginsWithError(attribute, "NULL") : keyConditionError(attribute, problem));
					});
				});

				it("Should throw with a callback", async () => {
					const error = await new Promise((resolve) => Account.query("pk").eq(value).exec(resolve));
					expect(error).toEqual(keyConditionError("pk", problem));
					expect(requests).toEqual([]);
				});

				it("Should throw from getRequest", async () => {
					await expectRejectedBeforeSending(Account.query("pk").eq(value).getRequest(), keyConditionError("pk", problem));
				});

				it("Should throw for query.all and query.count", async () => {
					await expectRejectedBeforeSending(Account.query("pk").eq(value).all().exec(), keyConditionError("pk", problem));
					await expectRejectedBeforeSending(Account.query("pk").eq(value).count().exec(), keyConditionError("pk", problem));
				});
			});
		});

		it("Should throw for an empty binary key value", async () => {
			const Blob = dynamoose.model("Blob", {"id": {"type": Buffer, "hashKey": true}});
			new dynamoose.Table("Blob", [Blob]);
			await expectRejectedBeforeSending(Blob.query("id").eq(Buffer.alloc(0)).exec(), keyConditionError("id", "empty"));
		});

		const validQueries = [
			["a string hash and range key", () => Account.query("pk").eq("a").where("sk").between("a", "z"), {":qhv": {"S": "a"}, ":qrv_1": {"S": "a"}, ":qrv_2": {"S": "z"}}],
			["a whitespace key value", () => Account.query("pk").eq(" "), {":qhv": {"S": " "}}],
			["a number key value of 0", () => dynamoose.model("Counter", {"id": {"type": Number, "hashKey": true}}).query("id").eq(0), {":qhv": {"N": "0"}}],
			["a binary key value", () => dynamoose.model("Bytes", {"id": {"type": Buffer, "hashKey": true}}).query("id").eq(Buffer.from("a")), {":qhv": {"B": Buffer.from("a")}}]
		];
		validQueries.forEach(([name, query, expressionAttributeValues]) => {
			it(`Should send a query with ${name}`, async () => {
				const queryObject = query();
				if (name.includes("number") || name.includes("binary")) {
					const model = name.includes("number") ? "Counter" : "Bytes";
					new dynamoose.Table(model, [dynamoose.model(model)]);
				}
				await queryObject.exec();
				expect(requests.length).toEqual(1);
				expect(requests[0].request.ExpressionAttributeValues).toEqual(expressionAttributeValues);
			});
		});
	});

	describe("Keys of get, delete, update, batch and transaction requests", () => {
		const key = (pk, sk = "b") => ({"pk": pk, "sk": sk});
		const operations = [
			["Model.get", (k) => Account.get(k)],
			["Model.get with return request", (k) => Account.get(k, {"return": "request"})],
			["Model.delete", (k) => Account.delete(k)],
			["Model.update", (k) => Account.update(k, {"note": "x"})],
			["Model.update with the key and the update in one object", (k) => Account.update({...k, "note": "x"})],
			["Model.batchGet", (k) => Account.batchGet([key("ok"), k])],
			["Model.batchDelete", (k) => Account.batchDelete([key("ok"), k])],
			["Model.transaction.get", async (k) => dynamoose.transaction([Account.transaction.get(k)])],
			["Model.transaction.delete", async (k) => dynamoose.transaction([Account.transaction.delete(k)])],
			["Model.transaction.update", async (k) => dynamoose.transaction([Account.transaction.update(k, {"note": "x"})])],
			["Model.transaction.condition", async (k) => dynamoose.transaction([Account.transaction.condition(k, new dynamoose.Condition("note").exists())])]
		];
		const badKeys = [
			["an undefined hash key", key(undefined), "pk", "undefined"],
			["a null hash key", key(null), "pk", "null"],
			["an empty hash key", key(""), "pk", "empty"],
			["an undefined hash key by its alias", {"email": undefined, "sk": "b"}, "pk", "undefined"],
			["an empty hash key by its alias", {"email": "", "sk": "b"}, "pk", "empty"],
			["a key without the range key", {"pk": "a"}, "sk", "undefined"],
			["a null range key", key("a", null), "sk", "null"],
			["an empty range key", key("a", ""), "sk", "empty"]
		];
		operations.forEach(([operation, run]) => {
			describe(operation, () => {
				badKeys.forEach(([name, badKey, attribute, problem]) => {
					it(`Should throw before sending for ${name}`, async () => {
						await expectRejectedBeforeSending(run(badKey), keyError(attribute, problem));
					});
				});
			});
		});

		describe("A hash key passed as the key itself", () => {
			let User;
			beforeEach(() => {
				User = dynamoose.model("User", {"id": {"type": String, "hashKey": true}, "data": Buffer});
				new dynamoose.Table("User", [User]);
			});
			[["undefined", undefined, "undefined"], ["null", null, "null"], ["an empty string", "", "empty"]].forEach(([name, value, problem]) => {
				it(`Should throw before sending for ${name}, with Model.get, Model.delete and Model.batchGet`, async () => {
					await expectRejectedBeforeSending(User.get(value), keyError("id", problem));
					await expectRejectedBeforeSending(User.delete(value), keyError("id", problem));
					await expectRejectedBeforeSending(User.batchGet([value]), keyError("id", problem));
				});
			});

			it("Should throw with a callback", async () => {
				const error = await new Promise((resolve) => User.get(null, resolve));
				expect(error).toEqual(keyError("id", "null"));
				expect(requests).toEqual([]);
			});

			it("Should throw for an empty binary hash key", async () => {
				const Blob = dynamoose.model("Blob", {"id": {"type": Buffer, "hashKey": true}});
				new dynamoose.Table("Blob", [Blob]);
				await expectRejectedBeforeSending(Blob.get({"id": Buffer.alloc(0)}), keyError("id", "empty"));
			});

			it("Should send a key value that a schema set function fills in", async () => {
				const Filled = dynamoose.model("Filled", {"id": {"type": String, "hashKey": true, "set": (value) => value || "default"}});
				new dynamoose.Table("Filled", [Filled]);
				await Filled.get("");
				expect(requests[0].request.Key).toEqual({"id": {"S": "default"}});
			});
		});

		const goodKeys = [
			["a string key", key("a"), {"pk": {"S": "a"}, "sk": {"S": "b"}}],
			["a key by its alias", {"email": "a", "sk": "b"}, {"pk": {"S": "a"}, "sk": {"S": "b"}}],
			["a whitespace key", key(" ", " "), {"pk": {"S": " "}, "sk": {"S": " "}}]
		];
		goodKeys.forEach(([name, goodKey, dynamoKey]) => {
			it(`Should send Model.get, Model.delete and Model.update for ${name}`, async () => {
				await Account.get(goodKey);
				await Account.delete(goodKey);
				await Account.update(goodKey, {"note": "x"});
				expect(requests.map(({operation, request}) => [operation, request.Key])).toEqual([["getItem", dynamoKey], ["deleteItem", dynamoKey], ["updateItem", dynamoKey]]);
			});
		});

		it("Should send a number key of 0", async () => {
			const Counter = dynamoose.model("Counter", {"id": {"type": Number, "hashKey": true}, "sk": {"type": Number, "rangeKey": true}});
			new dynamoose.Table("Counter", [Counter]);
			await Counter.get({"id": 0, "sk": 0});
			await Counter.batchGet([{"id": 0, "sk": 0}]);
			expect(requests.map(({operation}) => operation)).toEqual(["getItem", "batchGetItem"]);
			expect(requests[0].request.Key).toEqual({"id": {"N": "0"}, "sk": {"N": "0"}});
		});

	});

	describe("Key attributes of written items", () => {
		const item = (attributes = {}) => ({"pk": "a", "sk": "b", ...attributes});
		const puts = [
			["Model.create", (i) => Account.create(i)],
			["item.save", (i) => new Account(i).save()],
			["item.save with return request", (i) => new Account(i).save({"return": "request"})],
			["Model.batchPut", (i) => Account.batchPut([item({"pk": "ok"}), i])],
			["Model.transaction.create", async (i) => dynamoose.transaction([Account.transaction.create(i)])]
		];
		const badItems = [
			["without the hash key", {"pk": undefined}, keyError("pk", "undefined")],
			["with an empty hash key", {"pk": ""}, keyError("pk", "empty")],
			["without the range key", {"sk": undefined}, keyError("sk", "undefined")],
			["with an empty range key", {"sk": ""}, keyError("sk", "empty")],
			["with an empty global index hash key", {"gpk": ""}, indexKeyError("gpk", "gsi", "empty")],
			["with an empty global index range key", {"gpk": "g", "gsk": ""}, indexKeyError("gsk", "gsi", "empty")],
			["with an empty local index range key", {"lsk": ""}, indexKeyError("lsk", "lsi", "empty")]
		];
		puts.forEach(([operation, put]) => {
			describe(operation, () => {
				badItems.forEach(([name, attributes, error]) => {
					it(`Should throw before sending for an item ${name}`, async () => {
						await expectRejectedBeforeSending(put(item(attributes)), error);
					});
				});

				it("Should accept an item without index key attributes, which leaves it out of the indexes", async () => {
					await expect(put(item({"note": ""}))).resolves.not.toThrow();
					expect(requests.length).toEqual(operation.includes("return request") ? 0 : 1);
				});
			});
		});

		describe("An index another model of the table declares", () => {
			let Other;
			beforeEach(() => {
				Account = dynamoose.model("Account", new dynamoose.Schema({"pk": {"type": String, "hashKey": true}, "sk": {"type": String, "rangeKey": true}, "gpk": String}));
				Other = dynamoose.model("Other", new dynamoose.Schema({"pk": {"type": String, "hashKey": true}, "sk": {"type": String, "rangeKey": true}, "gpk": {"type": String, "index": {"name": "gsi", "type": "global"}}}));
				new dynamoose.Table("Shared", [Account, Other]);
			});

			it("Should throw before sending for a put with an empty value", async () => {
				await expectRejectedBeforeSending(Account.create({"pk": "a", "sk": "b", "gpk": ""}), indexKeyError("gpk", "gsi", "empty"));
			});

			it("Should throw before sending for an update with an empty value", async () => {
				await expectRejectedBeforeSending(Account.update({"pk": "a", "sk": "b"}, {"gpk": ""}), indexKeyError("gpk", "gsi", "empty"));
			});
		});

		it("Should throw for item.save with return request and a callback", async () => {
			const error = await new Promise((resolve) => new Account(item({"gpk": ""})).save({"return": "request"}, resolve));
			expect(error).toEqual(indexKeyError("gpk", "gsi", "empty"));
		});

		it("Should throw for Model.batchPut with return request and a callback", async () => {
			const error = await new Promise((resolve) => Account.batchPut([item({"gpk": ""})], {"return": "request"}, resolve));
			expect(error).toEqual(indexKeyError("gpk", "gsi", "empty"));
		});

		it("Should throw for Model.update with return request and a callback", async () => {
			const error = await new Promise((resolve) => Account.update(item(), {"gpk": ""}, {"return": "request"}, resolve));
			expect(error).toEqual(indexKeyError("gpk", "gsi", "empty"));
		});

		it("Should throw before sending for an empty binary index key", async () => {
			const Blob = dynamoose.model("Blob", {"id": {"type": String, "hashKey": true}, "tag": {"type": Buffer, "index": {"name": "tagIndex", "type": "global"}}});
			new dynamoose.Table("Blob", [Blob]);
			await expectRejectedBeforeSending(Blob.create({"id": "a", "tag": Buffer.alloc(0)}), indexKeyError("tag", "tagIndex", "empty"));
		});

		it("Should keep throwing a TypeMismatch for a null key attribute", async () => {
			await expect(Account.create(item({"gpk": null}))).rejects.toThrow("Expected gpk to be of type string, instead found type null.");
			expect(requests).toEqual([]);
		});

		describe("Model.update", () => {
			const updates = [
				["sets a global index hash key to an empty string", {"gpk": ""}, indexKeyError("gpk", "gsi", "empty")],
				["sets a global index range key to an empty string", {"gsk": ""}, indexKeyError("gsk", "gsi", "empty")],
				["sets a local index range key to an empty string", {"lsk": ""}, indexKeyError("lsk", "lsi", "empty")],
				["sets a global index key to an empty string with $SET", {"$SET": {"gpk": ""}}, indexKeyError("gpk", "gsi", "empty")]
			];
			updates.forEach(([name, update, error]) => {
				it(`Should throw before sending for an update that ${name}`, async () => {
					await expectRejectedBeforeSending(Account.update(item(), update), error);
				});
				it(`Should throw before sending for a transaction update that ${name}`, async () => {
					await expectRejectedBeforeSending(dynamoose.transaction([Account.transaction.update(item(), update)]), error);
				});
			});

			it("Should send an update that sets a non-key attribute to an empty string", async () => {
				await Account.update(item(), {"note": ""});
				expect(requests[0].request.ExpressionAttributeValues).toEqual({":v0": {"S": ""}});
			});

			it("Should send an update that removes an index key attribute", async () => {
				await Account.update(item(), {"gpk": undefined});
				await Account.update(item(), {"$REMOVE": ["gsk"]});
				expect(requests.map(({request}) => request.UpdateExpression)).toEqual(["REMOVE #a0", "REMOVE #a0"]);
			});

		});
	});

	it("Should describe each problem with utils.dynamoose.emptyKeyValueProblem", () => {
		expect([undefined, null, {"NULL": true}, {"S": ""}, {"B": new Uint8Array(0)}, {"S": "a"}, {"N": "0"}, {"B": new Uint8Array(1)}, {"BOOL": false}].map(utils.dynamoose.emptyKeyValueProblem)).toEqual([
			"has no value (it is undefined)",
			"has no value (it is undefined)",
			"has no value (it is null)",
			"has an empty value",
			"has an empty value",
			undefined,
			undefined,
			undefined,
			undefined
		]);
	});
});
