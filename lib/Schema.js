'use strict';

var Attribute = require('./Attribute');
var errors = require('./errors');
var VirtualType = require('./VirtualType');
//var util = require('util');

var debug = require('debug')('dynamoose:schema');



function Schema(obj, options) {
  debug('Creating Schema', obj);

  this.options = options || {};

  this.methods = {};
  this.statics = {};
  this.virtuals = {};
  this.tree = {};

  if(this.options.throughput) {
    var throughput = this.options.throughput;
    if(typeof throughput === 'number') {
      throughput = {read: throughput, write: throughput};
    }
    this.throughput = throughput;
  } else {
    this.throughput = {read: 1, write: 1};
  }

  if((!this.throughput.read || !this.throughput.write) &&
    this.throughput.read >= 1 && this.throughput.write >= 1) {
    throw new errors.SchemaError('Invalid throughput: '+ this.throughput);
  }

  /*
    * Added support for timestamps attribute
    */
  if (this.options.timestamps) {
    var createdAt = null;
    var updatedAt = null;

    if (this.options.timestamps === true) {
      createdAt = 'createdAt';
      updatedAt = 'updatedAt';
    } else if (typeof this.options.timestamps === 'object') {
      if (this.options.timestamps.createdAt && this.options.timestamps.updatedAt) {
        createdAt = this.options.timestamps.createdAt;
        updatedAt = this.options.timestamps.updatedAt;
      } else {
        throw new errors.SchemaError('Missing createdAt and updatedAt timestamps attribute. Maybe set timestamps: true?');
      }
    } else {
      throw new errors.SchemaError('Invalid syntax for timestamp: ' + name);
    }

    obj[createdAt] = { type: Date, default: Date.now };
    obj[updatedAt] = { type: Date, default: Date.now, set: function() { return Date.now(); } };
    this.timestamps = { createdAt: createdAt, updatedAt: updatedAt };
  }


  /*
    * Added support for expires attribute
    */
  if (this.options.expires !== null && this.options.expires !== undefined ) {
    var expires = {
      attribute: 'expires'
    };

    if (typeof this.options.expires === 'number') {
      expires.ttl = this.options.expires;

    } else if (typeof this.options.expires === 'object') {
      if (typeof this.options.expires.ttl === 'number') {
        expires.ttl = this.options.expires.ttl;
      } else {
        throw new errors.SchemaError('Missing or invalided ttl for expires attribute.');
      }
      if(typeof this.options.expires.attribute === 'string') {
        expires.attribute = this.options.expires.attribute;
      }
    } else {
      throw new errors.SchemaError('Invalid syntax for expires: ' + name);
    }

    var defaultExpires = function () {
      return new Date(Date.now() + (expires.ttl * 1000));
    };

    obj[expires.attribute] = {
      type: Number,
      default: defaultExpires,
      set: function(v) {
        return Math.floor(v.getTime() / 1000);
      },
      get: function (v) {
        return new Date(v * 1000);
      }
    };
    this.expires = expires;
  }
  this.useDocumentTypes = !!this.options.useDocumentTypes;
  this.useNativeBooleans = !!this.options.useNativeBooleans;
  this.attributeFromDynamo = this.options.attributeFromDynamo;
  this.attributeToDynamo = this.options.attributeToDynamo;

  this.attributes = {};
  this.indexes = {local: {}, global: {}};

  for(var n in obj) {

    if(this.attributes[n]) {
      throw new errors.SchemaError('Duplicate attribute: ' + n);
    }

    debug('Adding Attribute to Schema (%s)', n, obj);
    this.attributes[n] = Attribute.create(this, n, obj[n]);
  }
}

/*Schema.prototype.attribute = function(name, obj) {
  debug('Adding Attribute to Schema (%s)', name, obj);

  this Attribute.create(name, obj);

};*/

Schema.prototype.toDynamo = function(model) {

  var dynamoObj = {};
  var name, attr;

  for(name in model) {
    if(!model.hasOwnProperty(name)){
      continue;
    }
    attr = this.attributes[name];

    if(!attr & this.options.saveUnknown) {
      attr = Attribute.create(this, name, typeof model[name]);
      this.attributes[name] = attr;
    }
  }

  for(name in this.attributes) {
    attr = this.attributes[name];

    attr.setDefault(model);
    var dynamoAttr;
    if (this.attributeToDynamo) {
      dynamoAttr = this.attributeToDynamo(name, model[name], model, attr.toDynamo.bind(attr));
    } else {
      dynamoAttr = attr.toDynamo(model[name], undefined, model);
    }
    if(dynamoAttr) {
      dynamoObj[attr.name] = dynamoAttr;
    }
  }

  debug('toDynamo: %s', JSON.stringify(dynamoObj) );
  return dynamoObj;
};

Schema.prototype.parseDynamo = function(model, dynamoObj) {

  for(var name in dynamoObj) {
    var attr = this.attributes[name];

    if(!attr & this.options.saveUnknown) {
      var type = Attribute.lookupType(dynamoObj[name]);
      attr = Attribute.create(this, name, type);
      this.attributes[name] = attr;
    }

    if(attr) {
      var attrVal;
      if (this.attributeFromDynamo) {
        attrVal = this.attributeFromDynamo(name, dynamoObj[name], attr.parseDynamo.bind(attr));
      } else {
        attrVal = attr.parseDynamo(dynamoObj[name]);
      }
      if (attrVal !== undefined && attrVal !== null) {
        model[name] = attrVal;
      }
    }
  }

  debug('parseDynamo: %s',JSON.stringify(model));

  return dynamoObj;

};

/**
 * Adds an instance method to documents constructed from Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = kittySchema = new Schema(..);
 *
 *     schema.method('meow', function () {
 *       console.log('meeeeeoooooooooooow');
 *     })
 *
 *     var Kitty = mongoose.model('Kitty', schema);
 *
 *     var fizz = new Kitty;
 *     fizz.meow(); // meeeeeooooooooooooow
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
 *
 *     schema.method({
 *         purr: function () {}
 *       , scratch: function () {}
 *     });
 *
 *     // later
 *     fizz.purr();
 *     fizz.scratch();
 *
 * @param {String|Object} method name
 * @param {Function} [fn]
 * @api public
 */

Schema.prototype.method = function (name, fn) {
  if (typeof name !== 'string' ){
    for (var i in name){
      this.methods[i] = name[i];
    }
  } else {
    this.methods[name] = fn;
  }
  return this;
};

/**
 * Adds static "class" methods to Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = new Schema(..);
 *     schema.static('findByName', function (name, callback) {
 *       return this.find({ name: name }, callback);
 *     });
 *
 *     var Drink = mongoose.model('Drink', schema);
 *     Drink.findByName('sanpellegrino', function (err, drinks) {
 *       //
 *     });
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

Schema.prototype.static = function(name, fn) {
  if (typeof name !== 'string' ){
    for (var i in name){
      this.statics[i] = name[i];
    }
  } else {
    this.statics[name] = fn;
  }
  return this;
};


/**
 * Creates a virtual type with the given name.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {VirtualType}
 */

Schema.prototype.virtual = function (name, options) {
  //var virtuals = this.virtuals;
  var parts = name.split('.');

  return this.virtuals[name] = parts.reduce(function (mem, part, i) {
    mem[part] || (mem[part] = (i === parts.length-1) ? new VirtualType(options, name) : {});
    return mem[part];
  }, this.tree);
};

/**
 * Returns the virtual type with the given `name`.
 *
 * @param {String} name
 * @return {VirtualType}
 */

Schema.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

module.exports = Schema;
