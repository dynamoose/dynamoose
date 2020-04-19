import ddb from "./aws/ddb/internal";
import CustomError from "./Error";
import utils from "./utils";
import Condition from "./Condition";
import {Model} from "./Model";
import {Document} from "./Document";

export type ConditionInitalizer = Condition | {[key: string]: any} | string;
interface DocumentRetrieverTypeInformation {
	type: string;
	pastTense: string;
}
// DocumentRetriever is used for both Scan and Query since a lot of the code is shared between the two
abstract class DocumentRetriever {
	internalSettings?: {
		model: Model<Document>;
		typeInformation: DocumentRetrieverTypeInformation;
	};
	settings: {
		condition: Condition;
		limit?: number;
		all?: {delay: number; max: number};
		startAt?: any;
		attributes?: string[];
		index?: string;
		consistent?: boolean;
		count?: boolean;
		parallel?: number;
	};
	getRequest: (this: DocumentRetriever) => Promise<any>;
	exec: (this: DocumentRetriever, callback?: any) => any;
	all: (this: DocumentRetriever, delay?: number, max?: number) => DocumentRetriever;

	constructor(model: Model<Document>, typeInformation: DocumentRetrieverTypeInformation, object?: ConditionInitalizer) {
		this.internalSettings = {model, typeInformation};

		let condition: Condition;
		try {
			condition = new Condition(object);
		} catch (e) {
			e.message = `${e.message.replace(" is invalid.", "")} is invalid for the ${this.internalSettings.typeInformation.type} operation.`;
			throw e;
		}

		this.settings = {
			"condition": condition
		};
	}
}
Object.entries(Condition.prototype).forEach((prototype) => {
	const [key, func] = prototype;
	if (key !== "requestObject") {
		DocumentRetriever.prototype[key] = function(this: DocumentRetriever, ...args): DocumentRetriever {
			func.bind(this.settings.condition)(...args);
			return this;
		};
	}
});

DocumentRetriever.prototype.getRequest = async function(this: DocumentRetriever): Promise<any> {
	const object: any = {
		...this.settings.condition.requestObject({"conditionString": "FilterExpression", "conditionStringType": "array"}),
		"TableName": this.internalSettings.model.name
	};

	if (this.settings.limit) {
		object.Limit = this.settings.limit;
	}
	if (this.settings.startAt) {
		object.ExclusiveStartKey = Document.isDynamoObject(this.settings.startAt) ? this.settings.startAt : this.internalSettings.model.Document.objectToDynamo(this.settings.startAt);
	}
	if (this.settings.attributes) {
		object.AttributesToGet = this.settings.attributes;
	}
	const indexes = await this.internalSettings.model.schema.getIndexes(this.internalSettings.model);
	if (this.settings.index) {
		object.IndexName = this.settings.index;
	} else if (this.internalSettings.typeInformation.type === "query") {
		const comparisonChart = this.settings.condition.settings.conditions.reduce((res, item) => {
			const myItem = Object.entries(item)[0];
			res[myItem[0]] = {"type": myItem[1].type};
			return res;
		}, {});
		const index = utils.array_flatten(Object.values(indexes)).find((index) => {
			const {hash/*, range*/} = index.KeySchema.reduce((res, item) => {
				res[item.KeyType.toLowerCase()] = item.AttributeName;
				return res;
			}, {});
			// TODO: we need to write logic here to prioritize indexes with a range key that is being queried.
			return (comparisonChart[hash] || {}).type === "EQ"/* && (!range || comparisonChart[range])*/;
		});
		if (!index) {
			if ((comparisonChart[this.internalSettings.model.schema.getHashKey()] || {}).type !== "EQ") {
				throw new CustomError.InvalidParameter("Index can't be found for query.");
			}
		} else {
			object.IndexName = index.IndexName;
		}
	}
	function moveParameterNames(val, prefix): void {
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
	if (this.internalSettings.typeInformation.type === "query") {
		const index = utils.array_flatten(Object.values(indexes)).find((index) => index.IndexName === object.IndexName);
		if (index) {
			const {hash, range} = index.KeySchema.reduce((res, item) => {
				res[item.KeyType.toLowerCase()] = item.AttributeName;
				return res;
			}, {});

			moveParameterNames(hash, "qh");
			if (range) {
				moveParameterNames(range, "qr");
			}
		} else {
			moveParameterNames(this.internalSettings.model.schema.getHashKey(), "qh");
			if (this.internalSettings.model.schema.getRangeKey()) {
				moveParameterNames(this.internalSettings.model.schema.getRangeKey(), "qr");
			}
		}
	}
	if (this.settings.consistent) {
		object.ConsistentRead = this.settings.consistent;
	}
	if (this.settings.count) {
		object.Select = "COUNT";
	}
	if (this.settings.parallel) {
		object.TotalSegments = this.settings.parallel;
	}

	if (object.FilterExpression) {
		object.FilterExpression = object.FilterExpression.join(" ");
	}
	if (object.FilterExpression === "") {
		delete object.FilterExpression;
	}

	return object;
};
DocumentRetriever.prototype.exec = function(this: DocumentRetriever, callback): Promise<any> | void {
	let timesRequested = 0;
	const prepareForReturn = async (result): Promise<any> => {
		if (Array.isArray(result)) {
			result = utils.merge_objects(...result);
		}
		if (this.settings.count) {
			return {
				"count": result.Count,
				[`${this.internalSettings.typeInformation.pastTense}Count`]: result[`${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}Count`]
			};
		}
		const array: any = (await Promise.all(result.Items.map(async (item) => await ((new this.internalSettings.model.Document(item, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"}))))).filter((a) => Boolean(a));
		array.lastKey = result.LastEvaluatedKey ? (Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => this.internalSettings.model.Document.fromDynamo(key)) : this.internalSettings.model.Document.fromDynamo(result.LastEvaluatedKey)) : undefined;
		array.count = result.Count;
		array[`${this.internalSettings.typeInformation.pastTense}Count`] = result[`${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}Count`];
		array[`times${utils.capitalize_first_letter(this.internalSettings.typeInformation.pastTense)}`] = timesRequested;
		return array;
	};
	const promise = this.internalSettings.model.pendingTaskPromise().then(() => this.getRequest()).then((request) => {
		const allRequest = (extraParameters = {}): any => {
			let promise = ddb(this.internalSettings.typeInformation.type, {...request, ...extraParameters});
			timesRequested++;

			if (this.settings.all) {
				promise = promise.then(async (result) => {
					if (this.settings.all.delay && this.settings.all.delay > 0) {
						await utils.timeout(this.settings.all.delay);
					}

					let lastKey = result.LastEvaluatedKey;
					let requestedTimes = 1;
					while (lastKey && (this.settings.all.max === 0 || requestedTimes < this.settings.all.max)) {
						if (this.settings.all.delay && this.settings.all.delay > 0) {
							await utils.timeout(this.settings.all.delay);
						}

						const nextRequest = await ddb(this.internalSettings.typeInformation.type, {...request, ...extraParameters, "ExclusiveStartKey": lastKey});
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

		if (this.settings.parallel) {
			return Promise.all(new Array(this.settings.parallel).fill(0).map((a, index) => allRequest({"Segment": index})));
		} else {
			return allRequest();
		}
	});

	// TODO: we do something similar to do this below in other functions as well (ex. get, save), where we allow a callback or a promise, we should figure out a way to make this code more DRY and have a standard way of doing this throughout Dynamoose
	if (callback) {
		promise.then((result) => prepareForReturn(result)).then((result) => callback(null, result)).catch((error) => callback(error));
	} else {
		return (async (): Promise<any> => {
			const result = await promise;
			const finalResult = await prepareForReturn(result);
			return finalResult;
		})();
	}
};
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
	DocumentRetriever.prototype[(item as SettingDefinition).name || (item as string)] = function(value): DocumentRetriever {
		const key: string = (item as SettingDefinition).settingsName || (item as SettingDefinition).name || (item as string);
		this.settings[key] = (item as SettingDefinition).boolean ? !this.settings[key] : value;
		return this;
	};
});
DocumentRetriever.prototype.all = function(this: DocumentRetriever, delay = 0, max = 0): DocumentRetriever {
	this.settings.all = {delay, max};
	return this;
};


export class Scan extends DocumentRetriever {
	parallel: (value: number) => Scan;

	constructor(model: Model<Document>, object?: ConditionInitalizer) {
		super(model, {"type": "scan", "pastTense": "scanned"}, object);
	}
}
Scan.prototype.parallel = function(value: number): Scan {
	this.settings.parallel = value;
	return this;
};

export class Query extends DocumentRetriever {
	constructor(model: Model<Document>, object?: ConditionInitalizer) {
		super(model, {"type": "query", "pastTense": "queried"}, object);
	}
}
