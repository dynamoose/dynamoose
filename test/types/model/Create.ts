/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel} from "../Model";

const shouldCreateSuccessfully = UserTypedModel.create({"id": "1", "name": "john", "age": 25});
const shouldAccessPropertySuccessfully = (await shouldCreateSuccessfully).id;

const shouldNotFailWithNotAllAttributesPassedIn = UserTypedModel.create({"id": "1"});

//@ts-expect-error
const shouldFailWithInvalidAttributes = UserTypedModel.create({"id": "1", "random": "string"});
