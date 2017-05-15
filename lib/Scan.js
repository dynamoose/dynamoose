'use strict';
var Q = require('q');
var debug = require('debug')('dynamoose:scan');

var errors = require('./errors');

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
    this.filters[filter] = {name: filter};
  } else if (typeof filter === 'object'){
    this.parseFilterObject(filter);
  }
}



Scan.prototype.exec = function (next) {
  debug('exec scan for ', this.scan);
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

  if(options.count) {
    scanReq.Select = 'COUNT';
  }

  if(options.counts) {
    scanReq.Select = 'COUNT';
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
    
    var models = {}, totalCount = 0, scannedCount = 0, timesScanned = 0, lastKey;
    if (!options.all) {
      options.all = {'delay': 0, 'max': 1};
    }
    scanOne();
    function scanOne() {
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

        try {
          if (options.count) {
            return deferred.resolve(data.Count);
          }
          if (options.counts) {
            var counts = { count: data.Count, scannedCount: data.ScannedCount };
            return deferred.resolve(counts);
          }
          if (data.Items !== undefined) {
            if (!models.length || models.length === 0) {
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
          timesScanned++;
          
          if ((options.all.max === 0 || timesScanned < options.all.max) && lastKey) {
            // scan.all need to scan again
            scanReq.ExclusiveStartKey = lastKey;
            setTimeout(scanOne, options.all.delay * 1000);
          }
          else {
            // completed scan returning models
            models.lastKey = lastKey;
            models.count = totalCount;
            models.scannedCount = scannedCount;
            models.timesScanned = timesScanned;
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
  if (this.validationError) {
    return this;
  }

  if(this.buildState) {
    this.validationError = new errors.ScanError('Invalid scan state; where() must follow comparison');
    return this;
  }
  if(typeof filter === 'string') {
    this.buildState = filter;
    if(this.filters[filter]) {
      this.validationError = new errors.ScanError('Invalid scan state; %s can only be used once', filter);
      return this;
    }
    this.filters[filter] = {name: filter};
  }

  return this;
};
Scan.prototype.filter = Scan.prototype.where;

Scan.prototype.compVal = function (vals, comp) {
  if (this.validationError) {
    return this;
  }

  var permittedComparison =
    [
      'NOT_NULL','NULL','EQ','NE','GE','LT','GT','LE','GE',
      'NOT_CONTAINS','CONTAINS','BEGINS_WITH','IN','BETWEEN'
    ];


  if(!this.buildState) {
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
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
    this.validationError = new errors.ScanError('Invalid scan state: beginsWith() cannot follow not()');
    return this;
  }
  return this.compVal([val], 'BEGINS_WITH');
};

Scan.prototype.in = function (vals) {
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
    this.validationError = new errors.ScanError('Invalid scan state: in() cannot follow not()');
    return this;
  }

  return this.compVal(vals, 'IN');
};

Scan.prototype.between = function (a, b) {
  if (this.validationError) {
    return this;
  }
  if(this.notState) {
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

Scan.prototype.all = function (delay, max) {
  delay = delay || 1;
  max = max || 0;
  this.options.all = {'delay': delay, 'max': max};
  return this;
};

module.exports = Scan;
