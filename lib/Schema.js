'use strict';

const Attribute = require('./Attribute');
const errors = require('./errors');
const VirtualType = require('./VirtualType');
//const util = require('util');

const debug = require('debug')('dynamoose:schema');


function Schema(obj, options) {
  debug('Creating Schema', obj);

  this.tree = {};
  this.methods = {};
  this.statics = {};
  this.virtuals = {};
  this.options = options || {};

  if(this.options.throughput) {
    let throughput = this.options.throughput;
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
    let createdAt = null;
    let updatedAt = null;

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
      throw new errors.SchemaError('Invalid syntax for timestamp: ' + this.options.timestamps);
    }

    obj[createdAt] = obj[createdAt] || {};
    obj[createdAt].type = Date;
    obj[createdAt].default = Date.now;


    obj[updatedAt] = obj[updatedAt] || {};
    obj[updatedAt].type = Date;
    obj[updatedAt].default = Date.now;
    obj[updatedAt].set = function() { return Date.now(); };
    this.timestamps = { createdAt: createdAt, updatedAt: updatedAt };
  }


  /*
  * Added support for expires attribute
  */
  if (this.options.expires !== null && this.options.expires !== undefined ) {
    let expires = {
      attribute: 'expires',
      returnExpiredItems: true
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

      if (typeof this.options.expires.returnExpiredItems === "boolean") {
        expires.returnExpiredItems = this.options.expires.returnExpiredItems;
      }

      if (typeof this.options.expires.defaultExpires === "function") {
        expires.defaultExpires = this.options.expires.defaultExpires;
      }
    } else {
      throw new errors.SchemaError('Invalid syntax for expires: ' + this.options.expires);
    }

    let defaultExpires = function () {
      return new Date(Date.now() + (expires.ttl * 1000));
    };

    obj[expires.attribute] = {
      type: Number,
      default: expires.defaultExpires || defaultExpires,
      set: function(v) {
        return Math.floor(v.getTime() / 1000);
      },
      get: function (v) {
        return new Date(v * 1000);
      }
    };
    this.expires = expires;
  }
  this.useDocumentTypes = this.options.useDocumentTypes === undefined ? true : this.options.useDocumentTypes;
  this.useNativeBooleans = this.options.useNativeBooleans === undefined ? true : this.options.useNativeBooleans;
  this.attributeFromDynamo = this.options.attributeFromDynamo;
  this.attributeToDynamo = this.options.attributeToDynamo;

  this.attributes = {};
  this.indexes = {local: {}, global: {}};

  for(const n in obj) {

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

Schema.prototype.toDynamo = async function(model, options) {

  let dynamoObj = {};
  let name, attr;

  for(name in model) {
    if(!model.hasOwnProperty(name)){
      continue;
    }
    if (model[name] === undefined || model[name] === null || Number.isNaN(model[name])) {
      debug('toDynamo: skipping attribute: %s because its definition or value is null, undefined, or NaN', name);
      continue;
    }
    attr = this.attributes[name];
    if((!attr && this.options.saveUnknown === true) || (Array.isArray(this.options.saveUnknown) && this.options.saveUnknown.indexOf(name) >= 0)) {
      attr = Attribute.create(this, name, model[name]);
      this.attributes[name] = attr;
    }
  }

  for(name in this.attributes) {
    attr = this.attributes[name];

    await attr.setDefault(model);
    let dynamoAttr;
    if (this.attributeToDynamo) {
      dynamoAttr = await this.attributeToDynamo(name, model[name], model, attr.toDynamo.bind(attr), options);
    } else {
      dynamoAttr = await attr.toDynamo(model[name], undefined, model, options);
    }
    if(dynamoAttr) {
      dynamoObj[attr.name] = dynamoAttr;
    }
  }

  debug('toDynamo: %s', dynamoObj );
  return dynamoObj;
};

Schema.prototype.parseDynamo = async function(model, dynamoObj) {

  for(const name in dynamoObj) {
    let attr = this.attributes[name];

    if (!attr && this.options.errorUnknown) {
      const hashKey = this.hashKey && this.hashKey.name && dynamoObj[this.hashKey.name] && JSON.stringify(dynamoObj[this.hashKey.name]);
      const rangeKey = this.rangeKey && this.rangeKey.name && JSON.stringify(dynamoObj[this.rangeKey.name]);
      let errorMessage = `Unknown top-level attribute ${name} on model ${model.$__.name} with `;
      if (hashKey) errorMessage += `hash-key ${hashKey} and `;
      if (rangeKey) errorMessage += `range-key ${rangeKey} and `;
      errorMessage += `value: ${JSON.stringify(dynamoObj[name])}`;
      throw new errors.ParseError(errorMessage)
    }
    if((!attr && this.options.saveUnknown === true) || (Array.isArray(this.options.saveUnknown) && this.options.saveUnknown.indexOf(name) >= 0)) {
      attr = Attribute.createUnknownAttributeFromDynamo(this, name, dynamoObj[name]);
      this.attributes[name] = attr;
    }

    if(attr) {
      let attrVal;
      if (this.attributeFromDynamo) {
        attrVal = await this.attributeFromDynamo(name, dynamoObj[name], attr.parseDynamo.bind(attr), model);
      } else {
        attrVal = await attr.parseDynamo(dynamoObj[name]);
      }
      if (attrVal !== undefined && attrVal !== null) {
        model[name] = attrVal;
      }
    } else {
      debug('parseDynamo: received an attribute name (%s) that is not defined in the schema', name);
    }
  }

  if (model.$__) {
    model.$__.originalItem = JSON.parse(JSON.stringify(model));
  }

  debug('parseDynamo: %s', model);

  return dynamoObj;

};

/**
* Adds an instance method to documents constructed from Models compiled from this schema.
*
* ####Example
*
*     let schema = kittySchema = new Schema(..);
*
*     schema.method('meow', function () {
*       console.log('meeeeeoooooooooooow');
*     })
*
*     let Kitty = mongoose.model('Kitty', schema);
*
*     let fizz = new Kitty;
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
    for (const i in name){
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
*     let schema = new Schema(..);
*     schema.static('findByName', function (name, callback) {
*       return this.find({ name: name }, callback);
*     });
*
*     let Drink = mongoose.model('Drink', schema);
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
    for (const i in name){
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
  //let virtuals = this.virtuals;
  const parts = name.split('.');

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
