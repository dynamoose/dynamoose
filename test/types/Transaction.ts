/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {TransactionReturnOptions} from "../../lib/Transaction";

const model = dynamoose.model("User");

const shouldPassWithArrayOfTransactions = dynamoose.transaction([model.transaction.get("key")]);
// @ts-expect-error
const shouldFailWithNoArray = dynamoose.transaction(model.transaction.get("key"));

const shouldPassWithTransactionSettings = dynamoose.transaction([model.transaction.get("key")], {"return": TransactionReturnOptions.documents});
// @ts-expect-error
const shouldFailWithInvalidTransactionSettings = dynamoose.transaction([model.transaction.get("key")], {"return": "bad"});

const shouldPassWithCallback = dynamoose.transaction(
	[model.transaction.get("key")],
	{"return": TransactionReturnOptions.documents},
	(a, b) => {
		return;
	}
);

const shouldFailWithInvalidCallback = dynamoose.transaction(
	[model.transaction.get("key")],
	{"return": TransactionReturnOptions.documents},
	// @ts-expect-error
	(a, b, c) => {
		return;
	}
);
