const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const {expect} = chai;
const dynamoose = require("../dist");
const {model} = dynamoose;
const {Serializer} = require("../dist/Serializer");
const utils = require("../dist/utils");

describe("Serializer", () => {
	let User;
	beforeEach(() => {
		User = model("User", {"id": Number, "name": String, "email": String, "phone": String, "passwordHash": String, "status": String}, {"create": false, "waitForActive": false});
	});
	afterEach(() => {
		User = null;
	});

	beforeEach(() => {
		User.serializer.add("contactInfoOnly", ["name", "email", "phone"]);
		User.serializer.add("hideSecure", {exclude: ["passwordHash"]});
		User.serializer.add("redundant", {include: ["email", "phone", "doesntExist"], exclude: ["phone", "doesntExist"]});
		User.serializer.add("isActiveNoStatus", {
			exclude: ["status"],
			modify: (serialized, original) => {
				serialized.isActive = original.status === "active";
				return serialized;
			}
		});
		User.serializer.add("isActive", {
			modify: (serialized, original) => {
				serialized.isActive = original.status === "active";
				return serialized;
			}
		});
	});
	let docs = [];
	beforeEach(() => {
		docs = [
			{
				id: 1,
				name: "User One",
				email: "userone@example.com",
				phone: "0123456789",
				passwordHash: "5dxFDpyKeEKiVUSp9I6dQ1DGd3CFH5Jk",
				status: "not_active"
			},
			{
				id: 2,
				name: "User Two",
				email: "usertwo@example.com",
				phone: "0123456789",
				passwordHash: "KnbuZWU0RNPPXhgPNMxovLtUiuMN4I6i",
				status: "active"
			}
		].map((a) => new User(a));
	});
	afterEach(() => {
		docs = [];
	});

	it("Should verify Model and Document have a serializer instance and expected methods bound", () => {
		expect(User.serializer).to.be.an.instanceof(Serializer);
		expect(User.serializeMany).to.be.a("function");
		expect(new User({"id": 1, name: "User"}).serialize).to.be.a("function");
	});

	it("Should add some serializers to the Models serializer instance", () => {
		expect(User.serializer.serializers).to.have.property("contactInfoOnly").to.be.an("array");
		expect(User.serializer.serializers).to.have.property("hideSecure").to.be.an("object");
		expect(User.serializer.serializers).to.have.property("isActiveNoStatus").to.be.an("object");
		expect(User.serializer.serializers).to.have.property("isActive").to.be.an("object");
		expect(User.serializer.defaultSerializer).eql("_default");
	});

	it("Should remove an existing serializer from the instance and change _defaultSerializer accordingly", () => {
		User.serializer.remove("hideSecure");
		expect(User.serializer.serializers).to.have.property("contactInfoOnly").to.be.an("array");
		expect(User.serializer.serializers).to.have.property("isActiveNoStatus").to.be.an("object");
		expect(User.serializer.serializers).to.have.property("isActive").to.be.an("object");
		expect(User.serializer.serializers).to.not.have.property("hideSecure");
		expect(User.serializer.defaultSerializer).eql("_default");

		User.serializer.setDefault("contactInfoOnly");
		User.serializer.setDefault("doesntExist");
		expect(User.serializer.defaultSerializer).eql("contactInfoOnly");

		User.serializer.remove("contactInfoOnly");
		expect(User.serializer.serializers).to.not.have.property("contactInfoOnly");
		expect(User.serializer.defaultSerializer).eql("_default");

		User.serializer.remove("nonExistent");
	});

	it("Should run the document through a serializer configured with an array (include)", () => {
		const result = docs[0].serialize("contactInfoOnly");
		expect(result).to.eql(utils.object.pick(docs[0], ["name", "email", "phone"]));
	});

	it("Should run the document through a serializer configured with exclude properties", () => {
		const result = docs[0].serialize("hideSecure");
		expect(result).to.eql(utils.object.pick(docs[0], ["id", "name", "email", "phone", "status"]));
	});

	it("Should run the document through a serializer configured with a modify function", () => {
		const result = docs[0].serialize("isActiveNoStatus");
		expect(result).to.eql({...utils.object.pick(docs[0], ["id", "name", "email", "phone", "passwordHash"]), "isActive": false});
	});

	it("Should run the document through the default serializer", () => {
		const result = docs[0].serialize();
		expect(result).to.eql(utils.object.pick(docs[0], ["id", "name", "email", "phone", "passwordHash", "status"]));
	});

	it("Should run a serializer with both include and exclude statements", () => {
		const result = docs[0].serialize("redundant");
		expect(result).to.eql(utils.object.pick(docs[0], ["email"]));
	});

	it("Should serialize many documents at once", () => {
		expect(User.serializeMany(docs, "hideSecure")).to.eql(docs.map((obj) => utils.object.pick(obj, ["id", "name", "email", "phone", "status"])));
	});

	it("Should return empty array if nothing passed into Model.serializeMany", () => {
		expect(User.serializeMany()).to.eql([]);
	});

	it("Should accept an options object instead of a name", () => {
		expect(docs[0].serialize(["phone", "status"])).to.eql(utils.object.pick(docs[0], ["phone", "status"]));
		expect(docs[1].serialize({"include": ["id", "name"]})).to.eql(utils.object.pick(docs[1], ["id", "name"]));
	});

	it("Should add all document fields to the output prior to running modify without include or exclude statements", () => {
		expect(docs[0].serialize("isActive")).to.eql({...utils.object.pick(docs[0], ["id", "name", "email", "phone", "passwordHash", "status"]), "isActive": false});
	});

	it("Should add all document fields to the output prior to running both include and exclude statements", () => {
		expect(docs[0].serialize("hideSecure")).to.eql(utils.object.pick(docs[0], ["id", "name", "email", "phone", "status"]));
	});

	it("Should throw error when trying to serialize using non existant serializer", () => {
		expect(() => docs[0].serialize("nonExistingSerializer")).throw("Field options is required and should be an object or array");
	});

	it("Should throw errors on invalid usage", () => {
		expect(() => User.serializer.add({invalidUsage: "Should fail"}, ["name", "email"])).to.throw("Field name is required and should be of type string");
		expect(() => User.serializer.add("broken", "invalidOptionsUsage")).to.throw("Field options is required and should be an object or array");
		expect(() => User.serializeMany({notAnArray: "ofDocuments"})).to.throw("documentsArray must be an array of document objects");
	});
});
