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
