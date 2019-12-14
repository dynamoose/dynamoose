const aws = require("./aws");

// DocumentCarrier represents an internal concept in Dynamoose used to expose the model to documents that are created.
// Without this things like `Document.save` wouldn't be able to access things like the TableName needed to save documents.
// DocumentCarrier is not a concept that needs to be exposed to users of this library.
function DocumentCarrier(model) {

	// Document represents an item in a Model that is either pending (not saved) or saved
	class Document {
		constructor(object) {
			Object.keys(object).forEach((key) => this[key] = object[key]);
		}
	}

	// Document.prototype.objectFromSchema = function() {
	//
	// };
	Document.prototype.toDynamo = function() {
		return aws.converter().marshall(this);
	};
	// Document.prototype.fromDynamo = function() {
	//
	// };
	Document.prototype.save = function(callback) {
		const promise = aws.ddb().putItem({
			"Item": this.toDynamo(),
			"TableName": Document.Model.name
		}).promise();

		if (callback) {
			promise.then(() => callback(null, this)).catch((error) => callback(error));
		} else {
			return (async () => {
				await promise;
				return this;
			})();
		}
	};

	Document.Model = model;
	return Document;
}

module.exports = DocumentCarrier;
