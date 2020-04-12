const chaiAsPromised = require("chai-as-promised");
const chai = require("chai");
chai.use(chaiAsPromised);
const {expect} = chai;
const dynamoose = require("../lib");
const {Model} = dynamoose;
const Serializer = require("../lib/Serializer");

describe("Serializer", () => {
	let User;
	beforeEach(() => {
		User = new Model("User",
			{id: Number, name: String, email: String, phone: String, passwordHash: String, status: String},
			{"create": false, "waitForActive": false}
		);
	});
	afterEach(() => {
		User = null;
	});

	it("Should verify Model and Document have a serializer instance and expected methods bound", () => {
		const doc = new User({"id": 1, name: "User"});
		expect(User.serializer).to.be.an.instanceof(Serializer);
		expect(doc.serialize).to.be.a("function");
		expect(User.serializeMany).to.be.a("function");
	});

	it("Should add some serializers to the Models serializer instance", () => {
		addSerializers();
		expect(User.serializer._serializers).to.have.property("contactInfoOnly").to.be.an("array");
		expect(User.serializer._serializers).to.have.property("hideSecure").to.be.an("object");
		expect(User.serializer._serializers).to.have.property("isActiveNoStatus").to.be.an("object");
		expect(User.serializer._serializers).to.have.property("isActive").to.be.an("object");
		expect(User.serializer._defaultSerializer).eql("contactInfoOnly");
	});

	it("Should remove an existing serializer from the instance and change _defaultSerializer accordingly", () => {
		addSerializers();
		User.serializer.remove("hideSecure");
		expect(User.serializer._serializers).to.have.property("contactInfoOnly").to.be.an("array");
		expect(User.serializer._serializers).to.have.property("isActiveNoStatus").to.be.an("object");
		expect(User.serializer._serializers).to.have.property("isActive").to.be.an("object");
		expect(User.serializer._serializers).to.not.have.property("hideSecure");
		expect(User.serializer._defaultSerializer).eql("contactInfoOnly");

		User.serializer.remove("contactInfoOnly");
		expect(User.serializer._serializers).to.not.have.property("contactInfoOnly");
		expect(User.serializer._defaultSerializer).eql(null);

		User.serializer.remove("nonExistent");
	});

	it("Should run the document through a serializer configured with an array (include)", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("contactInfoOnly");
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.not.have.property("id");
		expect(result).to.not.have.property("passwordHash");
		expect(result).to.not.have.property("status");
	});

	it("Should run the document through a serializer configured with exclude properties", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("hideSecure");
		expect(result).to.have.property("id");
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.have.property("status");
		expect(result).to.not.have.property("passwordHash");
	});

	it("Should run the document through a serializer configured with a modify function", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("isActiveNoStatus");
		expect(result).to.have.property("id");
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.not.have.property("status");
		expect(result).to.have.property("isActive").eql(false);
	});

	it("Should run the document through the default serializer", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize();
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.not.have.property("id");
		expect(result).to.not.have.property("passwordHash");
		expect(result).to.not.have.property("status");
	});

	it("Should run a serializer with both include and exclude statements", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("redundant");
		expect(result).to.have.property("email");
		expect(result).to.not.have.property("id");
		expect(result).to.not.have.property("name");
		expect(result).to.not.have.property("passwordHash");
		expect(result).to.not.have.property("status");
		expect(result).to.not.have.property("phone");
	});

	it("Should serialize many documents at once", () => {
		addSerializers();
		const docs = createDocuments();
		const results = User.serializeMany(docs, "hideSecure");
		const noDocsResults = User.serializeMany();
		expect(results).to.be.an("array").length(2);
		expect(results[0]).to.have.property("id");
		expect(results[0]).to.have.property("name");
		expect(results[0]).to.have.property("email");
		expect(results[0]).to.have.property("phone");
		expect(results[0]).to.have.property("status");
		expect(results[0]).to.not.have.property("passwordHash");

		expect(results[1]).to.have.property("id");
		expect(results[1]).to.have.property("name");
		expect(results[1]).to.have.property("email");
		expect(results[1]).to.have.property("phone");
		expect(results[1]).to.have.property("status");
		expect(results[1]).to.not.have.property("passwordHash");

		expect(noDocsResults).to.be.an("array").length(0);
	});

	it("Should accept an options object instead of a name", () => {
		addSerializers();
		const docs = createDocuments();
		const resultOne = docs[0].serialize(["phone", "status"]);
		const resultTwo = docs[1].serialize({include: ["id", "name"]});
		const resultThree = docs[1].serialize(7);
		expect(resultOne).to.have.property("phone");
		expect(resultOne).to.have.property("status");
		expect(resultOne).to.not.have.property("id");
		expect(resultOne).to.not.have.property("name");
		expect(resultOne).to.not.have.property("email");
		expect(resultOne).to.not.have.property("passwordHash");

		expect(resultTwo).to.have.property("id");
		expect(resultTwo).to.have.property("name");
		expect(resultTwo).to.not.have.property("email");
		expect(resultTwo).to.not.have.property("phone");
		expect(resultTwo).to.not.have.property("passwordHash");
		expect(resultTwo).to.not.have.property("status");

		expect(Object.keys(resultThree)).to.be.an("array").length(0);
	});

	it("Should add all document fields to the output prior to running modify without include or exclude statements", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("isActive");
		expect(result).to.have.property("id");
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.have.property("passwordHash");
		expect(result).to.have.property("status");
		expect(result).to.have.property("isActive");
	});

	it("Should add all document fields to the output prior to running both include and exclude statements", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("hideSecure");
		expect(result).to.have.property("id");
		expect(result).to.have.property("name");
		expect(result).to.have.property("email");
		expect(result).to.have.property("phone");
		expect(result).to.have.property("status");
		expect(result).to.not.have.property("passwordHash");
	});

	it("Should fail while serializing a document and return a blank object", () => {
		addSerializers();
		const docs = createDocuments();
		const result = docs[0].serialize("nonExistingSerializer");
		expect(Object.keys(result)).to.be.an("array").length(0);
	});

	it("Should throw errors on invalid usage", () => {
		expect(() => {
			User.serializer.add({invalidUsage: "Should fail"}, ["name", "email"]);
		}).to.throw("Field name is required and should be of type string");

		expect(() => {
			User.serializer.add("broken", "invalidOptionsUsage");
		}).to.throw("Field options is required and should be an object or array");

		expect(() => {
			User.serializeMany({notAnArray: "ofDocuments"});
		}).to.throw("documentsArray must be an array of document objects");
	});

	const addSerializers = () => {
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
	};

	const createDocuments = () => {
		const docs = [];

		docs[0] = new User({
			id: 1,
			name: "User One",
			email: "userone@example.com",
			phone: "0123456789",
			passwordHash: "5dxFDpyKeEKiVUSp9I6dQ1DGd3CFH5Jk",
			status: "not_active"
		});

		docs[1] = new User({
			id: 2,
			name: "User Two",
			email: "usertwo@example.com",
			phone: "0123456789",
			passwordHash: "KnbuZWU0RNPPXhgPNMxovLtUiuMN4I6i",
			status: "active"
		});

		return docs;
	};
});