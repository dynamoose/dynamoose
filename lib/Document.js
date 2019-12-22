const aws = require("./aws");
const utils = require("./utils");
const Error = require("./Error");

// DocumentCarrier represents an internal concept in Dynamoose used to expose the model to documents that are created.
// Without this things like `Document.save` wouldn't be able to access things like the TableName needed to save documents.
// DocumentCarrier is not a concept that needs to be exposed to users of this library.
function DocumentCarrier(model) {

	// Document represents an item in a Model that is either pending (not saved) or saved
	class Document {
		constructor(object) {
			const documentObject = Document.isDynamoObject(object) ? aws.converter().unmarshall({...object}) : object;
			Object.keys(documentObject).forEach((key) => this[key] = documentObject[key]);
		}
	}

	// This function will return null if it's unknown if it is a Dynamo object (ex. empty object). It will return true if it is a Dynamo object and false if it's not.
	Document.isDynamoObject = (object, recurrsive = false) => {
		const keys = Object.keys(object);
		const values = Object.values(object);
		if (keys.length === 0) {
			return null;
		} else {
			function isValid(value) {
				const keys = Object.keys(value);
				const key = keys[0];
				const nestedResult = (typeof value[key] === "object" ? (Array.isArray(value[key]) ? value[key].every((value) => Document.isDynamoObject(value, true)) : Document.isDynamoObject(value[key])) : true);
				return typeof value === "object" && keys.length === 1 && utils.dynamodb.attribute_types.includes(key) && nestedResult;
			}
			return recurrsive ? isValid(object) : values.every((value) => isValid(value));
		}
	};
	Document.toDynamo = (object) => aws.converter().marshall(object);
	Document.fromDynamo = (object) => aws.converter().unmarshall(object);
	// This function will return an object that conforms to the schema (removing any properties that don't exist) & thorws an error if there is a typemismatch.
	Document.objectFromSchema = function(object) {
		return Object.keys(object).reduce((finalObject, key) => {
			const existsInSchema = Boolean(model.schema.schemaObject[key]);
			const typeMatches = existsInSchema ? typeof object[key] === utils.attribute_types.find((type) => type.dynamodbType === model.schema.getAttributeType(key)).javascriptType : null;
			if (existsInSchema && typeMatches) {
				finalObject[key] = object[key];
			} else if (existsInSchema && !typeMatches) {
				throw new Error.TypeMismatch(`Expected ${key} to be of type ${utils.attribute_types.find((type) => type.dynamodbType === model.schema.getAttributeType(key)).javascriptType}, instead found type ${typeof object[key]}.`);
			}

			return finalObject;
		}, {});
	};
	Document.prototype.toDynamo = function() {
		const object = Document.objectFromSchema(this);
		return Document.toDynamo(object);
	};
	Document.prototype.save = function(callback) {
		const promise = Document.Model.pendingTaskPromise().then(() => aws.ddb().putItem({
			"Item": this.toDynamo(),
			"TableName": Document.Model.name
		}).promise());

		if (callback) {
			promise.then(() => callback(null, this)).catch((error) => callback(error));
		} else {
			return (async () => {
				await promise;
				return this;
			})();
		}
	};
	// This function will modify the document to conform to the Schema
	Document.prototype.conformToSchema = function() {
		const expectedObject = Document.objectFromSchema(this);
		const expectedKeys = Object.keys(expectedObject);
		Object.keys(this).forEach((key) => {
			if (!expectedKeys.includes(key)) {
				delete this[key];
			}
		});
	};

	Document.Model = model;

	// TODO: figure out if there is a better way to do this below.
	// This is needed since when creating a Model we return a Document. But we want to be able to call Model.get and other functions on the model itself. This feels like a really messy solution, but it the only way I can think of how to do it for now.
	// Without this things like Model.get wouldn't work. You would have to do Model.Model.get instead which would be referencing the `Document.Model = model` line above.
	Object.keys(Object.getPrototypeOf(Document.Model)).forEach((key) => {
		Document[key] = Document.Model[key].bind(Document.Model);
	});

	return Document;
}

module.exports = DocumentCarrier;
