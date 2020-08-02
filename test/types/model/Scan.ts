/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel} from "../Model";

const shouldScanSuccessfully = UserTypedModel.scan("name").eq("john").exec();
