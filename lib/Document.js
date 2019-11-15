// Document represents an item in a Model that is either pending (not saved) or saved
function Document(object) {
	Object.keys(object).forEach((key) => this[key] = object[key]);
}

module.exports = Document;
