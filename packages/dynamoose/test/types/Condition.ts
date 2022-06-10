/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";

// @ts-expect-error
const shouldFailIfTryingToAccessSettings = new dynamoose.Condition({"name": "Charlie"}).settings;
