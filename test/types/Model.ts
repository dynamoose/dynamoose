/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {Document} from "../../dist/Document";

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
const shouldFailWithInvalidGetTransaction = model.transaction.get();
// @ts-expect-error
const shouldFailWithInvalidCreateTransaction = model.transaction.create(0);
// @ts-expect-error
const shouldFailWithInvalidDeleteTransaction = model.transaction.delete();
// @ts-expect-error
const shouldFailWithInvalidUpdateTransaction = model.transaction.update(0);
// @ts-expect-error
const shouldFailWithInvalidConditionTransaction = model.transaction.condition(0, []);

// Typed Models
export class User extends Document {
	id: string;
	name: string;
	age: number;
}
const userSchema = new dynamoose.Schema({
	"id": String,
	"name": {
		"type": String,
		"index": {
			"global": true
		}
	},
	"age": Number
});

export const UserTypedModel = dynamoose.model<User>(
	"User",
	userSchema
);

export const UserModel = dynamoose.model(
	"User",
	userSchema
);
