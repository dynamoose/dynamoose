const ddb = require("./aws/ddb/internal");
const utils = require("./utils");
const Error = require("./Error");
const ModelStore = require("./ModelStore");

module.exports = (transactions, settings = {}, callback) => {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}
	if (typeof transactions === "function") {
		callback = transactions;
		transactions = null;
	}

	const promise = (async () => {
		if (!Array.isArray(transactions) || transactions.length <= 0) {
			throw new Error.InvalidParameter("You must pass in an array with items for the transactions parameter.");
		}

		const transactionObjects = await Promise.all(transactions);

		const transactionParams = {
			"TransactItems": transactionObjects
		};

		if (settings.return === "request") {
			return transactionParams;
		}

		let transactionType;
		if (settings.type) {
			switch (settings.type) {
			case "get":
				transactionType = "transactGetItems";
				break;
			case "write":
				transactionType = "transactWriteItems";
				break;
			default:
				throw new Error.InvalidParameter("Invalid type option, please pass in \"get\" or \"write\".");
			}
		} else {
			transactionType = transactionObjects.map((a) => Object.keys(a)[0]).every((key) => key === "Get") ? "transactGetItems" : "transactWriteItems";
		}

		const modelNames = transactionObjects.map((a) => Object.values(a)[0].TableName);
		const uniqueModelNames = utils.unique_array_elements(modelNames);
		const models = uniqueModelNames.map((name) => ModelStore(name));
		models.forEach((model, index) => {
			if (!model) {
				throw new Error.InvalidParameter(`Model "${uniqueModelNames[index]}" not found. Please register the model with dynamoose before using it in transactions.`);
			}
		});
		await Promise.all(models.map((model) => model.pendingTaskPromise()));

		const result = await ddb(transactionType, transactionParams);
		return result.Responses ? await Promise.all(result.Responses.map((item, index) => {
			const modelName = modelNames[index];
			const model = models.find((model) => model.name === modelName);
			return (new model.Document(item.Item, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "type": "fromDynamo"});
		})) : null;
	})();

	if (callback) {
		promise.then((result) => callback(null, result)).catch((error) => callback(error));
	} else {
		return promise;
	}
};
