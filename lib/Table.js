'use strict';
const Q = require('q');
const debug = require('debug')('dynamoose:table');
const util = require('util');
const deepEqual = require('deep-equal');

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

const compareIndexes = function compareIndexes(local, remote) {
  let indexes = {
    delete: [],
    create: []
  };
  let localTableReq = local;
  let remoteTableReq = remote;
  let i;
  let j;

  let localIndexes = localTableReq.GlobalSecondaryIndexes || [];
  let remoteIndexes = remoteTableReq.GlobalSecondaryIndexes || [];

  debug('compareIndexes');
  // let's see what remote indexes we need to sync or create
  for (i = 0; i < localIndexes.length; i++) {
    let remoteIndexFound = false;
    for (j = 0; j < remoteIndexes.length; j++) {
      if (remoteIndexes[j].IndexName === localIndexes[i].IndexName) {
        // let's see if the core data matches. if it doesn't,
        // we may need to delete the remote GSI and rebuild.
        let localIndex = (({ IndexName, KeySchema, Projection }) => ({ IndexName, KeySchema, Projection }))(localIndexes[i]);
        if (Array.isArray(localIndex && localIndex.Projection && localIndex.Projection.NonKeyAttributes)) {
          localIndex.Projection.NonKeyAttributes.sort();
        }
        let remoteIndex = (({ IndexName, KeySchema, Projection }) => ({ IndexName, KeySchema, Projection }))(remoteIndexes[j]);
        if (Array.isArray(remoteIndex && remoteIndex.Projection && remoteIndex.Projection.NonKeyAttributes)) {
          remoteIndex.Projection.NonKeyAttributes.sort();
        }

        debug("indexes being compared");
        debug("local: ", localIndex);
        debug("remote: ", remoteIndex);

        if (!deepEqual(remoteIndex, localIndex)) {
          localIndex.ProvisionedThroughput = localIndexes[i].ProvisionedThroughput;
          indexes.delete.push(localIndex);
          indexes.create.push(localIndex);
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
    let localExists = false;
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
  const deferred = Q.defer();
  let table = this;
  table.active = false;
  let params = {
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
  const deferred = Q.defer();
  let table = this;
  table.active = false;
  let params = {
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
  const deferred = Q.defer();

  let table = this;
  let localTableReq;

  if (this.options.create) {
    this.describe()
    .then(function (data) {
      debug('table exist -- initialization done');
      localTableReq = table.buildTableReq(table.name, table.schema);
      let indexes = compareIndexes(localTableReq, data.Table);

      debug('%s', JSON.stringify(indexes, null, 2));
      if (table.options.update) {
        debug('updating indexes sequentially');
        Q()
        .then(function() {
          return indexes.delete.reduce(function(cur, next) {
            return cur.then(function() { return table.deleteIndex(next.IndexName); });
          }, Q());
        })
        .then(function() {
          return indexes.create.reduce(function(cur, next) {
            return cur.then(function() { return table.createIndex(localTableReq.AttributeDefinitions, next); });
          }, Q());
        })
        .catch(function(e) { debug(e); });

      } else {
        if (indexes.delete.length > 0 || indexes.create.length > 0) {
          const mess = `${table.name} indexes are not synchronized and update flag is set to false`;
          debug(mess);
          deferred.reject(new Error(mess));
        }
      }
      table.initialized = true;
      return table.waitForActive()
      .then(function() {
        return table.updateTTL();
      })
      .then(function () {
        return deferred.resolve();
      });
    })
    .catch(function (err) {
      if (err && err.code === 'ResourceNotFoundException') {
        debug('table does not exist -- creating');
        return deferred.resolve(
          table.create()
          .then(function () {
            table.initialized = true;
          })
          .then(function () {
            if (table.options.waitForActive) {
              return table.waitForActive();
            }
          })
          .then(function () {
            return table.updateTTL();
          })
        );
      }
      if (err) {
        debug('error initializing', err.stack);
        return deferred.reject(err);
      }
    });
  } else {
    table.initialized = true;
    return table.updateTTL();

  }
  return deferred.promise.nodeify(next);
};

Table.prototype.waitForActive = function (timeout, next) {
  debug('Waiting for Active table, %s, %j', this.name, this.options);
  const deferred = Q.defer();

  if (typeof timeout === 'function') {
    next = timeout;
    timeout = null;
  }

  if (!timeout) {
    timeout = this.options.waitForActiveTimeout;
  }

  let table = this;

  let timeoutAt = Date.now() + timeout;

  function waitForActive() {
    debug('Waiting...');
    if (Date.now() > timeoutAt) {
      return deferred.reject(
        new Error(`Wait for Active timed out after ${timeout} ms.`)
      );
    }
    if (!table.initialized) {
      return setTimeout(waitForActive, 10);
    }
    table.describe()
    .then(function (data) {
      let active = (data.Table.TableStatus === 'ACTIVE');
      let indexes = data.Table.GlobalSecondaryIndexes || [];
      indexes.forEach(function (gsi) {
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
      if (err && err.code === 'ResourceNotFoundException') {
        return setTimeout(waitForActive, 10);
      }
      debug('Error waiting for active', err.stack);
      return deferred.reject(err);
    });
  }

  waitForActive();

  return deferred.promise.nodeify(next);
};

Table.prototype.describeTTL = function (next) {
  debug('Describing ttl for table, %s', this.name);
  const deferred = Q.defer();

  let ddb = this.base.ddb();

  let params = {
    TableName: this.name
  };
  ddb.describeTimeToLive(params, function(err, ttlDescription) {
    if (err) {
      return deferred.reject(err);
    }

    return deferred.resolve(ttlDescription);
  });

  return deferred.promise.nodeify(next);
};

Table.prototype.updateTTL = function (next) {
  debug('Updating ttl for table, %s', this.name);
  const deferred = Q.defer();

  let table = this;

  if(this.schema.expires && !this.base.endpointURL) {

    this.describeTTL()
    .then(function (ttlDesc) {
      let status = ttlDesc.TimeToLiveDescription.TimeToLiveStatus;
      if(status === 'ENABLING' || status === 'ENABLED') {
        return deferred.resolve();
      }
      let params = {
        TableName: table.name,
        TimeToLiveSpecification: {
          AttributeName: table.schema.expires.attribute,
          Enabled: true
        }
      };

      let ddb = table.base.ddb();
      ddb.updateTimeToLive(params, function(err) {
        if (err) {
          return deferred.reject(err);
        }
        return deferred.resolve();
      });
    });
  } else {
    deferred.resolve();
  }

  return deferred.promise.nodeify(next);
};

Table.prototype.describe = function (next) {
  let describeTableReq = {
    TableName: this.name
  };

  let deferred = Q.defer();

  let ddb = this.base.ddb();
  ddb.describeTable(describeTableReq, function (err, data) {
    if (err) {
      debug('error describing table', err);
      return deferred.reject(err);
    }
    deferred.resolve(data);
  });


  return deferred.promise.nodeify(next);
};

const buildTableReq = Table.prototype.buildTableReq = function buildTableReq(name, schema) {
  let attrDefs = [];

  let keyAttr = {};

  function addKeyAttr(attr) {
    if (attr) {
      keyAttr[attr.name] = attr;
    }
  }

  addKeyAttr(schema.hashKey);
  addKeyAttr(schema.rangeKey);
  for (const globalIndexName in schema.indexes.global) {
    addKeyAttr(schema.indexes.global[globalIndexName]);

    // add the range key to the attribute definitions if specified
    const rangeKeyName = schema.indexes.global[globalIndexName].indexes[globalIndexName].rangeKey;
    addKeyAttr(schema.attributes[rangeKeyName]);
  }
  for (const indexName in schema.indexes.local) {
    addKeyAttr(schema.indexes.local[indexName]);
  }

  for (const keyAttrName in keyAttr) {
    attrDefs.push({
      AttributeName: keyAttrName,
      AttributeType: keyAttr[keyAttrName].type.dynamo
    });
  }


  let keySchema = [{
    AttributeName: schema.hashKey.name,
    KeyType: 'HASH'
  }];
  if (schema.rangeKey) {
    keySchema.push({
      AttributeName: schema.rangeKey.name,
      KeyType: 'RANGE'
    });
  }

  let createTableReq = {
    AttributeDefinitions: attrDefs,
    TableName: name,
    KeySchema: keySchema
  };

  if (schema.throughput === "ON_DEMAND") {
    debug(`Using PAY_PER_REQUEST BillingMode for ${name} table creation`);
    createTableReq.BillingMode = "PAY_PER_REQUEST";
  } else {
    debug(`Using PROVISIONED BillingMode for ${name} table creation`);
    let provThroughput = {
      ReadCapacityUnits: schema.throughput.read,
      WriteCapacityUnits: schema.throughput.write
    };
    createTableReq.ProvisionedThroughput = provThroughput;
    createTableReq.BillingMode = "PROVISIONED";
  }

  debug('Creating table local indexes', schema.indexes.local);
  let localSecIndexes, index;
  for (const localSecIndexName in schema.indexes.local) {
    localSecIndexes = localSecIndexes || [];

    let indexAttr = schema.indexes.local[localSecIndexName];
    index = indexAttr.indexes[localSecIndexName];
    let localSecIndex = {
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
      if (Array.isArray(index.project)) {
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


  let globalSecIndexes;
  for (const globalSecIndexName in schema.indexes.global) {
    globalSecIndexes = globalSecIndexes || [];

    let globalIndexAttr = schema.indexes.global[globalSecIndexName];
    index = globalIndexAttr.indexes[globalSecIndexName];

    let globalSecIndex = {
      IndexName: globalSecIndexName,
      KeySchema: [{
        AttributeName: globalIndexAttr.name,
        KeyType: 'HASH'
      }]
    };

    if (createTableReq.BillingMode === "PROVISIONED") {
      let provThroughput = {
        ReadCapacityUnits: index.throughput.read,
        WriteCapacityUnits: index.throughput.write
      };
      globalSecIndex.ProvisionedThroughput = provThroughput;
    }

    if (index.rangeKey) {
      globalSecIndex.KeySchema.push({
        AttributeName: index.rangeKey,
        KeyType: 'RANGE'
      });
    }

    if (index.project) {
      if (Array.isArray(index.project)) {
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

  if (this && this.options) {
    if (this.options.streamOptions && this.options.streamOptions.enabled === true) {
      createTableReq.StreamSpecification = {
        StreamEnabled: true,
        StreamViewType: this.options.streamOptions.type
      };
    }
    if (this.options.serverSideEncryption) {
      createTableReq.SSESpecification = {
        'Enabled': true
      };
    }
  }

  return createTableReq;
};

Table.prototype.create = function (next) {
  let ddb = this.base.ddb();
  let schema = this.schema;
  let createTableReq = this.buildTableReq(this.name, schema);

  debug('ddb.createTable request:', createTableReq);

  const deferred = Q.defer();

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
  let deleteTableReq = {
    TableName: this.name
  };

  debug('ddb.deleteTable request:', deleteTableReq);

  let ddb = this.base.ddb();

  const deferred = Q.defer();

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
  // let ddb = this.base.ddb();
  // ddb.updateTable();
  const deferred = Q.defer();
  deferred.reject(new Error('TODO'));
  return deferred.promise.nodeify(next);
};

module.exports = Table;
