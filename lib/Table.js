'use strict';

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
  debug('initializing table', this);
  this.describe(function (err) {
    if(err && err.code === 'ResourceNotFoundException' && this.options.create) {
      debug('table does not exist -- creating');
      return this.create(next);
    }
    if(err) {
      debug('error initializing', err);
      return next(err);
    }

    debug('table exist -- initialization done');
    // TODO verify table keys and index's match
    return next();
  }.bind(this));
};

Table.prototype.describe = function(next) {
  var describeTableReq = {
    TableName: this.name
  };

  debug('ddb.describeTable request: %j', describeTableReq);

  var ddb = this.base.ddb();
  ddb.describeTable(describeTableReq, function(err, data) {
    if(err) {
      debug('error describing table', err);
    } else {
      debug('got table description: %j', data);
    }
    next(err, data);
  });

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


  ddb.createTable(createTableReq, function(err, data) {
    if(err) {
      debug('error creating table', err);
    } else {
      debug('table created', data);
    }
    next(err, data);
  });
};

Table.prototype.delete = function(next) {
  var deleteTableReq = {
    TableName: this.name
  };

  debug('ddb.deleteTable request:', deleteTableReq);

  var ddb = this.base.ddb();
  ddb.deleteTable(deleteTableReq, function(err, data) {
    if(err) {
      debug('error deleting table', err);
    } else {
      debug('deleted table', data);
    }
    next(err, data);
  });
};

Table.prototype.update = function(next) {
  var ddb = this.base.ddb();
  ddb.updateTable();
  next(new Error('TODO'));
};

module.exports = Table;
