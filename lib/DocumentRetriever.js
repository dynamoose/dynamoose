const aws = require("./aws");
const Error = require("./Error");
const utils = require("./utils");

// DocumentRetriever is used for both Scan and Query since a lot of the code is shared between the two

const documentRetrieverTypes = [
	{"type": "scan", "pastTense": "scanned"},
	{"type": "query", "pastTense": "queried"}
];

function main(documentRetrieverTypeString) {
	const documentRetrieverType = documentRetrieverTypes.find((a) => a.type === documentRetrieverTypeString);

	if (!documentRetrieverType) {
		throw new Error.InvalidType(`The type: ${documentRetrieverTypeString} for setting up a document retriever is invalid.`);
	}

	function Carrier(model) {
		let C = class {
			constructor(object) {
				this.settings = {};
				this.settings.filters = {};
				this.settings.limit = null;
				this.settings.pending = {}; // represents the pending chain of filter data waiting to be attached to the `filters` parameter. For example, storing the key before we know what the comparison operator is.

				if (typeof object === "object") {
					Object.keys(object).forEach((key) => {
						const type = Object.keys(object[key])[0];
						const filterType = filterTypes.find((item) => item.name === type);

						if (!filterType) {
							throw new Error.InvalidFilterComparison(`The type: ${type} is invalid for the ${documentRetrieverType.type} operation.`);
						}

						this.settings.filters[key] = {"type": filterType.typeName, "value": object[key][type]};
					});
				} else if (object) {
					this.settings.pending.key = object;
					if (documentRetrieverType.type === "query") {
						this.settings.pending.queryCondition = "hash";
					}
				}

				return this;
			}
		};
		C.prototype[`get${utils.capitalize_first_letter(documentRetrieverType.type)}Request`] = async function() {
			const object = {
				"TableName": model.name
			};
			if (documentRetrieverType.type === "query") {
				object.KeyConditionExpression = "#qha = :qhv";
			}

			Object.keys(this.settings.filters).forEach((key, index) => {
				if (!object.ExpressionAttributeNames || !object.ExpressionAttributeValues) {
					object.ExpressionAttributeNames = {};
					object.ExpressionAttributeValues = {};
				}

				const filter = this.settings.filters[key];
				const value = filter.value;
				// if (!Array.isArray(value)) {
				// 	value = [value];
				// }
				// value = value.map((item) => aws.converter().input(item));
				// object[filter.queryCondition ? "KeyConditions" : `${utils.capitalize_first_letter(documentRetrieverType.type)}Filter`][key] = {
				// 	"ComparisonOperator": filter.type,
				// 	"AttributeValueList": value
				// };
				let keys = {"name": `#a${index}`, "value": `:v${index}`};
				if (filter.queryCondition === "hash") {
					keys = {"name": "#qha", "value": ":qhv"};
				} else if (filter.queryCondition === "range") {
					keys = {"name": "#qra", "value": ":qrv"};
				}
				object.ExpressionAttributeNames[keys.name] = key;
				object.ExpressionAttributeValues[keys.value] = aws.converter().input(value);

				if (!filter.queryCondition) {
					if (!object.FilterExpression) {
						object.FilterExpression = "";
					}
					if (object.FilterExpression !== "") {
						object.FilterExpression = `${object.FilterExpression} AND `;
					}

					let expression = "";
					switch (filter.type) {
					case "EQ":
					case "NE":
						expression = `${keys.name} ${filter.type === "EQ" ? "=" : "<>"} ${keys.value}`;
						break;
					case "IN":
						delete object.ExpressionAttributeValues[keys.value];
						expression = `${keys.name} IN (${value.map((v, i) => `${keys.value}-${i + 1}`).join(", ")})`;
						value.forEach((valueItem, i) => {
							object.ExpressionAttributeValues[`${keys.value}-${i + 1}`] = aws.converter().input(valueItem);
						});
						break;
					case "GT":
					case "GE":
					case "LT":
					case "LE":
						expression = `${keys.name} ${filter.type.startsWith("G") ? ">" : "<"}${filter.type.endsWith("E") ? "=" : ""} ${keys.value}`;
						break;
					case "BETWEEN":
						expression = `${keys.name} BETWEEN ${keys.value}-1 AND ${keys.value}-2`;
						object.ExpressionAttributeValues[`${keys.value}-1`] = aws.converter().input(value[0]);
						object.ExpressionAttributeValues[`${keys.value}-2`] = aws.converter().input(value[1]);
						delete object.ExpressionAttributeValues[keys.value];
						break;
					case "CONTAINS":
					case "NOT_CONTAINS":
						expression = `${filter.type === "NOT_CONTAINS" ? "NOT " : ""}contains (${keys.name}, ${keys.value})`;
						break;
					case "BEGINS_WITH":
						expression = `begins_with (${keys.name}, ${keys.value})`;
						break;
					}
					object.FilterExpression = `${object.FilterExpression}${expression}`;
				} else if (filter.queryCondition === "range") {
					object.KeyConditionExpression = `${object.KeyConditionExpression} AND ${keys.name} = ${keys.value}`;
				}
			});
			if (this.settings.limit) {
				object.Limit = this.settings.limit;
			}
			if (this.settings.startAt) {
				object.ExclusiveStartKey = model.Document.isDynamoObject(this.settings.startAt) ? this.settings.startAt : model.Document.toDynamo(this.settings.startAt);
			}
			if (this.settings.attributes) {
				object.AttributesToGet = this.settings.attributes;
			}
			if (this.settings.index) {
				object.IndexName = this.settings.index;
			} else if (documentRetrieverType.type === "query") {
				const indexes = await model.schema.getIndexes();
				// TODO change `Array.prototype.concat.apply` to be a custom flatten function
				const preferredIndexes = Array.prototype.concat.apply([], Object.values(indexes)).filter((index) => Boolean(index.KeySchema.find((key) => key.AttributeName === object.ExpressionAttributeNames["#qha"] && key.KeyType === "HASH")));
				const index = !object.ExpressionAttributeNames["#qra"] ? preferredIndexes[0] : preferredIndexes.find((index) => Boolean(index.KeySchema.find((key) => key.AttributeName === object.ExpressionAttributeNames["#qra"] && key.KeyType === "RANGE")));
				object.IndexName = index.IndexName;
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

		const notComparisonTypes = (() => {
			const obj = {
				"EQ": "NE",
				"IN": null,
				"LE": "GT",
				"LT": "GE",
				"BETWEEN": null,
				"CONTAINS": "NOT_CONTAINS",
				"BEGINS_WITH": null
			};
			Object.keys(obj).forEach((key) => {
				const val = obj[key];
				if (val) {
					obj[val] = key;
				} else {
					obj[val] = null;
				}
			});
			return obj;
		})();

		function finalizePendingFilter(instance) {
			const pending = instance.settings.pending;

			if (pending.not === true) {
				if (notComparisonTypes[pending.type] === null) {
					throw new Error.InvalidFilterComparison(`${pending.type} can not follow not()`);
				}
				pending.type = notComparisonTypes[pending.type];
			}

			instance.settings.filters[pending.key] = {
				"type": pending.type,
				"value": pending.value
			};

			if (pending.queryCondition) {
				instance.settings.filters[pending.key].queryCondition = pending.queryCondition;
			}

			instance.settings.pending = {};
		}

		C.prototype.exec = function(callback) {
			let timesRequested = 0;
			const prepareForReturn = async (result) => {
				if (Array.isArray(result)) {
					result = utils.merge_objects(...result);
				}
				if (this.settings.count) {
					return {
						"count": result.Count,
						[`${documentRetrieverType.pastTense}Count`]: result[`${utils.capitalize_first_letter(documentRetrieverType.pastTense)}Count`]
					};
				}
				const array = (await Promise.all(result.Items.map(async (item) => await ((new model.Document(item, {"fromDynamo": true})).conformToSchema({"customTypesDynamo": true, "checkExpiredItem": true, "saveUnknown": true, "type": "fromDynamo"}))))).filter((a) => Boolean(a));
				array.lastKey = result.LastEvaluatedKey ? (Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => model.Document.fromDynamo(key)) : model.Document.fromDynamo(result.LastEvaluatedKey)) : undefined;
				array.count = result.Count;
				array[`${documentRetrieverType.pastTense}Count`] = result[`${utils.capitalize_first_letter(documentRetrieverType.pastTense)}Count`];
				array[`times${utils.capitalize_first_letter(documentRetrieverType.pastTense)}`] = timesRequested;
				return array;
			};
			const promise = model.pendingTaskPromise().then(() => this[`get${utils.capitalize_first_letter(documentRetrieverType.type)}Request`]()).then((request) => {
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
				return (async () => {
					const result = await promise;
					const finalResult = await prepareForReturn(result);
					return finalResult;
				})();
			}
		};
		C.prototype.and = function() { return this; };
		C.prototype.not = function() {
			this.settings.pending.not = !this.settings.pending.not;
			return this;
		};
		C.prototype.filter = function(key) {
			this.settings.pending = {key};
			return this;
		};
		if (documentRetrieverType.type === "scan") {
			C.prototype.where = C.prototype.filter;
		} else {
			C.prototype.where = function(key) {
				this.settings.pending = {key, "queryCondition": "range"};
				return this;
			};
		}
		const filterTypes = [
			{"name": "eq", "typeName": "EQ"},
			{"name": "lt", "typeName": "LT"},
			{"name": "le", "typeName": "LE"},
			{"name": "gt", "typeName": "GT"},
			{"name": "ge", "typeName": "GE"},
			{"name": "beginsWith", "typeName": "BEGINS_WITH"},
			{"name": "contains", "typeName": "CONTAINS"},
			{"name": "in", "typeName": "IN"},
			{"name": "between", "typeName": "BETWEEN", "multipleArguments": true}
		];
		filterTypes.forEach((item) => {
			C.prototype[item.name] = function(value) {
				if (!value && item.default) {
					return this[item.default.typeName](value);
				}
				if (this.settings.pending.queryCondition && item.name !== "eq") {
					throw new Error.InvalidParameter("Equals must follow range or hash key when querying data");
				}

				this.settings.pending.value = item.value || (item.multipleArguments ? [...arguments] : value);
				this.settings.pending.type = item.typeName;
				finalizePendingFilter(this);
				return this;
			};
		});
		const settings = [
			"limit",
			"startAt",
			"attributes",
			{"name": "parallel", "only": ["scan"]},
			{"name": "count", "boolean": true},
			{"name": "consistent", "boolean": true},
			{"name": "using", "settingsName": "index"}
		];
		settings.forEach((item) => {
			if (!item.only || item.only.includes(documentRetrieverType.type)) {
				C.prototype[item.name || item] = function(value) {
					const key = item.settingsName || item.name || item;
					this.settings[key] = item.boolean ? !this.settings[key] : value;
					return this;
				};
			}
		});
		C.prototype.all = function(delay = 0, max = 0) {
			this.settings.all = {delay, max};
			return this;
		};

		Object.defineProperty (C, "name", {"value": utils.capitalize_first_letter(documentRetrieverType.type)});
		return C;
	}

	return Carrier;
}

module.exports = main;
