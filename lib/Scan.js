'use strict';
var Q = require('q');
var debug = require('debug')('dynamoose:scan');

var errors = require('./errors');
function Scan (Model, filter, options) {

  this.Model = Model;
  this.options = options || {};


  // [{
  //     name: 'name',
  //     values: ['value', ...],
  //     comparison: 'string'
  //   },
  //    ...
  // ]
  this.filters = {};
  this.buildState = false;

  if (typeof filter === 'string') {
    this.buildState = filter;
    this.filters[filter] = {name: filter};
  } else if (typeof filter === 'object'){
    this.parseFilterObject(filter);
  }
}

Scan.prototype.exec = function (next) {
  debug('exec scan for ', this.scan);
  var Model = this.Model;
  var Model$ = Model.$__;
  var schema = Model$.schema;
  var options = this.options;

  var scanReq = {
    TableName: Model.$__.name
  };

  if(Object.keys(this.filters).length > 0) {
    scanReq.ScanFilter = {};
    for(var name in this.filters) {
      var filter = this.filters[name];
      var filterAttr = schema.attributes[name];
      scanReq.ScanFilter[name] = {
        AttributeValueList: [],
        ComparisonOperator: filter.comparison
      };

      if(filter.values) {
        for (var i = 0; i < filter.values.length; i++) {
          var val = filter.values[i];
          scanReq.ScanFilter[name].AttributeValueList.push(
            filterAttr.toDynamo(val, true)
          );
        }
      }
    }
  }

  if(options.attributes) {
    scanReq.AttributesToGet = options.attributes;
  }

  if(options.limit) {
    scanReq.Limit = options.limit;
  }

  if(options.ExclusiveStartKey) {
    scanReq.ExclusiveStartKey = options.ExclusiveStartKey;
  }

  if(options.conditionalOperator) {
    scanReq.ConditionalOperator = options.conditionalOperator;
  }

  function scan () {
    var deferred = Q.defer();

    debug('scan request', scanReq);
    Model.$__.base.ddb().scan(scanReq, function(err, data) {
      if(err) {
        debug('Error returned by scan', err);
        return deferred.reject(err);
      }
      debug('scan response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      function toModel (item) {
        var model = new Model();
        model.$__.isNew = false;
        schema.parseDynamo(model, item);

        debug('scan parsed model', model);

        return model;
      }


      var models = data.Items.map(toModel);

      models.lastKey = data.LastEvaluatedKey;
      deferred.resolve(models);
    });

    return deferred.promise.nodeify(next);
  }


  if(Model$.options.waitForActive) {
    return Model$.table.waitForActive().then(scan);
  }

  return scan();
};

Scan.prototype.parseFilterObject = function (filter) {

  if (Object.keys(filter).length > 0) {

    for(var filterName in filter) {
      if (filter.hasOwnProperty(filterName)) {

        // Parse AND OR
        if (filterName === 'and' || filterName === 'or') {

          this[filterName]();
          for(var condition in filter[filterName]) {
            if (filter[filterName].hasOwnProperty(condition)) {
              this.parseFilterObject(filter[filterName][condition]);
            }
          }
        } else {

          this.where(filterName);
          var val, comp;

          if (typeof filter[filterName] === 'object' &&
            Object.keys(filter[filterName]).length  === 1) {

            comp = Object.keys(filter[filterName])[0];

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

Scan.prototype.and = function() {
  this.options.conditionalOperator = 'AND';
  return this;
};

Scan.prototype.or = function() {
  this.options.conditionalOperator = 'OR';
  return this;
};


Scan.prototype.where = function (filter) {
  if(this.buildState) {
    throw new errors.ScanError('Invalid scan state; where() must follow comparison');
  }
  if(typeof filter === 'string') {
    this.buildState = filter;
    if(this.filters[filter]) {
      throw new errors.ScanError('Invalid scan state; %s can only be used once', filter);
    }
    this.filters[filter] = {name: filter};
  }

  return this;
};
Scan.prototype.filter = Scan.prototype.where;

Scan.prototype.compVal = function (vals, comp) {

  var permittedComparison =
    [
      'NOT_NULL','NULL','EQ','NE','GE','LT','GT','LE','GE',
      'NOT_CONTAINS','CONTAINS','BEGINS_WITH','IN','BETWEEN'
    ];


  if(!this.buildState) {
    throw new errors.ScanError('Invalid scan state; %s must follow scan(), where(), or filter()', comp);
  }

  if (permittedComparison.indexOf(comp) === -1) {
    throw new errors.ScanError('Invalid comparison %s', comp);
  }

  this.filters[this.buildState].values = vals;
  this.filters[this.buildState].comparison = comp;

  this.buildState = false;
  this.notState = false;

  return this;
};


Scan.prototype.not = function() {
  this.notState = true;
  return this;
};

Scan.prototype.null = function() {
  if(this.notState) {
    return this.compVal(null, 'NOT_NULL');
  } else {
    return this.compVal(null, 'NULL');
  }
};


Scan.prototype.eq = function (val) {
  if(this.notState) {
    return this.compVal([val], 'NE');
  } else {
    return this.compVal([val], 'EQ');
  }
};


Scan.prototype.lt = function (val) {
  if(this.notState) {
    return this.compVal([val], 'GE');
  } else {
    return this.compVal([val], 'LT');
  }
};

Scan.prototype.le = function (val) {
  if(this.notState) {
    return this.compVal([val], 'GT');
  } else {
    return this.compVal([val], 'LE');
  }
};

Scan.prototype.ge = function (val) {
  if(this.notState) {
    return this.compVal([val], 'LT');
  } else {
    return this.compVal([val], 'GE');
  }
};

Scan.prototype.gt = function (val) {
  if(this.notState) {
    return this.compVal([val], 'LE');
  } else {
    return this.compVal([val], 'GT');
  }
};

Scan.prototype.contains = function (val) {
  if(this.notState) {
    return this.compVal([val], 'NOT_CONTAINS');
  } else {
    return this.compVal([val], 'CONTAINS');
  }
};

Scan.prototype.beginsWith = function (val) {
  if(this.notState) {
    throw new errors.ScanError('Invalid scan state: beginsWith() cannot follow not()');
  }
  return this.compVal([val], 'BEGINS_WITH');
};

Scan.prototype.in = function (vals) {
  if(this.notState) {
    throw new errors.ScanError('Invalid scan state: in() cannot follow not()');
  }

  return this.compVal(vals, 'IN');
};

Scan.prototype.between = function (a, b) {
  if(this.notState) {
    throw new errors.ScanError('Invalid scan state: between() cannot follow not()');
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

module.exports = Scan;
