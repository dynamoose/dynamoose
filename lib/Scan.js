const aws = require("./aws");
const Error = require("./Error");
const utils = require("./utils");

function ScanCarrier(model) {
	class Scan {
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
						throw new Error.InvalidFilterComparison(`The type: ${type} is invalid for the scan operation.`);
					}

					this.settings.filters[key] = {"type": filterType.typeName, "value": object[key][type]};
				});
			} else if (object) {
				this.settings.pending.key = object;
			}

			return this;
		}
	}
	Scan.prototype.getScanRequest = function() {
		const object = {
			"TableName": model.name,
			"ScanFilter": {}
		};

		Object.keys(this.settings.filters).forEach((key) => {
			let value = this.settings.filters[key].value;
			if (!Array.isArray(value)) {
				value = [value];
			}
			value = value.map((item) => aws.converter().input(item));
			object.ScanFilter[key] = {
				"ComparisonOperator": this.settings.filters[key].type,
				"AttributeValueList": value
			};
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
			"NULL": "NOT_NULL",
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

	function finalizePendingFilter(scan) {
		const pending = scan.settings.pending;

		if (pending.not === true) {
			if (notComparisonTypes[pending.type] === null) {
				throw new Error.InvalidFilterComparison(`${pending.type} can not follow not()`);
			}
			pending.type = notComparisonTypes[pending.type];
		}

		scan.settings.filters[pending.key] = {
			"type": pending.type,
			"value": pending.value
		};

		scan.settings.pending = {};
	}

	Scan.prototype.exec = function(callback) {
		let timesScanned = 0;
		const prepareForReturn = (result) => {
			if (Array.isArray(result)) {
				result = utils.merge_objects(...result);
			}
			if (this.settings.count) {
				return {
					"count": result.Count,
					"scannedCount": result.ScannedCount
				};
			}
			const array = result.Items.map((item) => new model.Document(item));
			array.lastKey = result.LastEvaluatedKey ? (Array.isArray(result.LastEvaluatedKey) ? result.LastEvaluatedKey.map((key) => model.Document.fromDynamo(key)) : model.Document.fromDynamo(result.LastEvaluatedKey)) : undefined;
			array.count = result.Count;
			array.scannedCount = result.ScannedCount;
			array.timesScanned = timesScanned;
			return array;
		};
		const promise = model.pendingTaskPromise().then(() => {
			const ddb = aws.ddb();
			const request = this.getScanRequest();

			const allScan = (extraParameters = {}) => {
				let promise = ddb.scan({...request, ...extraParameters}).promise();
				timesScanned++;

				if (this.settings.all) {
					promise = promise.then(async (result) => {
						if (this.settings.all.delay && this.settings.all.delay > 0) {
							await utils.timeout(this.settings.all.delay);
						}

						let lastKey = result.LastEvaluatedKey;
						let scannedTimes = 1;
						while (lastKey && (this.settings.all.max === 0 || scannedTimes < this.settings.all.max)) {
							if (this.settings.all.delay && this.settings.all.delay > 0) {
								await utils.timeout(this.settings.all.delay);
							}

							const nextScan = await ddb.scan({...request, ...extraParameters, "ExclusiveStartKey": lastKey}).promise();
							timesScanned++;
							result = utils.merge_objects(result, nextScan);
							result.LastEvaluatedKey = nextScan.LastEvaluatedKey;
							lastKey = nextScan.LastEvaluatedKey;
							scannedTimes++;
						}

						return result;
					});
				}

				return promise;
			};

			if (this.settings.parallel) {
				return Promise.all(new Array(this.settings.parallel).fill(0).map((a, index) => allScan({"Segment": index})));
			} else {
				return allScan();
			}
		});

		// TODO: we do something similar to do this below in other functions as well (ex. get, save), where we allow a callback or a promise, we should figure out a way to make this code more DRY and have a standard way of doing this throughout Dynamoose
		if (callback) {
			promise.then((result) => callback(null, prepareForReturn(result))).catch((error) => callback(error));
		} else {
			return (async () => {
				const result = await promise;
				return prepareForReturn(result);
			})();
		}
	};
	Scan.prototype.and = function() { return this; };
	Scan.prototype.not = function() {
		this.settings.pending.not = !this.settings.pending.not;
		return this;
	};
	Scan.prototype.where = Scan.prototype.filter = function(key) {
		this.settings.pending = {key};
		return this;
	};
	const filterTypes = [
		{"name": "null", "typeName": "NULL", "value": []},
		{"name": "eq", "typeName": "EQ", "default": {"typeName": "null"}},
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
		Scan.prototype[item.name] = function(value) {
			if (!value && item.default) {
				return this[item.default.typeName](value);
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
		"parallel",
		{"name": "count", "boolean": true},
		{"name": "consistent", "boolean": true},
		{"name": "using", "settingsName": "index"}
	];
	settings.forEach((item) => {
		Scan.prototype[item.name || item] = function(value) {
			const key = item.settingsName || item.name || item;
			this.settings[key] = item.boolean ? !this.settings[key] : value;
			return this;
		};
	});
	Scan.prototype.all = function(delay = 0, max = 0) {
		this.settings.all = {delay, max};
		return this;
	};

	return Scan;
}

module.exports = ScanCarrier;
