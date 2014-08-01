'use strict';
var Q = require('q');
var debug = require('debug')('dynamoose:table');
var util = require('util');


function Table(name, schema, options, base) {
  debug('new Table (%s)', name, schema);
  this.name = name;
  this.schema = schema;
  this.options = options || {};
  this.base = base;

  if(this.options.create === undefined || this.options.create === null) {
    this.options.create = true;
  }
}


Table.prototype.init = function(next) {
  debug('initializing table, %s, %j', this.name, this.options);
  var deferred = Q.defer();

  var table = this;

  if (this.options.create) {
    this.describe()
    .then(function (data) {
      debug('table exist -- initialization done');
      // TODO verify table keys and index's match
      table.active = data.Table.TableStatus === 'ACTIVE';
      table.initialized = true;
      return deferred.resolve();
    },
    function (err) {
      if(err && err.code === 'ResourceNotFoundException') {
        debug('table does not exist -- creating');
        return deferred.resolve(
          table.create()
          .then(function () {
            table.initialized = true;
          })
          // .then(function() {
          //   if(table.options.waitForActive) {
          //     return table.waitForActive();
          //   }
          // })
        );
      }
      if(err) {
        debug('error initializing', err);
        return deferred.reject(err);
      }
    });
  } else {
    table.initialized = true;
    return deferred.resolve();
  }
  return deferred.promise.nodeify(next);
};

Table.prototype.waitForActive = function(timeout, next) {
  debug('Waiting for Active table, %s, %j', this.name, this.options);
  var deferred = Q.defer();

  if(typeof timeout === 'function') {
    next = timeout;
    timeout = null;
  }

  if(!timeout) {
    timeout = this.options.waitForActiveTimeout;
  }

  var table = this;

  var timeoutAt = Date.now() + timeout;
  function waitForActive() {
    if(table.active) {
      debug('Table is Active - %s', table.name);
      return deferred.resolve();
    }
    if(Date.now() > timeoutAt) {
      return deferred.reject(
        new Error('Wait for Active timed out after ' + timeout + ' ms.')
      );
    }
    if(!table.initialized) {
      return setTimeout(waitForActive, 10);
    }
    table.describe()
    .then(function (data) {
      if(data.Table.TableStatus !== 'ACTIVE'){
        debug('Waiting for Active - %s', table.name);
        setTimeout(waitForActive, 1000);
      } else {
        // TODO verify table keys and index's match
        table.active = true;
        deferred.resolve();
      }
    }, function (err) {
      return deferred.reject(err);
    });
  }

  waitForActive();

  return deferred.promise.nodeify(next);
};

Table.prototype.describe = function(next) {
  var describeTableReq = {
    TableName: this.name
  };

  debug('ddb.describeTable request: %j', describeTableReq);

  var deferred = Q.defer();

  var ddb = this.base.ddb();
  ddb.describeTable(describeTableReq, function(err, data) {
    if(err) {
      debug('error describing table', err);
      return deferred.reject(err);
    }
    debug('got table description: %j', data);
    deferred.resolve(data);
  });


  return deferred.promise.nodeify(next);
};


Table.prototype.create = function(next) {
  var ddb = this.base.ddb();
  var schema = this.schema;

  var attrDefs = [];

  var keyAttr = {};
  function addKeyAttr (attr) {
    if(attr) {
      keyAttr[attr.name] = attr;
    }
  }

  addKeyAttr(schema.hashKey);
  addKeyAttr(schema.rangeKey);
  for(var globalIndexName in schema.indexes.global) {
    addKeyAttr(schema.indexes.global[globalIndexName]);

    // add the range key to the attribute definitions if specified
    var rangeKeyName = schema.indexes.global[globalIndexName].indexes[globalIndexName].rangeKey;
    addKeyAttr(schema.attributes[rangeKeyName]);
  }
  for(var indexName in schema.indexes.local) {
    addKeyAttr(schema.indexes.local[indexName]);
  }

  for(var keyAttrName in keyAttr) {
    attrDefs.push({
      AttributeName: keyAttrName,
      AttributeType: keyAttr[keyAttrName].type.dynamo
    });
  }


  var keySchema = [{
    AttributeName: schema.hashKey.name,
    KeyType: 'HASH'
  }];
  if(schema.rangeKey) {
    keySchema.push({
      AttributeName: schema.rangeKey.name,
      KeyType: 'RANGE'
    });
  }

  var provThroughput = {
    ReadCapacityUnits: schema.throughput.read,
    WriteCapacityUnits: schema.throughput.write
  };

  var createTableReq = {
    AttributeDefinitions: attrDefs,
    TableName: this.name,
    KeySchema: keySchema,
    ProvisionedThroughput: provThroughput
  };

  debug('Creating table local indexes', schema.indexes.local);
  var localSecIndexes, index;
  for(var localSecIndexName in schema.indexes.local) {
    localSecIndexes = localSecIndexes || [];

    var indexAttr = schema.indexes.local[localSecIndexName];
    index = indexAttr.indexes[localSecIndexName];
    var localSecIndex = {
      IndexName: localSecIndexName,
      KeySchema: [{
        AttributeName: schema.hashKey.name,
        KeyType: 'HASH'
      }, {
        AttributeName: indexAttr.name,
        KeyType: 'RANGE'
      }]
    };

    if(index.project) {
      if(util.isArray(index.project)){
        localSecIndex.Projection = {
          ProjectionType: 'INCLUDE',
          NonKeyAttributes: index.project
        };
      } else {
        localSecIndex.Projection = {
          ProjectionType: 'ALL'
        };
      }
    } else {
      localSecIndex.Projection = {
        ProjectionType: 'KEYS_ONLY'
      };
    }

    localSecIndexes.push(localSecIndex);
  }


  var globalSecIndexes;
  for(var globalSecIndexName in schema.indexes.global) {
    globalSecIndexes = globalSecIndexes || [];

    var globalIndexAttr = schema.indexes.global[globalSecIndexName];
    index = globalIndexAttr.indexes[globalSecIndexName];

    var globalSecIndex = {
      IndexName: globalSecIndexName,
      KeySchema: [{
        AttributeName: globalIndexAttr.name,
        KeyType: 'HASH'
      }],
      ProvisionedThroughput: {
        ReadCapacityUnits: index.throughput.read,
        WriteCapacityUnits: index.throughput.write
      }
    };


    if(index.rangeKey) {
      globalSecIndex.KeySchema.push({
        AttributeName: index.rangeKey,
        KeyType: 'RANGE'
      });
    }

    if(index.project) {
      if(util.isArray(index.project)){
        globalSecIndex.Projection = {
          ProjectionType: 'INCLUDE',
          NonKeyAttributes: index.project
        };
      } else {
        globalSecIndex.Projection = {
          ProjectionType: 'ALL'
        };
      }
    } else {
      globalSecIndex.Projection = {
        ProjectionType: 'KEYS_ONLY'
      };
    }

    globalSecIndexes.push(globalSecIndex);
  }

  if(localSecIndexes) {
    createTableReq.LocalSecondaryIndexes = localSecIndexes;
  }

  if(globalSecIndexes) {
    createTableReq.GlobalSecondaryIndexes = globalSecIndexes;
  }

  debug('ddb.createTable request:', createTableReq);


  var deferred = Q.defer();

  ddb.createTable(createTableReq, function(err, data) {
    if(err) {
      debug('error creating table', err);
      return deferred.reject(err);
    }
    debug('table created', data);
    deferred.resolve(data);
  });
  return deferred.promise.nodeify(next);

};

Table.prototype.delete = function(next) {
  var deleteTableReq = {
    TableName: this.name
  };

  debug('ddb.deleteTable request:', deleteTableReq);

  var ddb = this.base.ddb();

  var deferred = Q.defer();

  ddb.deleteTable(deleteTableReq, function(err, data) {
    if(err) {
      debug('error deleting table', err);
      return deferred.reject(err);
    }
    debug('deleted table', data);
    deferred.resolve(data);
  });

  return deferred.promise.nodeify(next);

};

Table.prototype.update = function(next) {
  // var ddb = this.base.ddb();
  // ddb.updateTable();
  var deferred = Q.defer();
  deferred.reject(new Error('TODO'));
  return deferred.promise.nodeify(next);
};

module.exports = Table;
