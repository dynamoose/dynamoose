export default {
	"General": {
		"internalProperties": Symbol("internalProperties"),
		// The model that built a `Model.transaction` request, so `dynamoose.transaction` can return the written items as that model.
		"transactionModel": Symbol("transactionModel")
	},
	"Public": {
		"undefined": Symbol("dynamoose.undefined"),
		"this": Symbol("dynamoose.this"),
		"null": Symbol("dynamoose.null"),
		"any": Symbol("dynamoose.any")
	}
};
