// Runs against DynamoDB Local (DYNAMODB_ENDPOINT, default http://localhost:8000). Unlike the unit
// suite, it has no HTTP block: the point is to see what DynamoDB actually accepts and stores.
module.exports = {
	"testMatch": ["**/integration/**/*.test.js"],
	"testTimeout": 30000
};
