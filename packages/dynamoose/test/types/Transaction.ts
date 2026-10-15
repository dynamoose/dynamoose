/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {TransactionReturnOptions} from "../../dist/Transaction";

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

const shouldPassWithClientRequestToken = dynamoose.transaction([model.transaction.create({"id": 1})], {"clientRequestToken": "token-1"});
// @ts-expect-error
const shouldFailWithInvalidClientRequestToken = dynamoose.transaction([model.transaction.create({"id": 1})], {"clientRequestToken": 1});
const shouldPassWithRetry = dynamoose.transaction([model.transaction.create({"id": 1})], {"retry": {"attempts": 3, "delay": 500}});
const shouldPassWithRetryAndCallback = dynamoose.transaction([model.transaction.create({"id": 1})], {"retry": {"attempts": 3}}, (a, b) => {
	return;
});
// @ts-expect-error
const shouldFailWithRetryWithoutAttempts = dynamoose.transaction([model.transaction.create({"id": 1})], {"retry": {"delay": 500}});
