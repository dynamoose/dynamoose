// const aws = require("./aws");

// Document represents an item in a Model that is either pending (not saved) or saved
function Document(object) {
	Object.keys(object).forEach((key) => this[key] = object[key]);
}

// Document.prototype.objectFromSchema = function() {
//
// };
// Document.prototype.toDynamo = function() {
//
// };
// Document.prototype.fromDynamo = function() {
//
// };

module.exports = Document;
