const Populate = require("../dist/Populate");
const dynamoose = require("../dist");
const awsPkg = require("../dist/aws").AWS;
const aws = new awsPkg();
const util = require("util");
const utils = require("../dist/utils").default;

describe("Populate", () => {
	it("Should be an object", () => {
		expect(typeof Populate).toEqual("object");
	});

	let User;
	beforeEach(() => {
		User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.type.THIS});
		new dynamoose.Table("User", [User], {"create": false, "waitForActive": false});
	});
	afterEach(() => {
		User = null;
	});
	const responseTypes = [
		{"name": "Promise", "func": (input) => input.populate},
		{"name": "Callback", "func": (input) => util.promisify(input.populate)}
	];
	responseTypes.forEach((responseType) => {
		describe(responseType.name, () => {
			const populateTypes = [
				{
					"name": "PopulateItem",
					"func": Populate.PopulateItem,
					"tests": [
						{"input": {"id": 2, "name": "Tim"}, "output": {"id": 2, "name": "Tim"}, "items": [{"id": 1, "name": "Bob"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob"}}, "items": [{"id": 1, "name": "Bob"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": {"id": 3, "name": "Evan"}}}, "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}, "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": "*"}},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}, "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": ["*"]}},
						{"schema": {"id": Number, "name": String, "parent": [dynamoose.type.THIS, String]}, "input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}, "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": ["*"]}}
					]
				},
				{
					"name": "PopulateItems",
					"func": Populate.PopulateItems,
					"tests": [
						{"input": [{"id": 2, "name": "Tim"}], "output": [{"id": 2, "name": "Tim"}], "items": [{"id": 1, "name": "Bob"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob"}}], "items": [{"id": 1, "name": "Bob"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": {"id": 3, "name": "Evan"}}}], "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}], "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": "*"}},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}], "items": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": ["*"]}}
					]
				}
			];
			populateTypes.forEach((populateType) => {
				describe(populateType.name, () => {
					let promiseFunction;
					beforeEach(() => {
						dynamoose.aws.ddb.set({
							"getItem": (param) => {
								return promiseFunction(param);
							}
						});
					});
					afterEach(() => {
						promiseFunction = null;
						dynamoose.aws.ddb.revert();
					});

					it("Should be a function", () => {
						expect(populateType.func).toBeInstanceOf(Function);
					});

					populateType.tests.forEach((test) => {
						it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, async () => {
							if (test.schema) {
								User = dynamoose.model("User", test.schema);
								new dynamoose.Table("User", [User], {"create": false, "waitForActive": false});
							}

							promiseFunction = (param) => ({"Item": aws.converter().marshall(test.items.find((doc) => doc.id === parseInt(param.Key.id.N)))});

							const input = Array.isArray(test.input) ? Object.assign(test.input.map((item) => new User(item)), {"populate": Populate.PopulateItems, "toJSON": utils.dynamoose.itemToJSON}) : new User(test.input);
							const res = await responseType.func(input).bind(input)(test.settings || {});
							expect(res.toJSON()).toEqual(test.output);
						});
					});

					it("Should throw error if error from AWS", () => {
						promiseFunction = () => {
							throw "ERROR";
						};

						const obj = new User({"id": 2, "name": "Tim", "parent": 1});
						const input = populateType.name === "PopulateItems" ? Object.assign([obj], {"populate": Populate.PopulateItems}) : obj;
						const res = responseType.func(input).bind(input)();
						return expect(res).rejects.toEqual("ERROR");
					});
				});
			});
		});
	});

	describe("Model references", () => {
		let Person, requests;
		const people = {"1": {"id": {"N": "1"}, "name": {"S": "Tim"}}, "2": {"id": {"N": "2"}, "name": {"S": "Bob"}}};
		beforeEach(() => {
			requests = [];
			Person = dynamoose.model("Person", {"id": Number, "name": String});
			new dynamoose.Table("Person", [Person], {"create": false, "waitForActive": false});
			dynamoose.aws.ddb.set({
				"getItem": async (request) => {
					requests.push(request.Key.id.N);
					return {"Item": people[request.Key.id.N]};
				}
			});
		});
		afterEach(() => {
			dynamoose.aws.ddb.revert();
		});
		const gameWith = (definition) => {
			const Game = dynamoose.model("Game", {"id": Number, "players": definition});
			new dynamoose.Table("Game", [Game], {"create": false, "waitForActive": false});
			return Game;
		};

		responseTypes.forEach((responseType) => {
			describe(responseType.name, () => {
				it("Should populate a Set of models in an attribute with several types", async () => {
					const Game = gameWith({"type": [Set, String], "schema": [[Person]]});
					const game = new Game({"id": 9, "players": new Set([1, 2])});
					const result = await responseType.func(game).bind(game)();
					expect(result.toJSON()).toEqual({"id": 9, "players": [{"id": 1, "name": "Tim"}, {"id": 2, "name": "Bob"}]});
				});

				it("Should populate it in each item of a scan result", async () => {
					const Game = gameWith({"type": [Set, String], "schema": [[Person]]});
					dynamoose.aws.ddb.set({
						"getItem": async (request) => ({"Item": people[request.Key.id.N]}),
						"scan": async () => ({"Items": [{"id": {"N": "9"}, "players": {"NS": ["1", "2"]}}, {"id": {"N": "8"}, "players": {"S": "none"}}]})
					});
					const games = await Game.scan().exec();
					const result = await responseType.func(games).bind(games)();
					expect(result.toJSON()).toEqual([
						{"id": 9, "players": [{"id": 1, "name": "Tim"}, {"id": 2, "name": "Bob"}]},
						{"id": 8, "players": "none"}
					]);
				});

				describe("Guards", () => {
					it("Should still populate a Set in an attribute with a model and other types", async () => {
						const Game = gameWith([Person, String]);
						const game = new Game({"id": 9, "players": new Set([1, 2])});
						const result = await responseType.func(game).bind(game)();
						expect(result.toJSON()).toEqual({"id": 9, "players": [{"id": 1, "name": "Tim"}, {"id": 2, "name": "Bob"}]});
					});

					it("Should leave a value that isn't a Set in an attribute with a Set of models and other types", async () => {
						const Game = gameWith({"type": [Set, Number], "schema": [[Person]]});
						const game = new Game({"id": 9, "players": 1});
						const result = await responseType.func(game).bind(game)();
						expect(result.toJSON()).toEqual({"id": 9, "players": 1});
						expect(requests).toEqual([]);
					});

					it("Should only populate the properties the properties setting names", async () => {
						const Game = gameWith({"type": [Set, String], "schema": [[Person]]});
						const game = new Game({"id": 9, "players": new Set([1, 2])});
						const result = await responseType.func(game).bind(game)({"properties": ["other"]});
						expect([...result.players]).toEqual([1, 2]);
						expect(requests).toEqual([]);
					});

					it("Should not get a reference that is already populated", async () => {
						const Game = gameWith(Person);
						const game = new Game({"id": 9, "players": new Person({"id": 1, "name": "Tim"})});
						const result = await responseType.func(game).bind(game)();
						expect(result.toJSON()).toEqual({"id": 9, "players": {"id": 1, "name": "Tim"}});
						expect(requests).toEqual([]);
					});
				});

				describe("A referenced item that doesn't exist", () => {
					// Its key is kept, so saving the populated item keeps the reference instead of removing it.
					it("Should keep a single reference as its key", async () => {
						const Game = gameWith(Person);
						const game = new Game({"id": 9, "players": 5});
						const result = await responseType.func(game).bind(game)();
						expect(result.players).toEqual(5);
						expect(result.toJSON()).toEqual({"id": 9, "players": 5});
					});

					it("Should keep a single reference when the item is saved after populate", async () => {
						const Game = gameWith(Person);
						const game = new Game({"id": 9, "players": 5});
						await responseType.func(game).bind(game)();
						const request = await game.save({"return": "request"});
						expect(request.Item).toEqual({"id": {"N": "9"}, "players": {"N": "5"}});
					});

					[
						["a Set of models", () => ({"type": Set, "schema": [Person]})],
						["a Set of models in an attribute with several types", () => ({"type": [Set, String], "schema": [[Person]]})],
						["a model or a Set of models", () => ({"type": [Person, Set], "schema": [null, [Person]]})]
					].forEach(([name, definition]) => {
						it(`Should keep its key in its place in ${name}`, async () => {
							const Game = gameWith(definition());
							const game = new Game({"id": 9, "players": new Set([1, 5, 2])});
							const result = await responseType.func(game).bind(game)();
							expect(result.toJSON()).toEqual({"id": 9, "players": [{"id": 1, "name": "Tim"}, 5, {"id": 2, "name": "Bob"}]});
						});

						it(`Should keep every reference of ${name} when the item is saved after populate`, async () => {
							const Game = gameWith(definition());
							const game = new Game({"id": 9, "players": new Set([1, 5, 2])});
							await responseType.func(game).bind(game)();
							const request = await game.save({"return": "request"});
							expect(request.Item).toEqual({"id": {"N": "9"}, "players": {"NS": ["1", "5", "2"]}});
						});
					});
				});
			});
		});
	});
});
