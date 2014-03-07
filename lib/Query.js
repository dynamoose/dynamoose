'use strict';
var errors = require('./errors');
var debug = require('debug')('dynamoose:query');



function Query (Model, query, options) {
  this.Model = Model;
  this.options = options || {};


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

  this.buildState = '';

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
        value: rangeKeyVal,
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
  var Model = this.Model;
  var schema = Model.$__.schema;
  var options = this.options;

  debug('Query with schema', schema);

  var queryReq = {
    TableName: Model.$__.name,
    KeyConditions: {}
  };

  var indexName, index;
  if(schema.hashKey.name !== this.query.hashKey.name) {
    debug('query is on global secondary index');
    for(indexName in schema.indexes.global) {
      if(indexName=== this.query.hashKey.name) {
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

    if(rangeKey.value2 === null || rangeKey.value2 === undefined) {
      debug('No range key value (i.e. get all)');
    } else if(rangeKey.value2 === null || rangeKey.value2 === undefined) {
      debug('Single range key value');
      queryReq.KeyConditions[rangeKey.name] = {
        AttributeValueList: [rangeAttr.toDynamo(rangeKey.value)],
        ComparisonOperator: rangeKey.comparison.toUpperCase()
      };
    } else {
      debug('Two range key values');
      queryReq.KeyConditions[rangeKey.name] = {
        AttributeValueList: [
          rangeAttr.toDynamo(rangeKey.value),
          rangeAttr.toDynamo(rangeKey.value2)
        ],
        ComparisonOperator: rangeKey.comparison.toUpperCase()
      };

    }

  }

  if(options.attributes) {
    queryReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    queryReq.ConsistentRead = true;
  }

  if(options.limit) {
    queryReq.Limit = options.limit;
  }

  if(options.descending || options.ascending === false) {
    queryReq.ScanIndexForward = false;
  }

  if(options.ExclusiveStartKey) {
    queryReq.ExclusiveStartKey = options.ExclusiveStartKey;
  }


  debug('query', queryReq);
  Model.$__.base.ddb().query(queryReq, function(err, data) {
    if(err) {
      debug('Error returned by query', err);
      return next(err);
    }
    debug('query response', data);

    if(!Object.keys(data).length) {
      return next();
    }

    function toModel (item) {
      var model = new Model();
      model.$__.isNew = false;
      schema.parseDynamo(model, item);

      debug('query parsed model', model);

      return model;
    }


    var models = data.Items.map(toModel);

    next(null, models, data.LastEvaluatedKey);
  });
};


Query.prototype.where = function (rangeKey) {
  if(this.buildState) {
    throw errors.QueryError('Invalid query state; where() must follow eq()');
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
      value: rangeKeyVal,
      comparison: rangeKeyComp
    };
  }

  return this;
};

Query.prototype.eq = function (val) {
  if(this.buildState !== 'hashKey' && this.buildState !== 'rangeKey') {
    throw errors.QueryError('Invalid query state; eq must follow query(\'string\') or where(\'string\')');
  }
  if(this.buildState === 'hashKey') {
    this.query.hashKey.value = val;
  } else {
    this.query.rangeKey.value = val;
    this.query.rangeKey.comparison = 'EQ';

  }
  this.buildState = '';

  return this;
};

Query.prototype.rangeVal = function (val, val2, comp) {
  if(this.buildState !== 'rangeKey') {
    throw errors.QueryError('Invalid query state; %s must follow where(\'string\')', comp);
  }
  if(!comp) {
    comp = val2;
    val2 = null;
  }
  this.query.rangeKey.value = val;
  if(val2 !== null && val2 !== undefined) {
    this.query.rangeKey.value2 = val2;
  }
  this.query.rangeKey.comparison = comp;

  this.buildState = '';

  return this;
};

Query.prototype.lt = function (val) {
  return this.rangeVal(val, 'LT');
};

Query.prototype.le = function (val) {
  return this.rangeVal(val, 'LE');
};

Query.prototype.ge = function (val) {
  return this.rangeVal(val, 'GE');
};

Query.prototype.gt = function (val) {
  return this.rangeVal(val, 'GT');
};

Query.prototype.beginsWith = function (val) {
  return this.rangeVal(val, 'BEGINS_WITH');
};

Query.prototype.between = function (a, b) {
  return this.rangeVal(a, b, 'BETWEEN');
};

Query.prototype.limit = function (limit) {
  this.options.limit = limit;
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



module.exports = Query;