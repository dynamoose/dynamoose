/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserModel, UserTypedModel} from "./Model";

const user = new UserModel({"id": "1", "name": "Jane", "age": 30});
const typedUser = new UserTypedModel({"id": "1", "name": "Jane", "age": 30});

const shouldPassUntypedCustomMethodAccess = user.resetPassword();

const shouldPassCustomMethodAccess = typedUser.resetPassword();
// @ts-expect-error
const shouldFailUnknownCustomMethodAccess = typedUser.updateEmail();
