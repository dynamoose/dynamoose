/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";

const shouldSucceedWithNe = new dynamoose.Condition("name").ne("Charlie");
const shouldSucceedWithNeAfterNot = new dynamoose.Condition("name").not().ne("Charlie");

// @ts-expect-error
const shouldFailIfTryingToAccessSettings = new dynamoose.Condition({"name": "Charlie"}).settings;
