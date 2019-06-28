'use strict';
const Q = require('q');
const debug = require('debug')('dynamoose:scan');

const errors = require('./errors');

function Scan (Model, filter, options) {

  this.Model = Model;
  this.options = options || {'all': {'delay': 0, 'max': 1}};


  // [{
  //     name: 'name',
  //     values: ['value', ...],
  //     comparison: 'string'
  //   },
  //    ...
  // ]
  this.filters = {};
  this.buildState = false;
  this.validationError = null;
  if (typeof filter === 'string') {
    this.buildState = filter;
    this.filters[filter] = {'name': filter};
  } else if (typeof filter === 'object') {
    if (typeof filter.FilterExpression === 'string') {
      // if filter expression is given, just assign the filter
      this.filters = filter;
    } else {
      this.parseFilterObject(filter);
    }
  }
  Model._emit('model:scan', 'scan:called', {'event': {'scan': this}});
}


Scan.prototype.exec = async function (next) {
  debug('exec scan for ', this.scan);
  const that = this;
  this.Model._emit('model:scan', 'exec:start', {'event': {'scan': this, 'callback': next}, 'actions': {'updateCallback' (fn) { next = fn; }}});
  if (this.validationError) {
    if (next) {
      return next(this.validationError);
    }
    return Q.reject(this.validationError);
  }

  const {Model, options} = this;
  const Model$ = Model.$__;
  const {schema} = Model$;

  const deferredMain = Q.defer();

  let scanReq = { };

  async function toModel (item) {
    const model = new Model();
    model.$__.isNew = false;
    await schema.parseDynamo(model, item);

    debug('scan parsed model', model);

    return model;
  }

  function scanByRawFilter () {
    const deferred = Q.defer();
    const dbClient = Model.$__.base.documentClient();
    const DynamoDBSet = dbClient.createSet([1, 2, 3]).constructor;

    dbClient.scan(scanReq, (err, data) => {
      if (err) {
        return deferred.reject(err);
      }
      if (!data) {
        return deferred.resolve([]);
      }
      if (!data.Items) {
        const counts = {'count': data.Count, 'scannedCount': data.ScannedCount};
        return deferred.resolve(counts);
      }
      const returnItems = data.Items.map((item) => {
        Object.keys(item).forEach((prop) => {
          if (item[prop] instanceof DynamoDBSet) {
            item[prop] = item[prop].values;
          }
        });

        const model = new Model(item);
        model.$__.isNew = false;
        debug('scan parsed model', model);
        return model;
      }).filter((item) => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date()));

      returnItems.lastKey = data.LastEvaluatedKey;
      returnItems.count = data.Count;
      returnItems.scannedCount = data.ScannedCount;
      return deferred.resolve(returnItems);

    });

    return deferred.promise.nodeify(next);
  }

  if (this.filters && typeof this.filters.FilterExpression === 'string') {
    // use the raw aws filter, which needs to be composed by the developer
    scanReq = this.filters;
    if (!scanReq) {
      scanReq = {};
    }
    if (!scanReq.TableName) {
      scanReq.TableName = Model.$__.name;
    }

    // use the document client in aws-sdk
    return scanByRawFilter();

  }
  // default
  scanReq = {
    'TableName': Model.$__.name
  };

  if (Object.keys(this.filters).length > 0) {
    scanReq.ScanFilter = {};
    for (const name in this.filters) {
      const filter = this.filters[name];
      const filterAttr = schema.attributes[name];
      scanReq.ScanFilter[name] = {
        'AttributeValueList': [],
        'ComparisonOperator': filter.comparison
      };

      const isContains = filter.comparison === 'CONTAINS' || filter.comparison === 'NOT_CONTAINS';
      const isListContains = isContains && filterAttr.type.name === 'list';

      if (filter.values) {
        for (let i = 0; i < filter.values.length; i += 1) {
          const val = filter.values[i];
          scanReq.ScanFilter[name].AttributeValueList.push(
            isListContains ? await filterAttr.attributes[0].toDynamo(val, true, Model, {'updateTimestamps': false}) : await filterAttr.toDynamo(val, true, Model, {'updateTimestamps': false})
          );
        }
      }
    }
  }

  if (options.attributes) {
    scanReq.AttributesToGet = options.attributes;
  }

  if (options.count) {
    scanReq.Select = 'COUNT';
  }

  if (options.counts) {
    scanReq.Select = 'COUNT';
  }

  if (options.limit) {
    scanReq.Limit = options.limit;
  }

  if (options.parallel) {
    scanReq.TotalSegments = options.parallel;
  }

  if (Array.isArray(options.ExclusiveStartKey)) {
    scanReq.TotalSegments = options.ExclusiveStartKey.length;
  } else if (options.ExclusiveStartKey) {
    options.ExclusiveStartKey = [options.ExclusiveStartKey];
  }


  if (options.conditionalOperator) {
    scanReq.ConditionalOperator = options.conditionalOperator;
  }

  if (options.consistent) {
    scanReq.ConsistentRead = true;
  }

  if (options.indexName) {
    debug('using index: %s', this.options.indexName);
    scanReq.IndexName = this.options.indexName;
  }


  function scanSegment (segment) {
    const deferred = Q.defer();

    let scanOneReq = {...scanReq};

    if (scanOneReq.TotalSegments) {
      scanOneReq.Segment = segment;
    }

    if (options.ExclusiveStartKey) {
      scanOneReq.ExclusiveStartKey = options.ExclusiveStartKey[segment];
    }

    debug('adding scan segement', scanOneReq);

    let lastKey, models = {}, scannedCount = 0, timesScanned = 0, totalCount = 0;
    if (!options.all) {
      options.all = {'delay': 0, 'max': 1};
    }
    async function scanOne () {
      debug('scan request', scanOneReq);
      const shouldContinueRequestPre = await that.Model._emit('model:scan', 'request:pre', {'event': {'scan': that, 'callback': next, 'scanReq': scanOneReq}, 'actions': {'updateScanReq' (req) { scanOneReq = req; }}}, deferredMain);
      if (shouldContinueRequestPre === false) { return; }
      that.Model.$__.base.ddb().scan(scanOneReq, async (err, data) => {
        const shouldContinueRequestPost = await Model._emit('model:scan', 'request:post', {'event': {'scan': that, 'callback': next, data, 'error': err}, 'actions': {'updateError' (error) { err = error; }, 'updateData' (myData) { data = myData; }}}, deferredMain);
        if (shouldContinueRequestPost === false) { return; }
        if (err) {
          debug('Error returned by scan', err);
          return deferred.reject(err);
        }
        debug('scan response', data);

        if (!Object.keys(data).length) {
          return deferred.resolve();
        }

        try {
          if (options.count) {
            return deferred.resolve(data.Count);
          }
          if (options.counts) {
            const counts = {'count': data.Count, 'scannedCount': data.ScannedCount};
            return deferred.resolve(counts);
          }
          if (data.Items !== undefined) {
            if (!models.length || models.length === 0) {
              models = await Promise.all(data.Items.map(toModel));
            } else {
              const tmp = await Promise.all(data.Items.map(toModel));
              models = models.concat(tmp);
            }

            if (options.one) {
              if (!models || models.length === 0) {
                return deferred.resolve();
              }
              return deferred.resolve(models.filter((item) => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date()))[0]);
            }
            lastKey = data.LastEvaluatedKey;
          }
          totalCount += data.Count;
          scannedCount += data.ScannedCount;
          timesScanned += 1;

          if ((options.all.max === 0 || timesScanned < options.all.max) && lastKey) {
            // scan.all need to scan again
            scanOneReq.ExclusiveStartKey = lastKey;
            setTimeout(scanOne, options.all.delay);
          } else {
            models = models.filter((item) => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date()));

            // completed scan returning models
            models.lastKey = lastKey;
            models.count = totalCount;
            models.scannedCount = scannedCount;
            models.timesScanned = timesScanned;
            deferred.resolve(models);
          }
        } catch (resultError) {
          deferred.reject(resultError);
        }
      });
    }
    scanOne();

    return deferred.promise;
  }


  function scan () {
    const totalSegments = scanReq.TotalSegments || 1;
    const scans = [];
    for (let segment = 0; segment < totalSegments; segment += 1) {
      scans.push(scanSegment(segment));
    }
    Q.all(scans)
      .then((results) => {
        let models = results.reduce((a, b) => a.concat(b), []);
        models = models.filter((item) => !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date()));
        const lastKeys = results.map((r) => r.lastKey);

        if (lastKeys.length === 1) {
          [models.lastKey] = lastKeys;
        } else if (lastKeys.filter((v) => v).length !== 0) {
          models.lastKey = lastKeys;
        }


        models.count = results.reduce((acc, r) => acc + r.count, 0);
        models.scannedCount = results.reduce((acc, r) => acc + r.scannedCount, 0);
        models.timesScanned = results.reduce((acc, r) => acc + r.timesScanned, 0);
        deferredMain.resolve(models);

      })
      .fail((err) => {
        deferredMain.reject(err);
      });

    return deferredMain.promise.nodeify(next);

  }

  if (Model$.options.waitForActive) {
    return Model$.table.waitForActive().then(scan).catch((err) => {
      if (next) {
        return next(err);
      }
      return Q.reject(err);
    });
  }

  return scan();
};

Scan.prototype.parseFilterObject = function (filter) {

  if (Object.keys(filter).length > 0) {

    for (const filterName in filter) {
      if (Object.prototype.hasOwnProperty.call(filter, filterName)) {
        // Parse AND OR
        if (filterName === 'and' || filterName === 'or') {

          this[filterName]();
          for (const condition in filter[filterName]) {
            if (Object.prototype.hasOwnProperty.call(filter[filterName], condition)) {
              this.parseFilterObject(filter[filterName][condition]);
            }
          }
        } else {

          this.where(filterName);
          let comp, val;

          if (typeof filter[filterName] === 'object' && Object.keys(filter[filterName]).length === 1) {

            [comp] = Object.keys(filter[filterName]);

            if (comp === 'null') {
              if (!filter[filterName][comp]) {
                comp = 'not_null';
              }
              val = [null];
            } else if (comp === 'in' || comp === 'between') {
              val = filter[filterName][comp];
            } else {
              val = [filter[filterName][comp]];
            }

          } else {
            comp = 'eq';
            val = [filter[filterName]];
          }
          this.compVal(val, comp.toUpperCase());
        }


      }
    }
  }
};

Scan.prototype.and = function () {
  this.options.conditionalOperator = 'AND';
  return this;
};

Scan.prototype.or = function () {
  this.options.conditionalOperator = 'OR';
  return this;
};

Scan.prototype.consistent = function () {
  this.options.consistent = true;
  return this;
};

Scan.prototype.where = function (filter) {
  if (this.validationError) {
    return this;
  }

  if (this.buildState) {
    this.validationError = new errors.ScanError('Invalid scan state; where() must follow comparison');
    return this;
  }
  if (typeof filter === 'string') {
    this.buildState = filter;
    if (this.filters[filter]) {
      this.validationError = new errors.ScanError('Invalid scan state; %s can only be used once', filter);
      return this;
    }
    this.filters[filter] = {'name': filter};
  }

  return this;
};
Scan.prototype.filter = Scan.prototype.where;

Scan.prototype.compVal = function (vals, comp) {
  if (this.validationError) {
    return this;
  }

  const permittedComparison =
  [
    'NOT_NULL', 'NULL', 'EQ', 'NE', 'GE', 'LT', 'GT', 'LE', 'GE',
    'NOT_CONTAINS', 'CONTAINS', 'BEGINS_WITH', 'IN', 'BETWEEN'
  ];


  if (!this.buildState) {
    this.validationError = new errors.ScanError('Invalid scan state; %s must follow scan(), where(), or filter()', comp);
    return this;
  }

  if (permittedComparison.indexOf(comp) === -1) {
    this.validationError = new errors.ScanError('Invalid comparison %s', comp);
    return this;
  }

  this.filters[this.buildState].values = vals;
  this.filters[this.buildState].comparison = comp;

  this.buildState = false;
  this.notState = false;

  return this;
};


Scan.prototype.not = function () {
  this.notState = true;
  return this;
};

Scan.prototype.null = function () {
  if (this.notState) {
    return this.compVal(null, 'NOT_NULL');
  }
  return this.compVal(null, 'NULL');

};


Scan.prototype.eq = function (val) {

  if (val === '' || val === null || val === undefined) {
    return this.null();
  }
  if (this.notState) {
    return this.compVal([val], 'NE');
  }
  return this.compVal([val], 'EQ');

};


Scan.prototype.lt = function (val) {
  if (this.notState) {
    return this.compVal([val], 'GE');
  }
  return this.compVal([val], 'LT');

};

Scan.prototype.le = function (val) {
  if (this.notState) {
    return this.compVal([val], 'GT');
  }
  return this.compVal([val], 'LE');

};

Scan.prototype.ge = function (val) {
  if (this.notState) {
    return this.compVal([val], 'LT');
  }
  return this.compVal([val], 'GE');

};

Scan.prototype.gt = function (val) {
  if (this.notState) {
    return this.compVal([val], 'LE');
  }
  return this.compVal([val], 'GT');

};

Scan.prototype.contains = function (val) {
  if (this.notState) {
    return this.compVal([val], 'NOT_CONTAINS');
  }
  return this.compVal([val], 'CONTAINS');

};

Scan.prototype.beginsWith = function (val) {
  if (this.validationError) {
    return this;
  }
  if (this.notState) {
    this.validationError = new errors.ScanError('Invalid scan state: beginsWith() cannot follow not()');
    return this;
  }
  return this.compVal([val], 'BEGINS_WITH');
};

Scan.prototype.in = function (vals) {
  if (this.validationError) {
    return this;
  }
  if (this.notState) {
    this.validationError = new errors.ScanError('Invalid scan state: in() cannot follow not()');
    return this;
  }

  return this.compVal(vals, 'IN');
};

Scan.prototype.between = function (a, b) {
  if (this.validationError) {
    return this;
  }
  if (this.notState) {
    this.validationError = new errors.ScanError('Invalid scan state: between() cannot follow not()');
    return this;
  }
  return this.compVal([a, b], 'BETWEEN');
};

Scan.prototype.limit = function (limit) {
  this.options.limit = limit;
  return this;
};

Scan.prototype.startAt = function (key) {
  this.options.ExclusiveStartKey = key;
  return this;
};

Scan.prototype.attributes = function (attributes) {
  this.options.attributes = attributes;
  return this;
};

Scan.prototype.count = function () {
  this.options.count = true;
  this.options.select = 'COUNT';
  return this;
};

Scan.prototype.counts = function () {
  this.options.counts = true;
  this.options.select = 'COUNT';
  return this;
};

Scan.prototype.using = function (indexName) {
  this.options.indexName = indexName;
  return this;
};

Scan.prototype.all = function (delay, max) {
  delay = delay || 1000;
  max = max || 0;
  this.options.all = {delay, max};
  return this;
};

Scan.prototype.parallel = function (numberOfSegments) {
  this.options.parallel = numberOfSegments;
  return this;
};

module.exports = Scan;
