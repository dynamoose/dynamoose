/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel} from "../Model";

const shouldQuerySuccessfully = UserTypedModel.query("name").eq("john").exec();
