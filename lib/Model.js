'use strict';
var util = require('util');
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
    Model.get(NewModel, key, options, next);
  };

  NewModel.delete = function (key, options, next) {
    Model.delete(NewModel, key, options, next);
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
  if(options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = true;
  }
  if(typeof options === 'function') {
    next = options;
    options = {};
  }
  var schema = this.$__.schema;
  var item = {
    TableName: this.$__.name,
    Item: schema.toDynamo(this)
  };
  if(options.overwrite) {
    item.Expected = {};
    item.Expected[schema.hashKey.name] = {Exists: false};
    if(schema.rangeKey) {
      item.Expected[schema.rangeKey.name] = {Exists: false};
    }
  }

  debug('putItem', item);
  this.$__.base.ddb().putItem(item, function(err) {
    next(err);
  });
};

Model.prototype.save = Model.prototype.put;

Model.create = function(NewModel, obj, options, next) {
  options = options || {};
  if(options.overwrite === null || options.overwrite === undefined) {
    options.overwrite = false;
  }

  if(typeof options === 'function') {
    next = options;
    options = {};
  }
  var model = new NewModel(obj);
  model.save(options, function (err) {
    if(err) {
      debug('Error creating new model - obj: %j', obj, err);
      return next(err);
    }
    return next(null, model);
  });
};

Model.get = function(NewModel, key, options, next) {
  debug('Get %j', key);
  if(key === null || key === undefined) {
    return next(new errors.ModelError('Key required to get item'));
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
    return next(new errors.ModelError('Range key required: ' + schema.rangeKey.name));
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


  debug('getItem', getReq);
  NewModel.$__.base.ddb().getItem(getReq, function(err, data) {
    if(err) {
      debug('Error returned by getItem', err);
      return next(err);
    }
    debug('getItem response', data);

    if(!Object.keys(data).length) {
      return next();
    }

    var model = new NewModel();
    model.$__.isNew = false;
    schema.parseDynamo(model, data.Item);

    debug('getItem parsed model', model);

    next(null, model);
  });
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
    return next(new errors.ModelError('Range key required: %s', schema.hashKey.name));
  }

  var model = new NewModel(key);
  model.delete(options, next);
};

Model.prototype.delete = function(options, next) {
  options = options || {};
  if(typeof options === 'function') {
    next = options;
    options = {};
  }

  var schema = this.$__.schema;

  var hashKeyName = schema.hashKey.name;

  if(this[hashKeyName] === null || this[hashKeyName] === undefined) {
    return next(new errors.ModelError('Hash key required: %s', hashKeyName));
  }

  if(schema.rangeKey &&
    (this[schema.rangeKey.name] === null || this[schema.rangeKey.name] === undefined)) {
    return next(new errors.ModelError('Range key required: %s', schema.hashKey.name));
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
  }


  debug('deleteItem', getDelete);
  this.$__.base.ddb().deleteItem(getDelete, function(err, data) {
    if(err) {
      debug('Error returned by deleteItem', err);
      return next(err);
    }
    debug('deleteItem response', data);

    if(options.update) {
      schema.parseDynamo(this, data.Item);
      debug('deleteItem parsed model', this);

    }

    next(null);
  }.bind(this));

};

Model.update = function(NewModel, key, updates, next) {
  next(new Error('TODO'));
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