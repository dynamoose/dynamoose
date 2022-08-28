import ddb from "./aws/ddb/internal";
import CustomError from "./Error";
import utils from "./utils";
import {Condition, ConditionInitializer, BasicOperators} from "./Condition";
import {Model} from "./Model";
import {Item} from "./Item";
import {CallbackType, ObjectType, ItemArray, SortOrder} from "./General";
import {PopulateItems} from "./Populate";
import Internal from "./Internal";
import {InternalPropertiesClass} from "./InternalPropertiesClass";
const {internalProperties} = Internal.General;

enum ItemRetrieverTypes {
	scan = "scan",
	query = "query"
}
interface ItemRetrieverTypeInformation {
	type: ItemRetrieverTypes;
	pastTense: string;
}

interface ItemRetrieverInternalProperties {
	internalSettings: {
		model: Model<Item>;
		typeInformation: ItemRetrieverTypeInformation;
	};
	settings: {
		condition: Condition;
		sort?: SortOrder | `${SortOrder}`;
		parallel?: number;
		all?: {
			delay?: number;
			max?: number;
		};
		attributes?: string[];
		count?: number;
		consistent?: boolean;
		index?: string;
		startAt?: ObjectType;
		limit?: number;
	}
}

// ItemRetriever is used for both Scan and Query since a lot of the code is shared between the two
// type ItemRetriever = BasicOperators;
abstract class ItemRetriever extends InternalPropertiesClass<ItemRetrieverInternalProperties> {
	getRequest: (this: ItemRetriever) => Promise<any>;
	all: (this: ItemRetriever, delay?: number, max?: number) => this;
	limit: (this: ItemRetriever, value: number) => this;
	startAt: (this: ItemRetriever, value: ObjectType) => this;
	attributes: (this: ItemRetriever, value: string[]) => this;
	count: (this: ItemRetriever) => this;
	consistent: (this: ItemRetriever) => this;
	using: (this: ItemRetriever, value: string) => this ;
	exec (this: ItemRetriever, callback?: any): any {
		let timesRequested = 0;
		const {model} = this.getInternalProperties(internalProperties).internalSettings;
		const table = model.getInternalProperties(internalProperties).table();
		const prepareForReturn = async (result): Promise<any> => {
			if (Array.isArray(result)) {
				result = utils.merge_objects(...result);
			}
			if (this.getInternalProperties(internalProperties).settings.count) {
				return {
					"count": result.Count,
					[`${this.getInternalProperties(internalProperties).internalSettings.typeInformation.pastTense}Count`]: result[`${utils.capitalize_first_letter(this.getInternalProperties(internalProperties).internalSettings.typeInformation.pastTense)}Count`]
				};
			}
			const array: any = (await Promise.all(result.Items.map(async (item) => await new model.Item(item, {"type": "fromDynamo"}).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo", "mapAttributes": true})))).filter((a) => Boolean(a));
			array.lastKey = result.LastEvaluatedKey ? Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => model.Item.fromDynamo(key)) : model.Item.fromDynamo(result.LastEvaluatedKey) : undefined;
			array.count = result.Count;
			array[`${this.getInternalProperties(internalProperties).internalSettings.typeInformation.pastTense}Count`] = result[`${utils.capitalize_first_letter(this.getInternalProperties(internalProperties).internalSettings.typeInformation.pastTense)}Count`];
			array[`times${utils.capitalize_first_letter(this.getInternalProperties(internalProperties).internalSettings.typeInformation.pastTense)}`] = timesRequested;
			array["populate"] = PopulateItems;
			array["toJSON"] = utils.dynamoose.itemToJSON;
			return array;
		};
		const promise = table.getInternalProperties(internalProperties).pendingTaskPromise().then(() => this.getRequest()).then((request) => {
			const allRequest = (extraParameters = {}): any => {
				let promise: Promise<any> = ddb(table.getInternalProperties(internalProperties).instance, this.getInternalProperties(internalProperties).internalSettings.typeInformation.type as any, {...request, ...extraParameters});
				timesRequested++;

				if (this.getInternalProperties(internalProperties).settings.all) {
					promise = promise.then(async (result) => {
						if (this.getInternalProperties(internalProperties).settings.all.delay && this.getInternalProperties(internalProperties).settings.all.delay > 0) {
							await utils.timeout(this.getInternalProperties(internalProperties).settings.all.delay);
						}

						let lastKey = result.LastEvaluatedKey;
						let requestedTimes = 1;
						while (lastKey && (this.getInternalProperties(internalProperties).settings.all.max === 0 || requestedTimes < this.getInternalProperties(internalProperties).settings.all.max)) {
							if (this.getInternalProperties(internalProperties).settings.all.delay && this.getInternalProperties(internalProperties).settings.all.delay > 0) {
								await utils.timeout(this.getInternalProperties(internalProperties).settings.all.delay);
							}

							const nextRequest: any = await ddb(table.getInternalProperties(internalProperties).instance, this.getInternalProperties(internalProperties).internalSettings.typeInformation.type as any, {...request, ...extraParameters, "ExclusiveStartKey": lastKey});
							timesRequested++;
							result = utils.merge_objects(result, nextRequest);
							// The operation below is safe because right above we are overwriting the entire `result` variable, so there is no chance it'll be reassigned based on an outdated value since it's already been overwritten. There might be a better way to do this than ignoring the rule on the line below.
							result.LastEvaluatedKey = nextRequest.LastEvaluatedKey; // eslint-disable-line require-atomic-updates
							lastKey = nextRequest.LastEvaluatedKey;
							requestedTimes++;
						}

						return result;
					});
				}

				return promise;
			};

			if (this.getInternalProperties(internalProperties).settings.parallel) {
				return Promise.all(new Array(this.getInternalProperties(internalProperties).settings.parallel).fill(0).map((a, index) => allRequest({"Segment": index})));
			} else {
				return allRequest();
			}
		});

		if (callback) {
			promise.then((result) => prepareForReturn(result)).then((result) => callback(null, result)).catch((error) => callback(error));
		} else {
			return (async (): Promise<any> => {
				const result = await promise;
				const finalResult = await prepareForReturn(result);
				return finalResult;
			})();
		}
	}

	constructor (model: Model<Item>, typeInformation: ItemRetrieverTypeInformation, object?: ConditionInitializer) {
		super();

		let condition: Condition;
		try {
			condition = new Condition(object);
		} catch (e) {
			e.message = `${e.message.replace(" is invalid.", "")} is invalid for the ${typeInformation.type} operation.`;
			throw e;
		}

		this.setInternalProperties(internalProperties, {
			"internalSettings": {
				model,
				typeInformation
			},
			"settings": {
				condition
			}
		});
	}
}
Object.getOwnPropertyNames(Condition.prototype).forEach((key: string) => {
	if (!["requestObject", "constructor"].includes(key)) {
		ItemRetriever.prototype[key] = function (this: ItemRetriever, ...args): ItemRetriever {
			Condition.prototype[key].bind(this.getInternalProperties(internalProperties).settings.condition)(...args);
			return this;
		};
	}
});

ItemRetriever.prototype.getRequest = async function (this: ItemRetriever): Promise<any> {
	const {model} = this.getInternalProperties(internalProperties).internalSettings;
	const table = model.getInternalProperties(internalProperties).table();

	const object: any = {
		...await this.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).requestObject(model, {"conditionString": "FilterExpression", "conditionStringType": "array"}),
		"TableName": table.getInternalProperties(internalProperties).name
	};

	if (this.getInternalProperties(internalProperties).settings.limit) {
		object.Limit = this.getInternalProperties(internalProperties).settings.limit;
	}
	if (this.getInternalProperties(internalProperties).settings.startAt) {
		object.ExclusiveStartKey = Item.isDynamoObject(this.getInternalProperties(internalProperties).settings.startAt) ? this.getInternalProperties(internalProperties).settings.startAt : model.Item.objectToDynamo(this.getInternalProperties(internalProperties).settings.startAt);
	}
	const indexes = await model.getInternalProperties(internalProperties).getIndexes();
	if (this.getInternalProperties(internalProperties).settings.index) {
		object.IndexName = this.getInternalProperties(internalProperties).settings.index;
	} else if (this.getInternalProperties(internalProperties).internalSettings.typeInformation.type === "query") {
		const comparisonChart = await this.getInternalProperties(internalProperties).settings.condition.getInternalProperties(internalProperties).comparisonChart(model);

		const indexSpec = utils.find_best_index(indexes, comparisonChart);
		if (!indexSpec.tableIndex) {
			if (!indexSpec.indexName) {
				throw new CustomError.InvalidParameter("Index can't be found for query.");
			}

			object.IndexName = indexSpec.indexName;
		}
	}
	function moveParameterNames (val, prefix): void {
		const entry = Object.entries(object.ExpressionAttributeNames).find((entry) => entry[1] === val);
		if (!entry) {
			return;
		}
		const [key, value] = entry;
		const filterExpressionIndex = object.FilterExpression.findIndex((item) => item.includes(key));
		const filterExpression = object.FilterExpression[filterExpressionIndex];
		if (filterExpression.includes("attribute_exists") || filterExpression.includes("contains")) {
			return;
		}
		object.ExpressionAttributeNames[`#${prefix}a`] = value;
		delete object.ExpressionAttributeNames[key];

		const valueKey = key.replace("#a", ":v");

		Object.keys(object.ExpressionAttributeValues).filter((key) => key.startsWith(valueKey)).forEach((key) => {
			object.ExpressionAttributeValues[key.replace(new RegExp(":v\\d"), `:${prefix}v`)] = object.ExpressionAttributeValues[key];
			delete object.ExpressionAttributeValues[key];
		});
		const newExpression = filterExpression.replace(key, `#${prefix}a`).replace(new RegExp(valueKey, "g"), `:${prefix}v`);

		object.KeyConditionExpression = `${object.KeyConditionExpression || ""}${object.KeyConditionExpression ? " AND " : ""}${newExpression}`;
		utils.object.delete(object.FilterExpression, filterExpressionIndex);
		const previousElementIndex = filterExpressionIndex === 0 ? 0 : filterExpressionIndex - 1;
		if (object.FilterExpression[previousElementIndex] === "AND") {
			utils.object.delete(object.FilterExpression, previousElementIndex);
		}
	}
	if (this.getInternalProperties(internalProperties).internalSettings.typeInformation.type === "query") {
		const index = utils.array_flatten(Object.values(indexes)).find((index) => index.IndexName === object.IndexName) || indexes.TableIndex;
		const {hash, range} = index.KeySchema.reduce((res, item) => {
			res[item.KeyType.toLowerCase()] = item.AttributeName;
			return res;
		}, {});

		moveParameterNames(hash, "qh");
		if (range) {
			moveParameterNames(range, "qr");
		}
	}
	if (this.getInternalProperties(internalProperties).settings.consistent) {
		object.ConsistentRead = this.getInternalProperties(internalProperties).settings.consistent;
	}
	if (this.getInternalProperties(internalProperties).settings.count) {
		object.Select = "COUNT";
	}
	if (this.getInternalProperties(internalProperties).settings.parallel) {
		object.TotalSegments = this.getInternalProperties(internalProperties).settings.parallel;
	}
	if (this.getInternalProperties(internalProperties).settings.sort === SortOrder.descending) {
		object.ScanIndexForward = false;
	}
	if (this.getInternalProperties(internalProperties).settings.attributes) {
		if (!object.ExpressionAttributeNames) {
			object.ExpressionAttributeNames = {};
		}

		object.ProjectionExpression = this.getInternalProperties(internalProperties).settings.attributes.map((attribute) => {
			let expressionAttributeName = "";

			expressionAttributeName = (Object.entries(object.ExpressionAttributeNames).find((entry) => entry[1] === attribute) || [])[0];
			if (!expressionAttributeName) {
				const nextIndex = (Object.keys(object.ExpressionAttributeNames).map((item) => parseInt(item.replace("#a", ""))).filter((item) => !isNaN(item)).reduce((existing, item) => Math.max(item, existing), 0) || 0) + 1;
				expressionAttributeName = `#a${nextIndex}`;
				object.ExpressionAttributeNames[expressionAttributeName] = attribute;
			}

			return expressionAttributeName;
		}).sort().join(", ");
	}

	if (object.FilterExpression && Array.isArray(object.FilterExpression)) {
		object.FilterExpression = utils.dynamoose.convertConditionArrayRequestObjectToString(object.FilterExpression);
	}
	if (object.FilterExpression === "") {
		delete object.FilterExpression;
	}

	return object;
};
interface ItemRetrieverResponse<T> extends ItemArray<T> {
	lastKey?: ObjectType;
	count: number;
}
export interface ScanResponse<T> extends ItemRetrieverResponse<T> {
	scannedCount: number;
	timesScanned: number;
}
export interface QueryResponse<T> extends ItemRetrieverResponse<T> {
	queriedCount: number;
	timesQueried: number;
}
interface SettingDefinition {
	name: string;
	only?: string[];
	boolean?: boolean;
	settingsName?: string;
}
const settings: (SettingDefinition | string)[] = [
	"limit",
	"startAt",
	"attributes",
	{"name": "count", "boolean": true},
	{"name": "consistent", "boolean": true},
	{"name": "using", "settingsName": "index"}
];
settings.forEach((item) => {
	ItemRetriever.prototype[(item as SettingDefinition).name || (item as string)] = function (value): ItemRetriever {
		const key: string = (item as SettingDefinition).settingsName || (item as SettingDefinition).name || (item as string);
		this.getInternalProperties(internalProperties).settings[key] = (item as SettingDefinition).boolean ? !this.getInternalProperties(internalProperties).settings[key] : value;
		return this;
	};
});
ItemRetriever.prototype.all = function (this: ItemRetriever, delay = 0, max = 0): ItemRetriever {
	this.getInternalProperties(internalProperties).settings.all = {delay, max};
	return this;
};

export interface Scan<T> extends ItemRetriever, BasicOperators<Scan<T>> {
	exec(): Promise<ScanResponse<T>>;
	exec(callback: CallbackType<ScanResponse<T>, any>): void;
}

export class Scan<T> extends ItemRetriever {
	exec (callback?: CallbackType<ScanResponse<T>, any>): Promise<ScanResponse<T>> | void {
		return super.exec(callback);
	}

	parallel (value: number): Scan<T> {
		this.getInternalProperties(internalProperties).settings.parallel = value;
		return this;
	}

	constructor (model: Model<Item>, object?: ConditionInitializer) {
		super(model, {"type": ItemRetrieverTypes.scan, "pastTense": "scanned"}, object);
	}
}

export interface Query<T> extends ItemRetriever, BasicOperators<Query<T>> {
	exec(): Promise<QueryResponse<T>>;
	exec(callback: CallbackType<QueryResponse<T>, any>): void;
}

export class Query<T> extends ItemRetriever {
	exec (callback?: CallbackType<QueryResponse<T>, any>): Promise<QueryResponse<T>> | void {
		return super.exec(callback);
	}

	sort (order: SortOrder | `${SortOrder}`): Query<T> {
		this.getInternalProperties(internalProperties).settings.sort = order;
		return this;
	}

	constructor (model: Model<Item>, object?: ConditionInitializer) {
		super(model, {"type": ItemRetrieverTypes.query, "pastTense": "queried"}, object);
	}
}
