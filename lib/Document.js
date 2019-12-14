const aws = require("./aws");

// Document represents an item in a Model that is either pending (not saved) or saved
function Document(object) {
	Object.keys(object).forEach((key) => this[key] = object[key]);
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

module.exports = Document;
