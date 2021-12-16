import * as DynamoDB from "@aws-sdk/client-dynamodb";
import utils from "../../utils";
import {Instance} from "../../Instance";

// NOTE: If you add new functions below remember to add to FAQ page for what IAM roles are required

// Table
async function main (instance: Instance, method: "describeTable", params: DynamoDB.DescribeTableInput): Promise<DynamoDB.DescribeTableOutput>;
async function main (instance: Instance, method: "createTable", params: DynamoDB.CreateTableInput): Promise<DynamoDB.CreateTableOutput>;
async function main (instance: Instance, method: "updateTable", params: DynamoDB.UpdateTableInput): Promise<DynamoDB.UpdateTableOutput>;
async function main (instance: Instance, method: "updateTimeToLive", params: DynamoDB.UpdateTimeToLiveInput): Promise<DynamoDB.UpdateTimeToLiveOutput>;
async function main (instance: Instance, method: "describeTimeToLive", params: DynamoDB.DescribeTimeToLiveInput): Promise<DynamoDB.DescribeTimeToLiveOutput>;
async function main (instance: Instance, method: "listTagsOfResource", params: DynamoDB.ListTagsOfResourceCommandInput): Promise<DynamoDB.ListTagsOfResourceCommandOutput>;
async function main (instance: Instance, method: "tagResource", params: DynamoDB.TagResourceCommandInput): Promise<DynamoDB.TagResourceCommandOutput>;
async function main (instance: Instance, method: "untagResource", params: DynamoDB.UntagResourceCommandInput): Promise<DynamoDB.UntagResourceCommandOutput>;

// Item
async function main (instance: Instance, method: "getItem", params: DynamoDB.GetItemInput): Promise<DynamoDB.GetItemOutput>;
async function main (instance: Instance, method: "deleteItem", params: DynamoDB.DeleteItemInput): Promise<DynamoDB.DeleteItemOutput>;
async function main (instance: Instance, method: "updateItem", params: DynamoDB.UpdateItemInput): Promise<DynamoDB.UpdateItemOutput>;
async function main (instance: Instance, method: "putItem", params: DynamoDB.PutItemInput): Promise<DynamoDB.PutItemOutput>;
async function main (instance: Instance, method: "batchWriteItem", params: DynamoDB.BatchWriteItemInput): Promise<DynamoDB.BatchWriteItemOutput>;
async function main (instance: Instance, method: "batchGetItem", params: DynamoDB.BatchGetItemInput): Promise<DynamoDB.BatchGetItemOutput>;

// Document Retriever
async function main (instance: Instance, method: "query", params: DynamoDB.QueryInput): Promise<DynamoDB.QueryOutput>;
async function main (instance: Instance, method: "scan", params: DynamoDB.ScanInput): Promise<DynamoDB.ScanOutput>;

// Transaction
async function main (instance: Instance, method: "transactGetItems", params: DynamoDB.TransactGetItemsInput): Promise<DynamoDB.TransactGetItemsOutput>;
async function main (instance: Instance, method: "transactWriteItems", params: DynamoDB.TransactWriteItemsInput): Promise<DynamoDB.TransactWriteItemsOutput>;

async function main (instance: Instance, method: string, params: any): Promise<any> {
	await utils.log({"level": "debug", "category": `aws:dynamodb:${method}:request`, "message": JSON.stringify(params, null, 4), "payload": {"request": params}});
	const result = await instance.aws.ddb()[method](params);
	await utils.log({"level": "debug", "category": `aws:dynamodb:${method}:response`, "message": typeof result === "undefined" ? "undefined" : JSON.stringify(result, null, 4), "payload": {"response": result}});
	return result;
}

export default main;
