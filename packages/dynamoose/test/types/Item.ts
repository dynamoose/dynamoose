import {UserTypedModel} from "./Model";

const typedUser = new UserTypedModel({"id": "1", "name": "Jane", "age": 30});

const shouldPassSave = typedUser.save();
const shouldPassSaveWithReturnRequest = typedUser.save({"return": "request"});
const shouldPassSaveWithReturnItem = typedUser.save({"return": "item"});
const shouldPassSaveCallback = typedUser.save(() => {});
const shouldPassSaveWithReturnRequestCallback = typedUser.save({"return": "request"}, () => {});
const shouldPassSaveWithReturnItemCallback = typedUser.save({"return": "item"}, () => {});

// @ts-expect-error
const shouldFailWithInvalidReturnType = typedUser.save({"return": "invalid-return-type"});
