const {expect} = require("chai");
const dynamoose = require("../lib");
const Error = require("../lib/Error");

describe("Model", () => {
	it("Should have a model proprety on the dynamoose object", () => {
		expect(dynamoose.model).to.exist;
	});

	it("Should resolve to correct file for dynamoose object", () => {
		expect(dynamoose.model).to.eql(require("../lib/Model"));
	});

	it("Should be a function", () => {
		expect(dynamoose.model).to.be.a("function");
	});

	describe("Initalization", () => {
		const options = [
			// TODO: Mongoose supports using the `new` keyword when creating a model with no error
			{"name": "Using new keyword", "func": (...args) => new dynamoose.model(...args)},
			{"name": "Without new keyword", "func": (...args) => dynamoose.model(...args)}
		];

		options.forEach((option) => {
			describe(option.name, () => {
				it("Should throw an error if no schema is passed in", () => {
					expect(() => option.func("Cat")).to.throw(Error.MissingSchemaError);
				});

				it("Should throw same error as no schema if nothing passed in", () => {
					expect(() => option.func()).to.throw(Error.MissingSchemaError);
				});

				it("Should create a schema if not passing in schema instance", () => {
					const schema = {"name": String};
					const Cat = option.func("Cat", schema);
					expect(Cat.Model.schema).to.not.eql(schema);
					expect(Cat.Model.schema instanceof dynamoose.Schema).to.be.true;
				});

				it("Should use schema instance if passed in", () => {
					const schema = new dynamoose.Schema({"name": String});
					const Cat = option.func("Cat", schema);
					expect(Cat.Model.schema).to.eql(schema);
					expect(Cat.Model.schema instanceof dynamoose.Schema).to.be.true;
				});
			});
		});
	});
});

describe("model", () => {
	let Cat;
	beforeEach(() => {
		const schema = new dynamoose.Schema({"name": String});
		Cat = dynamoose.model("Cat", schema);
	});

	it("Should allow creating instance of Model", () => {
		expect(() => new Cat({"name": "Bob"})).to.not.throw();
	});
});
