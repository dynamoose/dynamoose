/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {Document} from "../../dist/Document";

// @ts-expect-error
const shouldFailWithNumberAsName = dynamoose.model(1);

// @ts-expect-error
const shouldFailWithBooleanAsName = dynamoose.model(true);

const shouldSucceedWithOnlyPassingInName = dynamoose.model("User");

// Typed Models
export interface User extends Document {
	id: string;
	name: string;
	age: number;
}

export const UserTypedModel = dynamoose.model<User>(
	"User",
	new dynamoose.Schema({
		"id": String,
		"name": {
			"type": String,
			"index": {
				"global": true
			}
		},
		"age": Number
	})
);
