/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";

// @ts-expect-error
const shouldFailWithNumberAsName = dynamoose.model(1);

// @ts-expect-error
const shouldFailWithBooleanAsName = dynamoose.model(true);

const shouldSucceedWithOnlyPassingInName = dynamoose.model("User");

const model = dynamoose.model("User");

// @ts-expect-error
const shouldFailWithInvalidTransaction = model.transaction.notValid();

const shouldPassWithGetTransaction = model.transaction.get("key");
const shouldPassWithCreateTransaction = model.transaction.create({});
const shouldPassWithDeleteTransaction = model.transaction.delete("key");
const shouldPassWithUpdateTransaction = model.transaction.update({});
const shouldPassWithConditionTransaction = model.transaction.condition("key", new dynamoose.Condition());

// @ts-expect-error
const shouldFailWithInvalidGetTransaction = model.transaction.get(0);
// @ts-expect-error
const shouldFailWithInvalidCreateTransaction = model.transaction.create(0);
// @ts-expect-error
const shouldFailWithInvalidDeleteTransaction = model.transaction.delete();
// @ts-expect-error
const shouldFailWithInvalidUpdateTransaction = model.transaction.update(0);
// @ts-expect-error
const shouldFailWithInvalidConditionTransaction = model.transaction.condition(0, []);

