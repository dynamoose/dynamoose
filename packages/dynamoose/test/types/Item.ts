import {User, UserTypedModel} from "./Model";

const user = new User(UserTypedModel, {"id": "1", "name": "Jane", "age": 30});

const shouldPassSave = user.save();
const shouldPassSaveWithReturnRequest = user.save({"return": "request"});
const shouldPassSaveWithReturnItem = user.save({"return": "item"});
const shouldPassSaveCallback = user.save(() => {});
const shouldPassSaveWithReturnRequestCallback = user.save({"return": "request"}, () => {});
const shouldPassSaveWithReturnItemCallback = user.save({"return": "item"}, () => {});

// @ts-expect-error
const shouldFailWithInvalidReturnType = user.save({"return": "invalid-return-type"});
