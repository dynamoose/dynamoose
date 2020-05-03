const chai = require("chai");
const {expect} = chai;
const Populate = require("../dist/Populate");
const dynamoose = require("../dist");
const aws = require("../dist/aws");
const util = require("util");
const utils = require("../dist/utils");

describe("Populate", () => {
	it("Should be an object", () => {
		expect(Populate).to.be.an("object");
	});

	let User;
	beforeEach(() => {
		User = dynamoose.model("User", {"id": Number, "name": String, "parent": dynamoose.THIS}, {"create": false, "waitForActive": false});
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
					"name": "PopulateDocument",
					"func": Populate.PopulateDocument,
					"tests": [
						{"input": {"id": 2, "name": "Tim"}, "output": {"id": 2, "name": "Tim"}, "documents": [{"id": 1, "name": "Bob"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob"}}, "documents": [{"id": 1, "name": "Bob"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": {"id": 3, "name": "Evan"}}}, "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}]},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}, "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": "*"}},
						{"input": {"id": 2, "name": "Tim", "parent": 1}, "output": {"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}, "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": ["*"]}}
					]
				},
				{
					"name": "PopulateDocuments",
					"func": Populate.PopulateDocuments,
					"tests": [
						{"input": [{"id": 2, "name": "Tim"}], "output": [{"id": 2, "name": "Tim"}], "documents": [{"id": 1, "name": "Bob"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob"}}], "documents": [{"id": 1, "name": "Bob"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": {"id": 3, "name": "Evan"}}}], "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}]},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}], "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": "*"}},
						{"input": [{"id": 2, "name": "Tim", "parent": 1}], "output": [{"id": 2, "name": "Tim", "parent": {"id": 1, "name": "Bob", "parent": 3}}], "documents": [{"id": 1, "name": "Bob", "parent": 3}, {"id": 3, "name": "Evan"}], "settings": {"properties": ["*"]}}
					]
				}
			];
			populateTypes.forEach((populateType) => {
				describe(populateType.name, () => {
					let promiseFunction;
					beforeEach(() => {
						dynamoose.aws.ddb.set({
							"getItem": (param) => {
								return {"promise": () => promiseFunction(param)};
							}
						});
					});
					afterEach(() => {
						promiseFunction = null;
						dynamoose.aws.ddb.revert();
					});

					it("Should be a function", () => {
						expect(populateType.func).to.be.a("function");
					});

					populateType.tests.forEach((test) => {
						it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, async () => {
							promiseFunction = (param) => ({"Item": aws.converter().marshall(test.documents.find((doc) => doc.id === parseInt(param.Key.id.N)))});

							const input = Array.isArray(test.input) ? Object.assign(test.input.map((item) => new User(item)), {"populate": Populate.PopulateDocuments, "toJSON": utils.dynamoose.documentToJSON}) : new User(test.input);
							const res = await responseType.func(input).bind(input)(test.settings || {});
							expect(res.toJSON()).to.eql(test.output);
						});
					});

					it("Should throw error if error from AWS", () => {
						promiseFunction = () => {throw "ERROR";};

						const obj = new User({"id": 2, "name": "Tim", "parent": 1});
						const input = populateType.name === "PopulateDocuments" ? Object.assign([obj], {"populate": Populate.PopulateDocuments}) : obj;
						const res = responseType.func(input).bind(input)();
						return expect(res).to.be.rejectedWith("ERROR");
					});
				});
			});
		});
	});
});
