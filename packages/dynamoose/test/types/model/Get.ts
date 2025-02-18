/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel} from "../Model";

const shouldGetSuccessfully = await UserTypedModel.get("1");
const user = shouldGetSuccessfully;
// @ts-expect-error
const shouldFailImmediatePropertyAccess = user.id;

if (user) {
	const shouldPassPropertyAccessAfterNullishCheck = user.id;
}
