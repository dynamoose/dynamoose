'use strict';
var Q = require('q');
var debug = require('debug')('dynamoose:table');
var util = require('util');
var _ = require('lodash');

function Table(name, schema, options, base) {
  debug('new Table (%s)', name, schema);
  this.name = name;
  this.schema = schema;
  this.options = options || {};
  this.base = base;

  if (this.options.create === undefined || this.options.create === null) {
    this.options.create = true;
  }
}

var compareIndexes = function compareIndexes(local, remote) {
  var indexes = {
    delete: [],
    create: [],
    both: []
  };
  var localTableReq = local;
  var remoteTableReq = remote;
  var i;
  var j;

  var localIndexes = localTableReq.GlobalSecondaryIndexes;
  var remoteIndexes = remoteTableReq.GlobalSecondaryIndexes;

  debug('compareIndexes');
  // let's see what remote indexes we need to sync or create
  for (i = 0; i < localIndexes.length; i++) {
    var remoteIndexFound = false;
    for (j = 0; j < remoteIndexes.length; j++) {
      if (remoteIndexes[j].IndexName === localIndexes[i].IndexName) {
        // let's see if the core data matches. if it doesn't,
        // we may need to delete the remote GSI and rebuild.
        var localIndex = _.pick(localIndexes[i], 'IndexName', 'KeySchema', 'Projection', 'ProvisionedThroughput');
        var remoteIndex = _.pick(remoteIndexes[j], 'IndexName', 'KeySchema', 'Projection', 'ProvisionedThroughput');
        if (remoteIndex.hasOwnProperty('ProvisionedThroughput')) {
          delete remoteIndex.ProvisionedThroughput.NumberOfDecreasesToday;
        }

        if (!_.isEqual(remoteIndex, localIndex)) {
          indexes.both.push(localIndex);
          remoteIndexFound = true;
        } else {
          remoteIndexFound = true;
        }
      }
    }
    if (!remoteIndexFound) {
      indexes.create.push(localIndexes[i]);
    }
  }
  for (j = 0; j < remoteIndexes.length; j++) {
    var localExists = false;
    for (i = 0; i < localIndexes.length; i++) {
      if (remoteIndexes[j].IndexName === localIndexes[i].IndexName) {
        localExists = true;
      }
    }
    if (!localExists) {
      indexes.delete.push(remoteIndexes[j]);
    }
  }
  // now let's see what remote indexes exist that shouldn't exist

  return indexes;
};

Table.prototype.deleteIndex = function deleteIndex(indexName) {
  var deferred = Q.defer();
  var table = this;
  table.active = false;
  var params = {
    TableName: table.name,
    GlobalSecondaryIndexUpdates: [
      {
        Delete: {
          IndexName: indexName
        }
      }
    ]
  };
  table.base.ddb().updateTable(params, function (err, data) {
    debug('deleteIndex handler running');
    if (err) {
      deferred.reject(err);
    }
    else {
      setTimeout(function () {
        table.waitForActive()
          .then(function () {
            deferred.resolve(data);
          });
      }, 300);
    }
  });
  return deferred.promise;
};

Table.prototype.createIndex = function createIndex(attributes, indexSpec) {
  var deferred = Q.defer();
  var table = this;
  table.active = false;
  var params = {
    TableName: this.name,
    AttributeDefinitions: attributes,
    GlobalSecondaryIndexUpdates: [
      {
        Create: indexSpec
      }
    ]
  };
  this.base.ddb().updateTable(params, function (err, data) {
    if (err) {
      deferred.reject(err);
    }
    else {
      setTimeout(function () {
        table.waitForActive()
          .then(function () {
            deferred.resolve(data);
          });
      }, 300);
    }
  });
  return deferred.promise;
};

Table.prototype.init = function (next) {
  debug('initializing table, %s, %j', this.name, this.options);
  var deferred = Q.defer();

  var table = this;
  var localTableReq;

  if (this.options.create) {
    this.describe()
      .then(function (data) {
        debug('table exist -- initialization done');
        localTableReq = buildTableReq(table.name, table.schema);
        var indexes = compareIndexes(localTableReq, data.Table);

        debug('%s', JSON.stringify(indexes, null, 2));
        if (table.options.update) {
          debug('checking indexes');
          for (var deleteIdx in indexes.delete) {
            table.deleteIndex(indexes.delete[deleteIdx].IndexName);
          }
          for (var bothIdx in indexes.both) {
            /*jshint loopfunc: true */
            table.deleteIndex(indexes.both[bothIdx].IndexName)
              .then(function () {
                table.createIndex(localTableReq.AttributeDefinitions, indexes.both[bothIdx]);
              });
          }
          for (var createIdx in indexes.create) {
            table.createIndex(localTableReq.AttributeDefinitions, indexes.create[createIdx]);
          }
        } else {
          if (indexes.delete.length > 0 || indexes.create.length > 0) {
            debug('indexes are not synchronized and update flag is set to false');
            deferred.reject('indexes are not synchronized and update flag is set to false');
          }
        }
        table.waitForActive();
        //table.active = data.Table.TableStatus === 'ACTIVE';
        table.initialized = true;

        return deferred.resolve();
      })
      .catch(function (err) {
        if (err && err.code === 'ResourceNotFoundException') {
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
        if (err) {
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

Table.prototype.waitForActive = function (timeout, next) {
  debug('Waiting for Active table, %s, %j', this.name, this.options);
  var deferred = Q.defer();

  if (typeof timeout === 'function') {
    next = timeout;
    timeout = null;
  }

  if (!timeout) {
    timeout = this.options.waitForActiveTimeout;
  }

  var table = this;

  var timeoutAt = Date.now() + timeout;

  function waitForActive() {
    /*
     if (table.active) {
     debug('Table flag is set to Active - %s', table.name);
     return deferred.resolve();
     }*/
    if (Date.now() > timeoutAt) {
      return deferred.reject(
        new Error('Wait for Active timed out after ' + timeout + ' ms.')
      );
    }
    if (!table.initialized) {
      return setTimeout(waitForActive, 10);
    }
    table.describe()
      .then(function (data) {
        var active = (data.Table.TableStatus === 'ACTIVE');
        data.Table.GlobalSecondaryIndexes.forEach(function (gsi) {
          //debug('waitForActive Index Check: %s', JSON.stringify(gsi, null, 2));
          debug('index %s.IndexStatus is %s', gsi.IndexName, gsi.IndexStatus);
          if (gsi.IndexStatus !== 'ACTIVE') {
            active = false;
          }
        });
        if (!active) {
          debug('Waiting for Active again - %s', table.name);
          setTimeout(waitForActive, 500);
        } else {
          table.active = true;
          deferred.resolve();
        }
      })
      .catch(function (err) {
        return deferred.reject(err);
      });
  }

  waitForActive();

  return deferred.promise.nodeify(next);
};

Table.prototype.describe = function (next) {
  var describeTableReq = {
    TableName: this.name
  };

  var deferred = Q.defer();

  var ddb = this.base.ddb();
  ddb.describeTable(describeTableReq, function (err, data) {
    if (err) {
      debug('error describing table', err);
      return deferred.reject(err);
    }
    deferred.resolve(data);
  });


  return deferred.promise.nodeify(next);
};

var buildTableReq = function buildTableReq(name, schema) {
  var attrDefs = [];

  var keyAttr = {};

  function addKeyAttr(attr) {
    if (attr) {
      keyAttr[attr.name] = attr;
    }
  }

  addKeyAttr(schema.hashKey);
  addKeyAttr(schema.rangeKey);
  for (var globalIndexName in schema.indexes.global) {
    addKeyAttr(schema.indexes.global[globalIndexName]);

    // add the range key to the attribute definitions if specified
    var rangeKeyName = schema.indexes.global[globalIndexName].indexes[globalIndexName].rangeKey;
    addKeyAttr(schema.attributes[rangeKeyName]);
  }
  for (var indexName in schema.indexes.local) {
    addKeyAttr(schema.indexes.local[indexName]);
  }

  for (var keyAttrName in keyAttr) {
    attrDefs.push({
      AttributeName: keyAttrName,
      AttributeType: keyAttr[keyAttrName].type.dynamo
    });
  }


  var keySchema = [{
    AttributeName: schema.hashKey.name,
    KeyType: 'HASH'
  }];
  if (schema.rangeKey) {
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
    TableName: name,
    KeySchema: keySchema,
    ProvisionedThroughput: provThroughput
  };

  debug('Creating table local indexes', schema.indexes.local);
  var localSecIndexes, index;
  for (var localSecIndexName in schema.indexes.local) {
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

    if (index.project) {
      if (util.isArray(index.project)) {
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
  for (var globalSecIndexName in schema.indexes.global) {
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


    if (index.rangeKey) {
      globalSecIndex.KeySchema.push({
        AttributeName: index.rangeKey,
        KeyType: 'RANGE'
      });
    }

    if (index.project) {
      if (util.isArray(index.project)) {
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

  if (localSecIndexes) {
    createTableReq.LocalSecondaryIndexes = localSecIndexes;
  }

  if (globalSecIndexes) {
    createTableReq.GlobalSecondaryIndexes = globalSecIndexes;
  }

  return createTableReq;
};

Table.prototype.create = function (next) {
  var ddb = this.base.ddb();
  var schema = this.schema;
  var createTableReq = buildTableReq(this.name, schema);

  debug('ddb.createTable request:', createTableReq);

  var deferred = Q.defer();

  ddb.createTable(createTableReq, function (err, data) {
    if (err) {
      debug('error creating table', err);
      return deferred.reject(err);
    }
    debug('table created', data);
    deferred.resolve(data);
  });
  return deferred.promise.nodeify(next);

};

Table.prototype.delete = function (next) {
  var deleteTableReq = {
    TableName: this.name
  };

  debug('ddb.deleteTable request:', deleteTableReq);

  var ddb = this.base.ddb();

  var deferred = Q.defer();

  ddb.deleteTable(deleteTableReq, function (err, data) {
    if (err) {
      debug('error deleting table', err);
      return deferred.reject(err);
    }
    debug('deleted table', data);
    deferred.resolve(data);
  });

  return deferred.promise.nodeify(next);

};

Table.prototype.update = function (next) {
  // var ddb = this.base.ddb();
  // ddb.updateTable();
  var deferred = Q.defer();
  deferred.reject(new Error('TODO'));
  return deferred.promise.nodeify(next);
};

module.exports = Table;
