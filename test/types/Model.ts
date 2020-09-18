/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {Document} from "../../dist/Document";

// @ts-expect-error
const shouldFailWithNumberAsName = dynamoose.model(1);

// @ts-expect-error
const shouldFailWithBooleanAsName = dynamoose.model(true);

const shouldSucceedWithOnlyPassingInName = dynamoose.model("User");

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
