'use strict';
var util = require('util');
var Q = require('q');
var hooks = require('hooks');
var Table = require('./Table');
var Query = require('./Query');
var Scan = require('./Scan');
var errors = require('./errors');


var debug = require('debug')('dynamoose:model');

function Model(obj) {
  this.$__.isNew = true;

  for(var key in obj) {
    this[key] = obj[key];
  }
}

Model.compile = function compile (name, schema, options, base) {
  debug('compiling NewModel %s', name);

  var table = new Table(name, schema, options, base);

  /*jshint validthis: true */
  function NewModel (obj) {
    Model.call(this, obj);
  }

  util.inherits(NewModel, Model);

  // minimize what is restricted
  NewModel.prototype.$__ = {
    table: table,
    base: base,
    name: name,
    schema: schema,
    options: options
  };
  NewModel.$__ = NewModel.prototype.$__;

  NewModel.get = function (key, options, next) {
    return Model.get(NewModel, key, options, next);
  };

  NewModel.update = function (key, update, options, next) {
    return Model.update(NewModel, key, update, options, next);
  };

  NewModel.delete = function (key, options, next) {
    return Model.delete(NewModel, key, options, next);
  };

  NewModel.query = function (query, options, next) {
    return Model.query(NewModel, query, options, next);
  };

  NewModel.queryOne = function (query, options, next) {
    return Model.queryOne(NewModel, query, options, next);
  };

  NewModel.scan = function (filter, options, next) {
    return Model.scan(NewModel, filter, options, next);
  };

  NewModel.create = function (obj, options, next) {
    return Model.create(NewModel, obj, options, next);
  };

  NewModel.waitForActive = function (timeout, next) {
    return table.waitForActive(timeout, next);
  };

  // set up middleware
  for (var k in hooks) {
    NewModel[k] = hooks[k];
  }

  table.init(function (err) {
    if(err) {
      throw err;
    }
  });

  return NewModel;
};



Model.prototype.put = function(options, next) {
  debug('put', this);
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }
  if(options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = true;
  }
  var schema = this.$__.schema;
  var item = {
    TableName: this.$__.name,
    Item: schema.toDynamo(this)
  };
  if(!options.overwrite) {
    item.Expected = {};
    item.Expected[schema.hashKey.name] = {ComparisonOperator: 'NULL'};
    if(schema.rangeKey) {
      item.Expected[schema.rangeKey.name] = {ComparisonOperator: 'NULL'};
    }
  }

  debug('putItem', item);

  var model = this;
  var model$ = this.$__;

  function put() {
    var deferred = Q.defer();
    model$.base.ddb().putItem(item, function(err) {
      if(err) {
        deferred.reject(err);
      }
      deferred.resolve(model);
    });

    return deferred.promise.nodeify(next);
  }


  if(model$.options.waitForActive) {
    return model$.table.waitForActive().then(put);
  }

  return put();


};

Model.prototype.save = Model.prototype.put;

Model.create = function(NewModel, obj, options, next) {
  options = options || {};

  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  if(options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = false;
  }

  var model = new NewModel(obj);
  return model.save(options, next);
};

Model.get = function(NewModel, key, options, next) {
  debug('Get %j', key);
  var deferred = Q.defer();
  if(key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
    deferred.reject(
      new errors.ModelError('Range key required: ' + schema.rangeKey.name)
    );
    return deferred.promise.nodeify(next);
  }


  var getReq = {
    TableName: NewModel.$__.name,
    Key: {}
  };

  getReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

  if(schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    getReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  if(options.attributes) {
    getReq.AttributesToGet = options.attributes;
  }

  if(options.consistent) {
    getReq.ConsistentRead = true;
  }

  var newModel$ = NewModel.$__;

  function get () {
    debug('getItem', getReq);
    newModel$.base.ddb().getItem(getReq, function(err, data) {
      if(err) {
        debug('Error returned by getItem', err);
        return deferred.reject(err);
      }
      debug('getItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();
      model.$__.isNew = false;
      schema.parseDynamo(model, data.Item);

      debug('getItem parsed model', model);

      deferred.resolve(model);
    });
  }


  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(get);
  } else {
    get();
  }
  return deferred.promise.nodeify(next);
};

/* NewModel.update({id: 123},
// {
//   $PUT: {a: 1, b: 2},
//   $DELETE: {c: 'a'},
//   $ADD: {count: 1}
// });
// NewModel.update({id: 123}, { $PUT: {a: 1, b: 2} });
// NewModel.update({id: 123}, {a: 1, b: 2} ); // Defaults to put (same as above)*/
Model.update = function(NewModel, key, update, options, next) {
  debug('Update %j', key);
  var deferred = Q.defer();
  if(key === null || key === undefined) {
    deferred.reject(new errors.ModelError('Key required to get item'));
    return deferred.promise.nodeify(next);
  }
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
    deferred.reject(new errors.ModelError('Range key required: ' + schema.rangeKey.name));
    return deferred.promise.nodeify(next);
  }


  var updateReq = {
    TableName: NewModel.$__.name,
    Key: {},
    AttributeUpdates: {},
    ReturnValues: 'ALL_NEW'
  };

  updateReq.Key[hashKeyName] = schema.hashKey.toDynamo(key[hashKeyName]);

  if(schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    updateReq.Key[rangeKeyName] = schema.rangeKey.toDynamo(key[rangeKeyName]);
  }

  if(update.$PUT || (!update.$PUT && !update.$DELETE && !update.$ADD)) {
    var updatePUT = update;
    if(update.$PUT) {
      updatePUT = update.$PUT;
    }
    for(var putItem in updatePUT) {
      var putAttr = schema.attributes[putItem];
      if(putAttr) {
        var val = updatePUT[putItem];
        if(val === null || val === undefined || val === '') {
          updateReq.AttributeUpdates[deleteItem] = {
            Action: 'DELETE'
          };
        } else {
          updateReq.AttributeUpdates[putItem] = {
            Action: 'PUT',
            Value: putAttr.toDynamo(val)
          };
        }
      }
    }
  }

  if(update.$DELETE) {
    for(var deleteItem in update.$DELETE) {
      var deleteAttr = schema.attributes[deleteItem];
      if(deleteAttr) {
        var delVal = update.$DELETE[deleteItem];
        if(delVal !== null && delVal !== undefined) {
          updateReq.AttributeUpdates[deleteItem] = {
            Action: 'DELETE',
            Value: deleteAttr.toDynamo(delVal)
          };
        } else {
          updateReq.AttributeUpdates[deleteItem] = {
            Action: 'DELETE'
          };

        }
      }
    }
  }


  if(update.$ADD) {
    for(var addItem in update.$ADD) {
      var addAttr = schema.attributes[addItem];
      if(addAttr) {
        updateReq.AttributeUpdates[addItem] = {
          Action: 'ADD',
          Value: addAttr.toDynamo(update.$ADD[addItem])
        };
      }
    }
  }

  var newModel$ = NewModel.$__;

  function updateItem () {
    debug('updateItem', updateReq);
    newModel$.base.ddb().updateItem(updateReq, function(err, data) {
      if(err) {
        debug('Error returned by updateItem', err);
        return deferred.reject(err);
      }
      debug('updateItem response', data);

      if(!Object.keys(data).length) {
        return deferred.resolve();
      }

      var model = new NewModel();
      model.$__.isNew = false;
      schema.parseDynamo(model, data.Attributes);

      debug('updateItem parsed model', model);

      deferred.resolve(model);
    });
  }

  if(newModel$.options.waitForActive) {
    newModel$.table.waitForActive().then(updateItem);
  } else {
    updateItem();
  }

  return deferred.promise.nodeify(next);
};

Model.delete = function(NewModel, key, options, next) {

  var schema = NewModel.$__.schema;

  var hashKeyName = schema.hashKey.name;
  if(!key[hashKeyName]) {
    var keyVal = key;
    key = {};
    key[hashKeyName] = keyVal;
  }

  if(schema.rangeKey && !key[schema.rangeKey.name]) {
    var deferred = Q.defer();
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }

  var model = new NewModel(key);
  return model.delete(options, next);
};

Model.prototype.delete = function(options, next) {
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = this.$__.schema;

  var hashKeyName = schema.hashKey.name;

  var deferred = Q.defer();

  if(this[hashKeyName] === null || this[hashKeyName] === undefined) {
    deferred.reject(new errors.ModelError('Hash key required: %s', hashKeyName));
    return deferred.promise.nodeify(next);
  }

  if(schema.rangeKey &&
    (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    deferred.reject(new errors.ModelError('Range key required: %s', schema.hashKey.name));
    return deferred.promise.nodeify(next);
  }


  var getDelete = {
    TableName: this.$__.name,
    Key: {}
  };

  getDelete.Key[hashKeyName] = schema.hashKey.toDynamo(this[hashKeyName]);

  if(schema.rangeKey) {
    var rangeKeyName = schema.rangeKey.name;
    getDelete.Key[rangeKeyName] = schema.rangeKey.toDynamo(this[rangeKeyName]);
  }

  if(options.update) {
    getDelete.ReturnValues = 'ALL_OLD';
    getDelete.Expected = {};
    getDelete.Expected[schema.hashKey.name] = {ComparisonOperator: 'NOT_NULL'};
    if(schema.rangeKey) {
      getDelete.Expected[schema.rangeKey.name] = {ComparisonOperator: 'NOT_NULL'};
    }
  }

  var model = this;
  var model$ = this.$__;

  function deleteItem() {

    debug('deleteItem', getDelete);
    model$.base.ddb().deleteItem(getDelete, function(err, data) {
      if(err) {
        debug('Error returned by deleteItem', err);
        return deferred.reject(err);
      }
      debug('deleteItem response', data);

      if(options.update) {
        if(data.Attributes) {
          schema.parseDynamo(model, data.Attributes);
          debug('deleteItem parsed model', model);
        }
      }

      deferred.resolve(model);
    });
  }

  if(model$.options.waitForActive) {
    model$.table.waitForActive().then(deleteItem);
  } else {
    deleteItem();
  }

  return deferred.promise.nodeify(next);

};

/*
query(query, options, callback);
query(query, options)...exec(callback);
query(query, callback);
query(query)...exec(callback);
query({hash: {id: {eq : 1}}, range: {name: {beginwith: 'foxy'}}})
query({id: 1})
query('id').eq(1).where('name').begienwith('foxy')
*/
Model.query = function(NewModel, query, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);

  if(next) {
    query.exec(next);
  }

  return query;
};

Model.queryOne = function(NewModel, query, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  query = new Query(NewModel, query, options);
  query.one();

  if(next) {
    query.exec(next);
  }

  return query;
};

/*

scan(filter, options, callback);
scan(filter, options)...exec(callback);
scan(filter, callback);
scan(filter)...exec(callback);

scan('id').between(a, b).and().where('name').begienwith('foxy').exec();

scan().exec(); // All records

*/
Model.scan = function(NewModel, filter, options, next) {
  if(typeof options === 'function') {
    next = options;
    options = null;
  }

  var scan = new Scan(NewModel, filter, options);

  if(next) {
    scan.exec(next);
  }

  return scan;
};


module.exports = Model;
