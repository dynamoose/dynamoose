import aws from "./aws";
import utils from "./utils";
import Error from "./Error";
import ModelStore from "./ModelStore";

enum TransactionReturnOptions {
	request = "request",
	documents = "documents"
}
enum TransactionType {
	get = "get",
	write = "write"
}
interface TransactionSettings {
	return: TransactionReturnOptions;
	type?: TransactionType;
}

type CallbackType = (error: any, result?: any) => void;
// TODO: seems like when using this method as a consumer of Dynamoose that it will get confusing with the different parameter names. For example, if you pass in an array of transactions and a callback, the callback parameter name when using this method will be `settings` (I THINK). Which is super confusing to the user. Not sure how to fix this tho.
export = (transactions: any[] | CallbackType, settings: TransactionSettings | CallbackType = {"return": TransactionReturnOptions.documents}, callback: CallbackType) => {
	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": TransactionReturnOptions.documents};
	}
	if (typeof transactions === "function") {
		callback = transactions;
		transactions = null;
	}

	const promise = (async () => {
		if (!Array.isArray(transactions) || transactions.length <= 0) {
			throw Error.InvalidParameter("You must pass in an array with items for the transactions parameter.");
		}

		const transactionObjects = await Promise.all(transactions);

		const transactionParams = {
			"TransactItems": transactionObjects
		};

		if (settings.return === TransactionReturnOptions.request) {
			return transactionParams;
		}

		let transactionType: "transactGetItems" | "transactWriteItems";
		if (settings.type) {
			switch (settings.type) {
			case TransactionType.get:
				transactionType = "transactGetItems";
				break;
			case TransactionType.write:
				transactionType = "transactWriteItems";
				break;
			default:
				throw Error.InvalidParameter("Invalid type option, please pass in \"get\" or \"write\".");
			}
		} else {
			transactionType = transactionObjects.map((a) => Object.keys(a)[0]).every((key) => key === "Get") ? "transactGetItems" : "transactWriteItems";
		}

		const modelNames: string[] = transactionObjects.map((a) => (Object.values(a)[0] as any).TableName);
		const uniqueModelNames = utils.unique_array_elements(modelNames);
		const models = uniqueModelNames.map((name) => ModelStore(name));
		models.forEach((model, index) => {
			if (!model) {
				throw Error.InvalidParameter(`Model "${uniqueModelNames[index]}" not found. Please register the model with dynamoose before using it in transactions.`);
			}
		});
		await Promise.all(models.map((model) => model.pendingTaskPromise()));

		// TODO: remove `as any` here (https://stackoverflow.com/q/61111476/894067)
		const result = await (aws.ddb()[transactionType] as any)(transactionParams).promise();
		return result.Responses ? await Promise.all(result.Responses.map((item, index: number) => {
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
