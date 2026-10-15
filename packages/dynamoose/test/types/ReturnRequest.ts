// Each method's `return: "request"` overload must resolve to the DynamoDB request type, not the default result.
import * as dynamoose from "../../dist";
import {Item} from "../../dist/Item";
import * as DynamoDB from "@aws-sdk/client-dynamodb";

class RequestUser extends Item {
	id!: number;
	name!: string;
}
const RequestUserModel = dynamoose.model<RequestUser>("RequestUser", {"id": Number, "name": String});
const requestTable = new dynamoose.Table("RequestTable", [RequestUserModel]);
const requestUser = new RequestUserModel({"id": 1, "name": "Bob"});

const shouldResolveTableCreateRequest: Promise<DynamoDB.CreateTableInput> = requestTable.create({"return": "request"});
const shouldResolveModelGetRequest: Promise<DynamoDB.GetItemInput> = RequestUserModel.get(1, {"return": "request"});
const shouldResolveModelDeleteRequest: Promise<DynamoDB.DeleteItemInput> = RequestUserModel.delete(1, {"return": "request"});
const shouldResolveModelUpdateRequest: Promise<DynamoDB.UpdateItemInput> = RequestUserModel.update({"id": 1}, {"name": "Tim"}, {"return": "request"});
const shouldResolveModelCreateRequest: Promise<DynamoDB.PutItemInput> = RequestUserModel.create({"id": 1}, {"return": "request"});
const shouldResolveModelBatchGetRequest: Promise<DynamoDB.BatchGetItemInput> = RequestUserModel.batchGet([1], {"return": "request"});
const shouldResolveModelBatchPutRequest: Promise<DynamoDB.BatchWriteItemInput> = RequestUserModel.batchPut([{"id": 1}], {"return": "request"});
const shouldResolveModelBatchDeleteRequest: Promise<DynamoDB.BatchWriteItemInput> = RequestUserModel.batchDelete([1], {"return": "request"});
const shouldResolveItemSaveRequest: Promise<DynamoDB.PutItemInput> = requestUser.save({"return": "request"});

// Without `return: "request"`, the default results stay as they were.
const shouldResolveTableCreate: Promise<void> = requestTable.create();
const shouldResolveTableCreateWithSettings: Promise<void> = requestTable.create({});
const shouldResolveModelGet: Promise<RequestUser> = RequestUserModel.get(1);
