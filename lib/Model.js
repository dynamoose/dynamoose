const Error = require("./Error");
const Schema = require("./Schema");

// Model represents 1 DynamoDB table
class Model {
	constructor(name, schema) {
		this.name = name;

		if (!schema) {
			throw new Error.MissingSchemaError(`Schema hasn't been registered for model "${name}".\nUse dynamoose.model(name, schema)`)
		} else if (!(schema instanceof Schema)) {
			schema = new Schema(schema);
		}
		this.schema = schema;
	}
}

module.exports = (...args) => new Model(...args);
