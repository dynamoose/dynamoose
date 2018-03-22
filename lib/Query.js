'use strict';
var Q = require('q');
var errors = require('./errors');
var debug = require('debug')('dynamoose:query');

function Query (Model, query, options) {
  this.Model = Model;
  this.options = options || {'all': {'delay': 0, 'max': 1}};


  // {
  //   hashKey: {
  //     name: 'name',
  //     value: 'value'
  //   },
  //   rangeKey: {
  //     name: 'name',
  //     value: 'value',
  //     comparison: 'string'
  //   }
  // }
  this.query = {hashKey: {}};

  this.filters = {};
  this.buildState = false;
  this.validationError = null;

  var hashKeyName, hashKeyVal;
  if(typeof query === 'string') {
    this.buildState = 'hashKey';
    this.query.hashKey.name = query;
  } else if (query.hash) {
    hashKeyName = Object.keys(query.hash)[0];
    hashKeyVal = query.hash[hashKeyName];
    if(hashKeyVal.eq !== null && hashKeyVal.eq !== undefined) {
      hashKeyVal = hashKeyVal.eq;
    }
    this.query.hashKey.name = hashKeyName;
    this.query.hashKey.value = hashKeyVal;

    if(query.range) {
      var rangeKeyName = Object.keys(query.range)[0];
      var rangeKeyVal = query.range[rangeKeyName];
      var rangeKeyComp = Object.keys(rangeKeyVal)[0];
      rangeKeyVal = rangeKeyVal[rangeKeyComp];
      this.query.rangeKey = {
        name: rangeKeyName,
        values: [rangeKeyVal],
        comparison: rangeKeyComp
      };
    }
  } else {
    hashKeyName = Object.keys(query)[0];
    hashKeyVal = query[hashKeyName];
    if(hashKeyVal.eq !== null && hashKeyVal.eq !== undefined) {
      hashKeyVal = hashKeyVal.eq;
    }
    this.query.hashKey.name = hashKeyName;
    this.query.hashKey.value = hashKeyVal;  }
}



Query.prototype.exec = function (next) {
  debug('exec query for ', this.query);
  if (this.validationError) {
    if (next) {
      next(this.validationError);
    }
    return Q.reject(this.validationError);
  }

  var Model = this.Model;
  var Model$ = Model.$__;
  var schema = Model$.schema;
  var options = this.options;

  debug('Query with schema', schema);

  var queryReq = {
    TableName: Model.$__.name,
    KeyConditions: {}
  };

  var indexName, index;
  // Check both hash key and range key in the query to see if they do not match
  // the hash and range key on the primary table.  If they don't match then we
  // can look for a secondary index to query.
  if(schema.hashKey.name !== this.query.hashKey.name ||
    (this.query.rangeKey && schema.rangeKey && schema.rangeKey.name !== this.query.rangeKey.name)) {
    debug('query is on global secondary index');
    for(indexName in schema.indexes.global) {
      index = schema.indexes.global[indexName];
      if(index.name === this.query.hashKey.name) {
        debug('using index', indexName);
        queryReq.IndexName = indexName;
        break;
      }
    }
  }

  var hashAttr = schema.attributes[this.query.hashKey.name];

  queryReq.KeyConditions[this.query.hashKey.name] = {
    AttributeValueList: [hashAttr.toDynamo(this.query.hashKey.value)],
    ComparisonOperator: 'EQ'
  };

  var i, val;

  if(this.query.rangeKey) {
    var rangeKey = this.query.rangeKey;
    var rangeAttr = schema.attributes[rangeKey.name];

    if(!queryReq.IndexName && schema.rangeKey.name !== rangeKey.name) {
      debug('query is on local secondary index');
      for(indexName in schema.indexes.local) {
        index = schema.indexes.local[indexName];
        if(index.name === rangeKey.name) {
          debug('using local index', indexName);
          queryReq.IndexName = indexName;
          break;
        }
      }
    }

    if(!rangeKey || rangeKey.values === undefined) {
      debug('No range key value (i.e. get all)');
    } else {
      debug('Range key: %s', rangeKey.name);
      var keyConditions = queryReq.KeyConditions[rangeKey.name] = {
        AttributeValueList: [],
        ComparisonOperator: rangeKey.comparison.toUpperCase()
      };
      for (i = 0; i < rangeKey.values.length; i++) {
        val = rangeKey.values [i];
        keyConditions.AttributeValueList.push(
          rangeAttr.toDynamo(val, true)
        );
      }
    }
  }

  // if the index name has been explicitly set via the api then let that override
  // anything that has been previously derived
  if(this.options.indexName){
    debug('forcing index: %s', this.options.indexName);
    queryReq.IndexName = this.options.indexName;
  }


  if(this.filters && Object.keys(this.filters).length > 0) {
    queryReq.QueryFilter = {};
    for(var name in this.filters) {
      debug('Filter on: %s', name);
      var filter = this.filters[name];
      var filterAttr = schema.attributes[name];
      queryReq.QueryFilter[name] = {
        AttributeValueList: [],
        ComparisonOperator: filter.comparison.toUpperCase()
      };

      var isContains = filter.comparison === 'CONTAINS' || filter.comparison === 'NOT_CONTAINS';
      var isListContains = isContains && filterAttr.type.name === 'list';

      if(filter.values) {
        for (i = 0; i < filter.values.length; i++) {
          val = filter.values[i];
          queryReq.QueryFilter[name].AttributeValueList.push(
            isListContains ? filterAttr.attributes[0].toDynamo(val, true) : filterAttr.toDynamo(val, true)
          );
        }
      }
    }
  }

  if(options.or) {
    queryReq.ConditionalOperator = 'OR'; // defualts to AND
  }

  if(options.attributes) {
    queryReq.AttributesToGet = options.attributes;
  }

  if(options.count) {
    queryReq.Select = 'COUNT';
  }

  if(options.counts) {
    queryReq.Select = 'COUNT';
  }

  if(options.consistent) {
    queryReq.ConsistentRead = true;
  }

  if(options.limit) {
    queryReq.Limit = options.limit;
  }

  if(options.one) {
    queryReq.Limit = 1;
  }

  if(options.descending) {
    queryReq.ScanIndexForward = false;
  }

  if(options.ExclusiveStartKey) {
    queryReq.ExclusiveStartKey = options.ExclusiveStartKey;
  }


  function query () {
    var deferred = Q.defer();

    if (!options.all) {
      options.all = {'delay': 0, 'max': 1};
    }

    var models = {}, totalCount = 0, scannedCount = 0, timesQueried = 0, lastKey;
    queryOne();

    function queryOne() {
      debug('DynamoDB Query: %j', queryReq);
      Model$.base.ddb().query(queryReq, function(err, data) {
        if(err) {
          debug('Error returned by query', err);
          return deferred.reject(err);
        }
        debug('DynamoDB Query Response: %j', data);

        if(!Object.keys(data).length) {
          return deferred.resolve();
        }

        function toModel (item) {
          var model = new Model();
          model.$__.isNew = false;
          schema.parseDynamo(model, item);

          debug('query parsed model', model);

          return model;
        }

        try {
          if (options.count) {
            return deferred.resolve(data.Count);
          }
          if (options.counts) {
            var counts = { count: data.Count, scannedCount: data.ScannedCount };
            return deferred.resolve(counts);
          }
          if (data.Items !== undefined) {
            if (!models.length) {
              models = data.Items.map(toModel);
            } else {
              models = models.concat(data.Items.map(toModel));
            }

            if(options.one) {
              if (!models || models.length === 0) {
                return deferred.resolve();
              }
              return deferred.resolve(models[0]);
            }
            lastKey = data.LastEvaluatedKey;
          }
          totalCount += data.Count;
          scannedCount += data.ScannedCount;
          timesQueried++;

          if ((options.all.max === 0 || timesQueried < options.all.max) && lastKey) {
            // query.all need to query again
            queryReq.ExclusiveStartKey = lastKey;
            setTimeout(queryOne, options.all.delay * 1000);
          } else {
            models.lastKey = lastKey;
            models.count = totalCount;
            models.scannedCount = scannedCount;
            models.timesQueried = timesQueried;
            deferred.resolve(models);
          }
        } catch (err) {
          deferred.reject(err);
        }
      });
    }

    return deferred.promise.nodeify(next);
  }


  if(Model$.options.waitForActive) {
    return Model$.table.waitForActive().then(query).catch(query);
  }

  return query();
};


Query.prototype.where = function (rangeKey) {
  if (this.validationError) {
    return this;
  }
  if(this.buildState) {
    this.validationError = new errors.QueryError('Invalid Query state: where() must follow eq()');
    return this;
  }
  if(typeof rangeKey === 'string') {
    this.buildState = 'rangeKey';
    this.query.rangeKey = {name: rangeKey};
  } else {
    var rangeKeyName = Object.keys(rangeKey)[0];
    var rangeKeyVal = rangeKey[rangeKeyName];
    var rangeKeyComp = Object.keys(rangeKeyVal)[0];
    rangeKeyVal = rangeKeyVal[rangeKeyComp];
    this.query.rangeKey = {
      name: rangeKeyName,
      values: [rangeKeyVal],
      comparison: rangeKeyComp
    };
  }

  return this;
};

Query.prototype.filter = function (filter) {
  if (this.validationError) {
    return this;
  }
  if(this.buildState) {
    this.validationError = new errors.QueryError('Invalid Query state: filter() must follow comparison');
    return this;
  }
  if(typeof filter === 'string') {
    this.buildState = 'filter';
    this.currentFilter = filter;
    if(this.filters[filter]) {
      this.validationError =  new errors.QueryError('Invalid Query state: %s filter can only be used once', filter);
      return this;
    }
    this.filters[filter] = {name: filter};
  }

  return this;
};

var VALID_RANGE_KEYS = ['EQ', 'LE', 'LT', 'GE', 'GT', 'BEGINS_WITH', 'BETWEEN'];
Query.prototype.compVal = function (vals, comp) {
  if (this.validationError) {
    return this;
  }
  if(this.buildState === 'hashKey') {
    if(comp !== 'EQ') {
      this.validationError = new errors.QueryError('Invalid Query state: eq must follow query()');
      return this;
    }
    this.query.hashKey.value = vals[0];
  } else if (this.buildState === 'rangeKey'){
    if(VALID_RANGE_KEYS.indexOf(comp) < 0) {
      this.validationError =  new errors.QueryError('Invalid Query state: %s must follow filter()', comp);
      return this;
    }
    this.query.rangeKey.values = vals;
    this.query.rangeKey.comparison = comp;
  } else if (this.buildState === 'filter') {
    this.filters[this.currentFilter].values = vals;
    this.filters[this.currentFilter].comparison = comp;
  } else {
    this.validationError =  new errors.QueryError('Invalid Query state: %s must follow query(), where() or filter()', comp);
    return this;
  }

  this.buildState = false;
  this.notState = false;

  return this;
};

Query.prototype.and = function() {
  this.options.or = false;

  return this;
};

Query.prototype.or = function() {
  this.options.or = true;

  return this;
};

Query.prototype.not = function() {
  this.notState = true;
  return this;
};

Query.prototype.null = function() {
  if(this.notState) {
    return this.compVal(null, 'NOT_NULL');
  } else {
    return this.compVal(null, 'NULL');
  }
};


Query.prototype.eq = function (val) {
  if(this.notState) {
    return this.compVal([val], 'NE');
  } else {
    return this.compVal([val], 'EQ');
  }
};


Query.prototype.lt = function (val) {
  if(this.notState) {
    return this.compVal([val], 'GE');
  } else {
    return this.compVal([val], 'LT');
  }
};

Query.prototype.le = function (val) {
  if(this.notState) {
    return this.compVal([val], 'GT');
  } else {
    return this.compVal([val], 'LE');
  }
};

Query.prototype.ge = function (val) {
  if(this.notState) {
    return this.compVal([val], 'LT');
  } else {
    return this.compVal([val], 'GE');
  }
};

Query.prototype.gt = function (val) {
  if(this.notState) {
    return this.compVal([val], 'LE');
  } else {
    return this.compVal([val], 'GT');
  }
};

Query.prototype.contains = function (val) {
  if(this.notState) {
    return this.compVal([val], 'NOT_CONTAINS');
  } else {
    return this.compVal([val], 'CONTAINS');
  }
};

Query.prototype.beginsWith = function (val) {
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
    this.validationError =  new errors.QueryError('Invalid Query state: beginsWith() cannot follow not()');
    return this;
  }
  return this.compVal([val], 'BEGINS_WITH');
};

Query.prototype.in = function (vals) {
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
    this.validationError = new errors.QueryError('Invalid Query state: in() cannot follow not()');
    return this;
  }

  return this.compVal(vals, 'IN');
};

Query.prototype.between = function (a, b) {
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
    this.validationError = new errors.QueryError('Invalid Query state: between() cannot follow not()');
    return this;
  }
  return this.compVal([a, b], 'BETWEEN');
};


Query.prototype.limit = function (limit) {
  this.options.limit = limit;
  return this;
};


Query.prototype.one = function () {
  this.options.one = true;
  return this;
};

Query.prototype.consistent = function () {
  this.options.consistent = true;
  return this;
};

Query.prototype.descending = function () {
  this.options.descending = true;
  return this;
};


Query.prototype.ascending = function () {
  this.options.descending = false;
  return this;
};

Query.prototype.startAt = function (key) {
  this.options.ExclusiveStartKey = key;
  return this;
};

Query.prototype.attributes = function (attributes) {
  this.options.attributes = attributes;
  return this;
};

Query.prototype.count = function () {
  this.options.count = true;
  this.options.select = 'COUNT';
  return this;
};

Query.prototype.counts = function () {
  this.options.counts = true;
  this.options.select = 'COUNT';
  return this;
};

Query.prototype.using = function (indexName) {
  this.options.indexName = indexName;
  return this;
};

Query.prototype.all = function (delay, max) {
  delay = delay || 1;
  max = max || 0;
  this.options.all = {'delay': delay, 'max': max};
  return this;
};

module.exports = Query;
