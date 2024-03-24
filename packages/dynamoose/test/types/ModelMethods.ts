/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel} from "./Model";

// @ts-expect-error
const shouldFailItemCustomMethodAccess = UserTypedModel.resetPassword();
