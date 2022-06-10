import ddb from "./aws/ddb/internal";
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
	return: TransactionReturnOptions;
	type?: TransactionType;
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

		// TODO: remove `as any` here (https://stackoverflow.com/q/61111476/894067)
		const result: any = await ddb(instance, transactionType as any, transactionParams as any);
		return result.Responses ? await Promise.all(result.Responses.map(async (item: any, index: number) => {
			const tableName: string = tableNames[index];
			const table: Table = validTables.find((table) => table.name === tableName);
			const model: Model<Item> = await table.getInternalProperties(internalProperties).modelForObject(Item.fromDynamo(item.Item));
			return new model.Item(item.Item, {"type": "fromDynamo"}).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "type": "fromDynamo"});
		})) : null;
	})();

	if (callback) {
		promise.then((result) => callback(null, result)).catch((error) => callback(error));
	} else {
		return promise;
	}
}

export default Transaction;
