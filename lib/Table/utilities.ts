import {Table, TableExpiresSettings, TableUpdateOptions} from ".";
import Internal = require("../Internal");
const {internalProperties} = Internal.General;
import DynamoDB = require("@aws-sdk/client-dynamodb");
import ddb = require("../aws/ddb/internal");
import utils = require("../utils");
import {CustomError} from "dynamoose-utils";
import {TableIndexChangeType} from "../utils/dynamoose/index_changes";
import {TableClass} from "./types";

// Utility functions
export async function getTableDetails (table: Table, settings: {allowError?: boolean; forceRefresh?: boolean} = {}): Promise<DynamoDB.DescribeTableOutput> {
	const func = async (): Promise<void> => {
		const tableDetails: DynamoDB.DescribeTableOutput = await ddb("describeTable", {"TableName": table[internalProperties].name});
		table[internalProperties].latestTableDetails = tableDetails; // eslint-disable-line require-atomic-updates
	};
	if (settings.forceRefresh || !table[internalProperties].latestTableDetails) {
		if (settings.allowError) {
			try {
				await func();
			} catch (e) {} // eslint-disable-line no-empty
		} else {
			await func();
		}
	}

	return table[internalProperties].latestTableDetails;
}
function getExpectedTags (table: Table): DynamoDB.Tag[] | undefined {
	const tagEntries: [string, string][] = Object.entries(table[internalProperties].options.tags);
	if (tagEntries.length === 0) {
		return undefined;
	} else {
		return tagEntries.map(([Key, Value]) => ({
			Key,
			Value
		}));
	}
}
export async function getTagDetails (table: Table): Promise<DynamoDB.ListTagsOfResourceOutput> {
	const tableDetails = await getTableDetails(table);
	const tags: DynamoDB.ListTagsOfResourceOutput = await ddb("listTagsOfResource", {
		"ResourceArn": tableDetails.Table.TableArn
	});

	while (tags.NextToken) {
		// TODO: The timeout below causes tests to fail, so we disable it for now. We should also probably only run a timeout if we get an error from AWS.
		// await timeout(100); // You can call ListTagsOfResource up to 10 times per second, per account.
		const nextTags = await ddb("listTagsOfResource", {
			"ResourceArn": tableDetails.Table.TableArn,
			"NextToken": tags.NextToken
		});
		tags.NextToken = nextTags.NextToken;
		tags.Tags = [...tags.Tags, ...nextTags.Tags];
	}

	return tags;
}
export async function createTableRequest (table: Table): Promise<DynamoDB.CreateTableInput> {
	const object: DynamoDB.CreateTableInput = {
		"TableName": table[internalProperties].name,
		...utils.dynamoose.get_provisioned_throughput(table[internalProperties].options),
		...await table[internalProperties].getCreateTableAttributeParams()
	};

	if (table[internalProperties].options.tableClass === TableClass.infrequentAccess) {
		object.TableClass = DynamoDB.TableClass.STANDARD_INFREQUENT_ACCESS;
	}

	const tags = getExpectedTags(table);
	if (tags) {
		object.Tags = tags;
	}

	return object;
}
// Setting `force` to true will create the table even if the table is already believed to be active
export function createTable (table: Table): Promise<void | (() => Promise<void>)>;
export function createTable (table: Table, force: true): Promise<void>;
export function createTable (table: Table, force: false): Promise<void | (() => Promise<void>)>;
export async function createTable (table: Table, force = false): Promise<void | (() => Promise<void>)> {
	if (!force && ((await getTableDetails(table, {"allowError": true}) || {}).Table || {}).TableStatus === "ACTIVE") {
		table[internalProperties].alreadyCreated = true;
		return (): Promise<void> => Promise.resolve.bind(Promise)();
	}
	await ddb("createTable", await createTableRequest(table));
}
export async function updateTimeToLive (table: Table): Promise<void> {
	let ttlDetails;

	async function updateDetails (): Promise<void> {
		ttlDetails = await ddb("describeTimeToLive", {
			"TableName": table[internalProperties].name
		});
	}
	await updateDetails();

	function updateTTL (): Promise<DynamoDB.UpdateTimeToLiveOutput> {
		return ddb("updateTimeToLive", {
			"TableName": table[internalProperties].name,
			"TimeToLiveSpecification": {
				"AttributeName": (table[internalProperties].options.expires as TableExpiresSettings).attribute,
				"Enabled": true
			}
		});
	}

	switch (ttlDetails.TimeToLiveDescription.TimeToLiveStatus) {
	case "DISABLING":
		while (ttlDetails.TimeToLiveDescription.TimeToLiveStatus === "DISABLING") {
			await utils.timeout(1000);
			await updateDetails();
		}
		// fallthrough
	case "DISABLED":
		await updateTTL();
		break;
	/* istanbul ignore next */
	default:
		break;
	}
}
export function waitForActive (table: Table, forceRefreshOnFirstAttempt = true) {
	return (): Promise<void> => new Promise((resolve, reject) => {
		const start = Date.now();
		async function check (count: number): Promise<void> {
			if (typeof table[internalProperties].options.waitForActive !== "boolean") {
				try {
					// Normally we'd want to do `dynamodb.waitFor` here, but since it doesn't work with tables that are being updated we can't use it in this case
					const tableDetails = (await getTableDetails(table, {"forceRefresh": forceRefreshOnFirstAttempt === true ? forceRefreshOnFirstAttempt : count > 0})).Table;
					if (tableDetails.TableStatus === "ACTIVE" && (tableDetails.GlobalSecondaryIndexes ?? []).every((val) => val.IndexStatus === "ACTIVE")) {
						return resolve();
					}
				} catch (e) {
					return reject(e);
				}

				if (count > 0) {
					table[internalProperties].options.waitForActive.check.frequency === 0 ? await utils.set_immediate_promise() : await utils.timeout(table[internalProperties].options.waitForActive.check.frequency);
				}
				if (Date.now() - start >= table[internalProperties].options.waitForActive.check.timeout) {
					return reject(new CustomError.WaitForActiveTimeout(`Wait for active timed out after ${Date.now() - start} milliseconds.`));
				} else {
					check(++count);
				}
			}
		}
		check(0);
	});
}
export async function updateTable (table: Table): Promise<void> {
	const updateAll = typeof table[internalProperties].options.update === "boolean" && table[internalProperties].options.update;
	// Throughput
	if (updateAll || (table[internalProperties].options.update as TableUpdateOptions[]).includes(TableUpdateOptions.throughput)) {
		const currentThroughput = (await getTableDetails(table)).Table;
		const expectedThroughput: any = utils.dynamoose.get_provisioned_throughput(table[internalProperties].options);
		const isThroughputUpToDate = expectedThroughput.BillingMode === (currentThroughput.BillingModeSummary || {}).BillingMode && expectedThroughput.BillingMode || (currentThroughput.ProvisionedThroughput || {}).ReadCapacityUnits === (expectedThroughput.ProvisionedThroughput || {}).ReadCapacityUnits && currentThroughput.ProvisionedThroughput.WriteCapacityUnits === expectedThroughput.ProvisionedThroughput.WriteCapacityUnits;

		if (!isThroughputUpToDate) {
			const object: DynamoDB.UpdateTableInput = {
				"TableName": table[internalProperties].name,
				...expectedThroughput
			};
			await ddb("updateTable", object);
			await waitForActive(table)();
		}
	}
	// Indexes
	if (updateAll || (table[internalProperties].options.update as TableUpdateOptions[]).includes(TableUpdateOptions.indexes)) {
		const tableDetails = await getTableDetails(table);
		const existingIndexes = tableDetails.Table.GlobalSecondaryIndexes;
		const updateIndexes = await utils.dynamoose.index_changes(table, existingIndexes);
		await updateIndexes.reduce(async (existingFlow, index) => {
			await existingFlow;
			const params: DynamoDB.UpdateTableInput = {
				"TableName": table[internalProperties].name
			};
			if (index.type === TableIndexChangeType.add) {
				params.AttributeDefinitions = (await table[internalProperties].getCreateTableAttributeParams()).AttributeDefinitions;
				params.GlobalSecondaryIndexUpdates = [{"Create": index.spec}];
			} else {
				params.GlobalSecondaryIndexUpdates = [{"Delete": {"IndexName": index.name}}];
			}
			await ddb("updateTable", params);
			await waitForActive(table)();
		}, Promise.resolve());
	}
	// Tags
	if (updateAll || (table[internalProperties].options.update as TableUpdateOptions[]).includes(TableUpdateOptions.tags)) {
		const currentTags = (await getTagDetails(table)).Tags;
		const expectedTags: {[key: string]: string} = table[internalProperties].options.tags;

		let tableDetails: DynamoDB.DescribeTableOutput;

		const tagsToDelete = currentTags.filter((tag) => expectedTags[tag.Key] !== tag.Value).map((tag) => tag.Key);
		if (tagsToDelete.length > 0) {
			tableDetails = await getTableDetails(table);
			await ddb("untagResource", {
				"ResourceArn": tableDetails.Table.TableArn,
				"TagKeys": tagsToDelete
			});
		}

		const tagsToAdd = Object.keys(expectedTags).filter((key) => tagsToDelete.includes(key) || !currentTags.some((tag) => tag.Key === key));
		if (tagsToAdd.length > 0) {
			tableDetails = tableDetails || await getTableDetails(table);
			await ddb("tagResource", {
				"ResourceArn": tableDetails.Table.TableArn,
				"Tags": tagsToAdd.map((key) => ({
					"Key": key,
					"Value": expectedTags[key]
				}))
			});
		}
	}
	// Table Class
	if (updateAll || (table[internalProperties].options.update as TableUpdateOptions[]).includes(TableUpdateOptions.tableClass)) {
		const tableDetails = (await getTableDetails(table)).Table;
		const expectedDynamoDBTableClass = table[internalProperties].options.tableClass === TableClass.infrequentAccess ? DynamoDB.TableClass.STANDARD_INFREQUENT_ACCESS : DynamoDB.TableClass.STANDARD;

		if (!tableDetails.TableClassSummary && expectedDynamoDBTableClass !== DynamoDB.TableClass.STANDARD || tableDetails.TableClassSummary && tableDetails.TableClassSummary.TableClass !== expectedDynamoDBTableClass) {
			const object: DynamoDB.UpdateTableInput = {
				"TableName": table[internalProperties].name,
				"TableClass": expectedDynamoDBTableClass
			};
			await ddb("updateTable", object);
			await waitForActive(table)();
		}
	}
}
