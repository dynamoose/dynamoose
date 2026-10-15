import ddb from "./aws/ddb/internal";
import {randomUUID} from "crypto";
import * as DynamoDB from "@aws-sdk/client-dynamodb";
import utils from "./utils";
import Error from "./Error";
import {Model} from "./Model";
import ModelStore from "./ModelStore";
import {CallbackType} from "./General";
import {Item} from "./Item";
import Internal from "./Internal";
const {internalProperties} = Internal.General;
import {Table} from "./Table";
import {Instance} from "./Instance";

export enum TransactionReturnOptions {
	request = "request",
	items = "items"
}
enum TransactionType {
	get = "get",
	write = "write"
}
export interface TransactionSettings {
	return?: TransactionReturnOptions;
	type?: TransactionType;
	/**
	 * A token of 1 to 36 characters that DynamoDB uses to make a `write` transaction idempotent: for 10 minutes after a successful transaction, sending the same transaction again with the same token succeeds without writing anything again. Without it, the AWS SDK sends a new token with every call. Use it when a caller may send the same write again, for example a retried Lambda event, and build it from something that identifies that write (such as an event id). Sending different transaction items with a token that was already used fails with `IdempotentParameterMismatchException`.
	 */
	clientRequestToken?: string;
	/**
	 * Sends the transaction again when DynamoDB cancels it because it conflicts with another request on the same item (a `TransactionCanceledException` with a `TransactionConflict` reason) or reports it as still in progress (`TransactionInProgressException`). A canceled transaction writes nothing, so it is safe to send again. A transaction in progress may still be applied, so every attempt sends the same `ClientRequestToken`, and DynamoDB applies the transaction at most once: your `clientRequestToken`, or one Dynamoose makes for this call (replaced after a cancellation). Any other error, including a failed condition, is thrown at once.
	 *
	 * `attempts` is how many times to send it again. Retry `n` waits a random time between 0 and `delay * 2^(n - 1)` milliseconds, but at most 20 seconds; `delay` defaults to `100`. After the last attempt, the last error is thrown.
	 *
	 * ```js
	 * await dynamoose.transaction([...], {"retry": {"attempts": 3, "delay": 500}, "clientRequestToken": eventId});
	 * ```
	 */
	retry?: {attempts: number; delay?: number};
}

export type GetTransactionInput = {Get: DynamoDB.GetItemInput};
export type CreateTransactionInput = {Put: DynamoDB.PutItemInput};
export type DeleteTransactionInput = {Delete: DynamoDB.DeleteItemInput};
export type UpdateTransactionInput = {Update: DynamoDB.UpdateItemInput};
export type ConditionTransactionInput = {ConditionCheck: DynamoDB.ConditionCheck};

type Transaction =
	GetTransactionInput |
	CreateTransactionInput |
	DeleteTransactionInput |
	UpdateTransactionInput |
	ConditionTransactionInput;

type TransactionValue = DynamoDB.GetItemInput | DynamoDB.PutItemInput | DynamoDB.DeleteItemInput | DynamoDB.UpdateItemInput | DynamoDB.ConditionCheck;

type Transactions = (Transaction | Promise<Transaction>)[];
type TransactionCallback = CallbackType<any, any>;
type TransactionReturnType = any;

/* Define overloads / signatures for Transaction method */
function Transaction (transactions: Transactions): TransactionReturnType;
function Transaction (transactions: Transactions, settings: TransactionSettings): TransactionReturnType;
function Transaction (transactions: Transactions, callback: TransactionCallback): TransactionReturnType;
function Transaction (transaction: Transactions, settings: TransactionSettings, callback: TransactionCallback): TransactionReturnType;
function Transaction (transactions: Transactions, settings?: TransactionSettings | TransactionCallback, callback?: TransactionCallback): TransactionReturnType {
	settings = settings ?? {"return": TransactionReturnOptions.items};

	if (typeof settings === "function") {
		callback = settings;
		settings = {"return": TransactionReturnOptions.items};
	}
	if (typeof transactions === "function") {
		callback = transactions;
		transactions = null;
	}

	const promise = (async (): Promise<any> => {
		if (!Array.isArray(transactions) || transactions.length <= 0) {
			throw new Error.InvalidParameter("You must pass in an array with items for the transactions parameter.");
		}

		const transactionObjects = await Promise.all(transactions);

		const {clientRequestToken} = settings;
		if (clientRequestToken !== undefined) {
			if (typeof clientRequestToken !== "string" || clientRequestToken.length < 1 || clientRequestToken.length > 36) {
				throw new Error.InvalidParameter("clientRequestToken must be a string of 1 to 36 characters.");
			}
			const isGetTransaction = settings.type ? settings.type === TransactionType.get : transactionObjects.every((transaction) => Object.keys(transaction)[0] === "Get");
			if (isGetTransaction) {
				throw new Error.InvalidParameter("clientRequestToken can only be used with a write transaction.");
			}
		}
		const retry = settings.retry ?? {"attempts": 0};
		if (!Number.isInteger(retry.attempts) || retry.attempts < 0 || retry.delay !== undefined && !(typeof retry.delay === "number" && retry.delay >= 0)) {
			throw new Error.InvalidParameter("retry.attempts must be a whole number of 0 or more, and retry.delay a number of milliseconds of 0 or more.");
		}

		const transactionParams = {
			"TransactItems": transactionObjects,
			...clientRequestToken !== undefined ? {"ClientRequestToken": clientRequestToken} : {}
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
				throw new Error.InvalidParameter("Invalid type option, please pass in \"get\" or \"write\".");
			}
		} else {
			transactionType = transactionObjects.map((a) => Object.keys(a)[0]).every((key) => key === "Get") ? "transactGetItems" : "transactWriteItems";
		}

		const tableNames: string[] = transactionObjects.map((a) => (Object.values(a)[0] as TransactionValue).TableName);
		const uniqueTableNames = utils.unique_array_elements(tableNames);
		const tables: (Table | undefined)[] = uniqueTableNames.map((name) => ModelStore.forTableName(name)?.[0].getInternalProperties(internalProperties).table());
		const validTables: Table[] = tables.filter((table) => table !== undefined);
		tables.forEach((table, index) => {
			if (!table) {
				throw new Error.InvalidParameter(`Table "${uniqueTableNames[index]}" not found. Please register the table with dynamoose before using it in transactions.`);
			}
		});
		await Promise.all(tables.map((table) => table.getInternalProperties(internalProperties).pendingTaskPromise()));

		const instance: Instance = tables.reduce((instance: Instance, table: Table): Instance => {
			const tableInstance = table.getInternalProperties(internalProperties).instance;
			if (!instance) {
				return tableInstance;
			}

			if (tableInstance !== instance) {
				throw new Error.InvalidParameter("You must use a single Dynamoose instance for all tables in a transaction.");
			}

			return instance;
		}, undefined);

		// A transaction DynamoDB canceled for a conflict, or reports as in progress, wrote nothing, so it can be sent again.
		const isRetryable = (error: any): boolean => error.name === "TransactionInProgressException" || error.name === "TransactionCanceledException" && Array.isArray(error.CancellationReasons) && error.CancellationReasons.some((reason: DynamoDB.CancellationReason) => reason.Code === "TransactionConflict");
		// Without a token the AWS SDK sends a new one with every call. A transaction reported as in progress may still be applied, so sending it again with a new token could apply it twice. Retries keep one token, which DynamoDB applies at most once.
		const generatesToken = transactionType === "transactWriteItems" && retry.attempts > 0 && clientRequestToken === undefined;
		let sentParams = generatesToken ? {...transactionParams, "ClientRequestToken": randomUUID()} : transactionParams;
		let result: any;
		for (let attempt = 1; ; attempt++) {
			try {
				// TODO: remove `as any` here (https://stackoverflow.com/q/61111476/894067)
				result = await ddb(instance, transactionType as any, sentParams as any);
				break;
			} catch (error) {
				if (attempt > retry.attempts || !isRetryable(error)) {
					throw error;
				}
				// A canceled transaction is finished and wrote nothing, so a token Dynamoose made is replaced. A token the caller passed is always kept.
				if (generatesToken && error.name === "TransactionCanceledException") {
					sentParams = {...sentParams, "ClientRequestToken": randomUUID()};
				}
				await utils.timeout(Math.random() * Math.min(20000, (retry.delay ?? 100) * 2 ** (attempt - 1)));
			}
		}
		return result.Responses ? await Promise.all(result.Responses.map(async (item: any, index: number) => {
			const tableName: string = tableNames[index];
			const table: Table = validTables.find((table) => table.name === tableName);
			const model: Model<Item> = await table.getInternalProperties(internalProperties).modelForObject(Item.fromDynamo(item.Item));
			return new model.Item(item.Item, {"type": "fromDynamo"}).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"});
		})) : null;
	})();

	if (callback) {
		promise.then((result) => callback(null, result)).catch((error) => callback(error));
	} else {
		return promise;
	}
}

export default Transaction;
