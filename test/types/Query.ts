/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {Document} from "../../dist/Document";

// Typed Models
interface User extends Document {
	id: string;
	name: string;
}

const TypedModel = dynamoose.model<User>(
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

TypedModel.query("name").eq("john").exec();
