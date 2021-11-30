import DynamoDB = require("@aws-sdk/client-dynamodb");
import { CallbackType } from "./General";
export declare enum TransactionReturnOptions {
    request = "request",
    items = "items"
}
declare enum TransactionType {
    get = "get",
    write = "write"
}
export interface TransactionSettings {
    return: TransactionReturnOptions;
    type?: TransactionType;
}
export declare type GetTransactionInput = {
    Get: DynamoDB.GetItemInput;
};
export declare type CreateTransactionInput = {
    Put: DynamoDB.PutItemInput;
};
export declare type DeleteTransactionInput = {
    Delete: DynamoDB.DeleteItemInput;
};
export declare type UpdateTransactionInput = {
    Update: DynamoDB.UpdateItemInput;
};
export declare type ConditionTransactionInput = {
    ConditionCheck: DynamoDB.ConditionCheck;
};
declare type Transaction = GetTransactionInput | CreateTransactionInput | DeleteTransactionInput | UpdateTransactionInput | ConditionTransactionInput;
declare type Transactions = (Transaction | Promise<Transaction>)[];
declare type TransactionCallback = CallbackType<any, any>;
declare type TransactionReturnType = any;
declare function Transaction(transactions: Transactions): TransactionReturnType;
declare function Transaction(transactions: Transactions, settings: TransactionSettings): TransactionReturnType;
declare function Transaction(transactions: Transactions, callback: TransactionCallback): TransactionReturnType;
declare function Transaction(transaction: Transactions, settings: TransactionSettings, callback: TransactionCallback): TransactionReturnType;
export default Transaction;
