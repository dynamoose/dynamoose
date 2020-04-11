import aws from "./aws";
import CustomError from "./Error";
import utils from "./utils";
import Condition from "./Condition";


type ConditionInitalizer = Condition | {[key: string]: any} | string;


// DocumentRetriever is used for both Scan and Query since a lot of the code is shared between the two

const documentRetrieverTypes: {type: "scan" | "query"; pastTense: "scanned" | "queried"}[] = [
	{"type": "scan", "pastTense": "scanned"},
	{"type": "query", "pastTense": "queried"}
];
function main(documentRetrieverTypeString: "scan" | "query") {
	const documentRetrieverType = documentRetrieverTypes.find((a) => a.type === documentRetrieverTypeString);

	if (!documentRetrieverType) {
		throw new CustomError.InvalidType(`The type: ${documentRetrieverTypeString} for setting up a document retriever is invalid.`);
	}

	function Carrier(model) {
		class C {
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
			getRequest: (this: C) => Promise<any>;
			exec: (this: C, callback) => any;
			all: (this: C, delay?: number, max?: number) => C;

			constructor(object?: ConditionInitalizer) {
				let condition: Condition;
				try {
					condition = new Condition(object);
				} catch (e) {
					e.message = `${e.message.replace(" is invalid.", "")} is invalid for the ${documentRetrieverType.type} operation.`;
					throw e;
				}

				this.settings = {
					"condition": condition
				};

				return this;
			}
		}
		Object.entries(Condition.prototype).forEach((prototype) => {
			const [key, func] = prototype;
			if (key !== "requestObject") {
				C.prototype[key] = function(this: C, ...args): C {
					func.bind(this.settings.condition)(...args);
					return this;
				};
			}
		});
		C.prototype.getRequest = async function(this: C): Promise<any> {
			const object: any = {
				...this.settings.condition.requestObject({"conditionString": "FilterExpression"}),
				"TableName": model.name
			};

			if (this.settings.limit) {
				object.Limit = this.settings.limit;
			}
			if (this.settings.startAt) {
				object.ExclusiveStartKey = model.Document.isDynamoObject(this.settings.startAt) ? this.settings.startAt : model.Document.objectToDynamo(this.settings.startAt);
			}
			if (this.settings.attributes) {
				object.AttributesToGet = this.settings.attributes;
			}
			const indexes = await model.schema.getIndexes(model);
			if (this.settings.index) {
				object.IndexName = this.settings.index;
			} else if (documentRetrieverType.type === "query") {
				const comparisonChart = this.settings.condition.settings.conditions.reduce((res, item) => {
					const myItem = Object.entries(item)[0];
					res[myItem[0]] = {"type": myItem[1].type};
					return res;
				}, {});
				const index = utils.array_flatten(Object.values(indexes)).find((index) => {
					const {hash, range} = index.KeySchema.reduce((res, item) => {
						res[item.KeyType.toLowerCase()] = item.AttributeName;
						return res;
					}, {});
					return (comparisonChart[hash] || {}).type === "EQ" && (!range || !comparisonChart[range] || comparisonChart[range].type === "EQ");
				});
				if (!index) {
					throw new CustomError.InvalidParameter("Index can't be found for query.");
				}
				object.IndexName = index.IndexName;
			}
			function moveParameterNames(val, prefix): void {
				const entry = Object.entries(object.ExpressionAttributeNames).find((entry) => entry[1] === val);
				if (!entry) {
					return;
				}
				const [key, value] = entry;
				object.ExpressionAttributeNames[`#${prefix}a`] = value;
				delete object.ExpressionAttributeNames[key];

				const valueKey = key.replace("#a", ":v");
				object.ExpressionAttributeValues[`:${prefix}v`] = object.ExpressionAttributeValues[valueKey];
				delete object.ExpressionAttributeValues[valueKey];
				object.KeyConditionExpression = `${object.KeyConditionExpression || ""}${object.KeyConditionExpression ? " AND " : ""}#${prefix}a = :${prefix}v`;

				object.FilterExpression = object.FilterExpression.replace(`${key} = ${valueKey} AND `, "").replace(` AND ${key} = ${valueKey}`, "").replace(`${key} = ${valueKey}`, "");
			}
			if (documentRetrieverType.type === "query") {
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

					if (!object.FilterExpression) {
						delete object.FilterExpression;
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

			return object;
		};
		C.prototype.exec = function(this: C, callback): Promise<any> | void {
			let timesRequested = 0;
			const prepareForReturn = async (result): Promise<any> => {
				if (Array.isArray(result)) {
					result = utils.merge_objects(...result);
				}
				if (this.settings.count) {
					return {
						"count": result.Count,
						[`${documentRetrieverType.pastTense}Count`]: result[`${utils.capitalize_first_letter(documentRetrieverType.pastTense)}Count`]
					};
				}
				const array: any = (await Promise.all(result.Items.map(async (item) => await ((new model.Document(item, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "modifiers": ["get"], "type": "fromDynamo"}))))).filter((a) => Boolean(a));
				array.lastKey = result.LastEvaluatedKey ? (Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => model.Document.fromDynamo(key)) : model.Document.fromDynamo(result.LastEvaluatedKey)) : undefined;
				array.count = result.Count;
				array[`${documentRetrieverType.pastTense}Count`] = result[`${utils.capitalize_first_letter(documentRetrieverType.pastTense)}Count`];
				array[`times${utils.capitalize_first_letter(documentRetrieverType.pastTense)}`] = timesRequested;
				return array;
			};
			const promise = model.pendingTaskPromise().then(() => this.getRequest()).then((request) => {
				const ddb = aws.ddb();

				const allRequest = (extraParameters = {}) => {
					let promise = ddb[documentRetrieverType.type]({...request, ...extraParameters}).promise();
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

								const nextRequest = await ddb[documentRetrieverType.type]({...request, ...extraParameters, "ExclusiveStartKey": lastKey}).promise();
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
			only?: ("scan" | "query")[];
			boolean?: boolean;
			settingsName?: string;
		}
		const settings: (SettingDefinition | string)[] = [
			"limit",
			"startAt",
			"attributes",
			{"name": "parallel", "only": ["scan"]},
			{"name": "count", "boolean": true},
			{"name": "consistent", "boolean": true},
			{"name": "using", "settingsName": "index"}
		];
		settings.forEach((item) => {
			if (!(item as SettingDefinition).only || (item as SettingDefinition).only.includes(documentRetrieverType.type)) {
				C.prototype[(item as SettingDefinition).name || (item as string)] = function(value): C {
					const key: string = (item as SettingDefinition).settingsName || (item as SettingDefinition).name || (item as string);
					this.settings[key] = (item as SettingDefinition).boolean ? !this.settings[key] : value;
					return this;
				};
			}
		});
		C.prototype.all = function(this: C, delay = 0, max = 0): C {
			this.settings.all = {delay, max};
			return this;
		};

		Object.defineProperty(C, "name", {"value": utils.capitalize_first_letter(documentRetrieverType.type)});
		return C;
	}

	return Carrier;
}

export = main;
