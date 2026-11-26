/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as dynamoose from "../../dist";
import {Item} from "../../dist/Item";
import {ModelItemConstructor} from "../../dist/General";
import {UpdatePartial, ModelGetSettings, ModelDeleteSettings, ModelBatchPutSettings, ModelUpdateSettings, ModelBatchGetItemsResponse, ModelBatchGetSettings, ModelBatchDeleteSettings} from "../../dist/Model";
import {IndexType} from "../../dist/Schema";

// @ts-expect-error
const shouldFailWithNumberAsName = dynamoose.model(1);

// @ts-expect-error
const shouldFailWithBooleanAsName = dynamoose.model(true);

const shouldSucceedWithOnlyPassingInName = dynamoose.model("User");
const shouldSucceedWithOnlyNameAndSchemaObject = dynamoose.model("User", {"id": String});
const shouldSucceedWithNameAndSchemaInstance = dynamoose.model("User", new dynamoose.Schema({"id": String}));
const shouldSucceedWithTableNameOption = dynamoose.model("User", {"id": String}, {"tableName": "custom"});

const shouldNotFailWithConfigurationParameter = dynamoose.model("User", {"id": String}, {});

const model = dynamoose.model("User", {"id": Number});

const shouldPassCreateWithNoReturnSetting = model.create({"id": 1}, {"overwrite": true});
const shouldPassCreateWithReturnRequest = model.create({"id": 1}, {"return": "request"});
const shouldPassCreateWithReturnItem = model.create({"id": 1}, {"return": "item"});
const shouldPassGetWithNoReturnSetting = model.get({"id": 1}, {"attributes": ["something"]});
const shouldPassDeleteWithNoReturnSetting = model.delete({"id": 1}, {"condition": new dynamoose.Condition("name").eq("Charlie")});
const shouldPassUpdateWithNoReturnSetting = model.update({"id": 1}, {"name": "Charlie"}, {"condition": new dynamoose.Condition("name").eq("Bob")});
const shouldPassBatchGetWithNoReturnSetting = model.batchGet([{"id": 1}, {"id": 2}], {});
const shouldPassBatchGetWithConsistentTrue = model.batchGet([{"id": 1}, {"id": 2}], {"consistent": true});
const shouldPassBatchGetWithConsistentFalse = model.batchGet([{"id": 1}, {"id": 2}], {"consistent": false});
const shouldPassBatchPutWithNoReturnSetting = model.batchPut([{"id": 1}, {"id": 2}], {});
const shouldPassBatchDeleteWithNoReturnSetting = model.batchDelete([{"id": 1}, {"id": 2}], {});
const shouldPassCreateWithNoReturnSettingCallback = model.create({"id": 1}, {"overwrite": true}, () => {});
const shouldPassGetWithNoReturnSettingCallback = model.get({"id": 1}, {"attributes": ["something"]}, () => {});
const shouldPassDeleteWithNoReturnSettingCallback = model.delete({"id": 1}, {"condition": new dynamoose.Condition("name").eq("Charlie")}, () => {});
const shouldPassUpdateWithNoReturnSettingCallback = model.update({"id": 1}, {"name": "Charlie"}, {"condition": new dynamoose.Condition("name").eq("Bob")}, () => {});
const shouldPassBatchGetWithNoReturnSettingCallback = model.batchGet([{"id": 1}, {"id": 2}], {}, () => {});
const shouldPassBatchGetWithNoReturnSettingCallbackConsistentTrue = model.batchGet([{"id": 1}, {"id": 2}], {"consistent": true}, () => {});
const shouldPassBatchGetWithNoReturnSettingCallbackConsistentFalse = model.batchGet([{"id": 1}, {"id": 2}], {"consistent": false}, () => {});
const shouldPassBatchPutWithNoReturnSettingCallback = model.batchPut([{"id": 1}, {"id": 2}], {}, () => {});
const shouldPassBatchDeleteWithNoReturnSettingCallback = model.batchDelete([{"id": 1}, {"id": 2}], {}, () => {});

const shouldPassUpdateWithDefaultReturnValuesSetting = model.update({"id": 1}, {"attributes": ["something"]}, {"returnValues": "ALL_NEW"});
const shouldPassUpdateWithCustomReturnValuesSetting = model.update({"id": 1}, {"attributes": ["something"]}, {"returnValues": "NONE"});

const shouldPassGetWithStringAsKey = model.get("id");
const shouldPassGetWithNumberAsKey = model.get(1);

const shouldPassUpdateWithStringAsKey = model.update("id", {"value": "hello world"});
const shouldPassUpdateWithNumberAsKey = model.update(1, {"value": "hello world"});

// @ts-expect-error
const shouldFailWithInvalidReturnType = model.create({"id": 1}, {"return": "invalid-return-type"});

// @ts-expect-error
const shouldFailWithInvalidTransaction = model.transaction.notValid();

const shouldPassWithGetTransaction = model.transaction.get("key");
const shouldPassWithCreateTransaction = model.transaction.create({});
const shouldPassWithDeleteTransaction = model.transaction.delete("key");
const shouldPassWithUpdateTransaction = model.transaction.update({});
const shouldPassWithConditionTransaction = model.transaction.condition("key", new dynamoose.Condition());

// @ts-expect-error
const shouldFailWithInvalidGetTransaction = model.transaction.get();
// @ts-expect-error
const shouldFailWithInvalidCreateTransaction = model.transaction.create(0);
// @ts-expect-error
const shouldFailWithInvalidDeleteTransaction = model.transaction.delete();
// @ts-expect-error
const shouldFailWithInvalidUpdateTransaction = model.transaction.update(0);
// @ts-expect-error
const shouldFailWithInvalidConditionTransaction = model.transaction.condition(0, []);

// Typed Models
export class User extends Item {
	id!: string;
	name!: string;
	age!: number;
	friends!: string[];
}
const userSchema = new dynamoose.Schema({
	"id": String,
	"name": {
		"type": String,
		"index": {
			"type": IndexType.global
		}
	},
	"age": Number,
	"friends": {
		"type": Array,
		"schema": [String]
	}
});

export const UserTypedModel = dynamoose.model<User>(
	"User",
	userSchema
);

export const UserModel = dynamoose.model(
	"User",
	userSchema
);

UserTypedModel.update({"id": "foo"}, {
	"$SET":{"name":"foo"}
});

UserTypedModel.update({"id": "foo"}, {
	"$ADD":{"age":1}
});
UserTypedModel.update({"id": "foo"}, {
	"$ADD":{"friends":["test"]}
});

UserTypedModel.update({"id": "foo"}, {
	"$REMOVE":{"age":null}
});

// Exported setting and response types can be declared outside the method call
const shouldSucceedWithExportedModelGetSettings: ModelGetSettings = {"attributes": ["name"], "consistent": true};
const shouldPassGetWithExportedSettings = UserTypedModel.get({"id": "foo"}, shouldSucceedWithExportedModelGetSettings);
const shouldSucceedWithExportedModelDeleteSettings: ModelDeleteSettings = {"condition": new dynamoose.Condition("age").gt(1)};
const shouldPassDeleteWithExportedSettings = UserTypedModel.delete({"id": "foo"}, shouldSucceedWithExportedModelDeleteSettings);
const shouldSucceedWithExportedModelBatchPutSettings: ModelBatchPutSettings = {"return": "response"};
const shouldPassBatchPutWithExportedSettings = UserTypedModel.batchPut([{"id": "foo"}], shouldSucceedWithExportedModelBatchPutSettings);
const shouldSucceedWithExportedModelUpdateSettings: ModelUpdateSettings = {"returnValues": "ALL_NEW"};
const shouldPassUpdateWithExportedSettings = UserTypedModel.update({"id": "foo"}, {"name": "bar"}, shouldSucceedWithExportedModelUpdateSettings);
const shouldSucceedWithExportedModelBatchGetSettings: ModelBatchGetSettings = {"attributes": ["name"]};
const shouldPassBatchGetWithExportedSettings: Promise<ModelBatchGetItemsResponse<User>> = UserTypedModel.batchGet([{"id": "foo"}], shouldSucceedWithExportedModelBatchGetSettings);
const shouldSucceedWithExportedModelBatchDeleteSettings: ModelBatchDeleteSettings = {"return": "response"};
const shouldPassBatchDeleteWithExportedSettings = UserTypedModel.batchDelete([{"id": "foo"}], shouldSucceedWithExportedModelBatchDeleteSettings);
const shouldSucceedWithExportedModelItemConstructor: ModelItemConstructor<User> = UserTypedModel;
const shouldReturnTypedItemFromExportedModelItemConstructor: User = new shouldSucceedWithExportedModelItemConstructor({"id": "foo"});

// An update object built step by step can mix plain attributes and several operators
const shouldSucceedWithMixedUpdateObject: UpdatePartial<User> = {};
shouldSucceedWithMixedUpdateObject.name = "bar";
shouldSucceedWithMixedUpdateObject.$SET = {"friends": ["baz"]};
shouldSucceedWithMixedUpdateObject.$ADD = {"age": 1};
shouldSucceedWithMixedUpdateObject.$REMOVE = ["nickname"];
const shouldPassUpdateWithMixedUpdateObject = UserTypedModel.update({"id": "foo"}, shouldSucceedWithMixedUpdateObject);
// Operator values are still checked against the item type
// @ts-expect-error
UserTypedModel.update({"id": "foo"}, {"$SET": {"name": "bar"}, "$ADD": {"age": "1"}});
