/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {TransactionReturnOptions} from "../../dist/Transaction";
import {Item} from "../../dist/Item";

const model = dynamoose.model("User");

const shouldPassWithArrayOfTransactions = dynamoose.transaction([model.transaction.get("key")]);
// @ts-expect-error
const shouldFailWithNoArray = dynamoose.transaction(model.transaction.get("key"));

const shouldPassWithTransactionSettings = dynamoose.transaction([model.transaction.get("key")], {"return": TransactionReturnOptions.items});
// @ts-expect-error
const shouldFailWithInvalidTransactionSettings = dynamoose.transaction([model.transaction.get("key")], {"return": "bad"});

const shouldPassWithCallback = dynamoose.transaction(
	[model.transaction.get("key")],
	{"return": TransactionReturnOptions.items},
	(a, b) => {
		return;
	}
);

const shouldFailWithInvalidCallback = dynamoose.transaction(
	[model.transaction.get("key")],
	{"return": TransactionReturnOptions.items},
	// @ts-expect-error
	(a, b, c) => {
		return;
	}
);

const shouldPassWithCallbackInSecondArg = dynamoose.transaction([model.transaction.get("key")], (a, b) => {
	return;
});

class Account extends Item {
	id!: number;
	balance!: number;
}
const AccountModel = dynamoose.model<Account>("Account", {"id": Number, "balance": Number});

const shouldPassWithReturnItems: Promise<any[]> = dynamoose.transaction([AccountModel.transaction.create({"id": 1, "balance": 0})], {"returnItems": true});
const shouldPassWithReturnItemsAndItemTypes: Promise<[Account, Account | undefined]> = dynamoose.transaction<[Account, Account | undefined]>([AccountModel.transaction.create({"id": 1, "balance": 0}), AccountModel.transaction.delete({"id": 2})], {"returnItems": true});
async function shouldPassReadingTypedReturnItems (): Promise<number> {
	const [account] = await dynamoose.transaction<[Account]>([AccountModel.transaction.update({"id": 1}, {"$ADD": {"balance": 5}})], {"returnItems": true});
	return account.balance;
}
async function shouldFailReadingUnknownPropertyOfTypedReturnItems (): Promise<void> {
	const [account] = await dynamoose.transaction<[Account]>([AccountModel.transaction.update({"id": 1}, {"$ADD": {"balance": 5}})], {"returnItems": true});
	// @ts-expect-error
	account.notAnAttribute;
}
// @ts-expect-error
const shouldFailWithReturnItemsTypesThatAreNotItems = dynamoose.transaction<[string]>([AccountModel.transaction.create({"id": 1, "balance": 0})], {"returnItems": true});
// @ts-expect-error
const shouldFailWithInvalidReturnItems = dynamoose.transaction([AccountModel.transaction.create({"id": 1, "balance": 0})], {"returnItems": "yes"});
// @ts-expect-error
const shouldFailWithReturnItemsAndReturnRequest = dynamoose.transaction([AccountModel.transaction.create({"id": 1, "balance": 0})], {"return": TransactionReturnOptions.request, "returnItems": true});
const shouldPassWithReturnRequestAndReturnItemsFalse = dynamoose.transaction([AccountModel.transaction.create({"id": 1, "balance": 0})], {"return": TransactionReturnOptions.request, "returnItems": false});

