import util from "util";
import Q from "q";
import hooks from "hooks";
import debugWrapper from "debug";
import Table = require("./Table");
import Model from "./Model";
import { applyVirtuals, sendErrorToCallback, applyMethods, applyStatics } from "./ModelLibs";
import Plugin = require("./Plugin");
import errors = require("./errors");
const debug = debugWrapper("dynamoose:model:compile");

export function compile (name, schema, options, base) {
    debug("compiling NewModel %s", name);

    const table = new Table(name, schema, options, base);

    function NewModel (obj) {
      Model.call(this, obj);
      applyVirtuals(this, schema);
      this.$__.originalItem = obj;
    }

    // Set NewModel.name to match name of table. Original property descriptor
    // values are reused.
    const nameDescriptor = Object.getOwnPropertyDescriptor(NewModel, "name");
    // Skip if 'name' property can not be redefined. This probably means
    // code is running in a "non-standard, pre-ES2015 implementations",
    // like node 0.12.
    if (nameDescriptor.configurable) {
      nameDescriptor.value = `Model-${name}`;
      Object.defineProperty(NewModel, "name", nameDescriptor);
    }

    util.inherits(NewModel, Model);

    // minimize what is restricted
    NewModel.prototype.$__ = {
      table,
      base,
      name,
      schema,
      options,
      NewModel,
      "plugins": []
    };
    NewModel.$__ = NewModel.prototype.$__;


    NewModel.plugin = function (pluginPackage, pluginOptions) {
      const obj = {
        "event": {
          "plugin": pluginPackage,
          pluginOptions
        }
      };
      // Emit plugin type `plugin:register` with stage `pre`
      this._emit("plugin:register", "pre", obj);

      // Run actual action to create plugin
      this.$__.plugins.push(new Plugin(this, pluginPackage, pluginOptions, this.plugin.bind(this)));

      // Emit plugin type `plugin:register` with stage `post`
      this._emit("plugin:register", "post", obj);
    };

    NewModel.clearAllPlugins = function () {
      debug("Clearing all plugins");
      this.$__.plugins = [];
    };

    // This is a private function that is only used to emit signals to plugins within the Dynamoose plugin, this function should not be documentated or used outside of Dynamoose.
    NewModel._emit = async function (type, stage, obj, deferred) {

      if (!obj) {
        obj = {};
      }

      // If obj.actions is undefined set to empty object
      if (!obj.actions) {
        obj.actions = {};
      }

      for (let i = 0; i < this.$__.plugins.length; i += 1) {
        const plugin = this.$__.plugins[i];
        const result = await plugin.emit(type, stage, obj);
        if (result) {
          if (result.resolve) {
            deferred.resolve(result.resolve);
            return true;
          } else if (result.reject) {
            deferred.reject(result.reject);
            return false;
          }
        }
      }
    };

    NewModel.prototype.originalItem = function () {
      return this.$__.originalItem;
    };
    NewModel.prototype.model = function (modelName) {
      const {models} = this.$__.base;
      if (!Object.prototype.hasOwnProperty.call(models, modelName)) {
        const errorMsg = `Schema hasn't been registered for model "${modelName}".\nUse dynamoose.model(name, schema)`;
        throw new errors.ModelError(errorMsg);
      }
      return models[modelName];
    };


    NewModel.get = function (key, getOptions, next) {
      try {
        return Model.get(NewModel, key, getOptions, next);
      } catch (err) {
        sendErrorToCallback(err, getOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.populate = function (populateOptions, resultObj, fillPath) {
      try {
        return Model["populate"](populateOptions, resultObj, fillPath);
      } catch (err) {
        sendErrorToCallback(err, populateOptions);
        return Q.reject(err);
      }
    };

    NewModel.update = function (key, update, updateOptions, next) {
      try {
        return Model.update(NewModel, key, update, updateOptions, next);
      } catch (err) {
        sendErrorToCallback(err, updateOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.delete = function (key, deleteOptions, next) {
      try {
        return Model.delete(NewModel, key, deleteOptions, next);
      } catch (err) {
        sendErrorToCallback(err, deleteOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.query = function (query, queryOptions, next) {
      try {
        return Model.query(NewModel, query, queryOptions, next);
      } catch (err) {
        sendErrorToCallback(err, queryOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.queryOne = function (query, queryOneOptions, next) {
      try {
        return Model.queryOne(NewModel, query, queryOneOptions, next);
      } catch (err) {
        sendErrorToCallback(err, queryOneOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.scan = function (filter, scanOptions, next) {
      try {
        return Model.scan(NewModel, filter, scanOptions, next);
      } catch (err) {
        sendErrorToCallback(err, scanOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.create = function (obj, createOptions, next) {
      try {
        return Model.create(NewModel, obj, createOptions, next);
      } catch (err) {
        sendErrorToCallback(err, createOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.batchGet = function (keys, batchGetOptions, next) {
      try {
        return Model.batchGet(NewModel, keys, batchGetOptions, next);
      } catch (err) {
        sendErrorToCallback(err, batchGetOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.batchPut = function (keys, batchPutOptions, next) {
      try {
        return Model.batchPut(NewModel, keys, batchPutOptions, next);
      } catch (err) {
        sendErrorToCallback(err, batchPutOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.batchDelete = function (keys, batchDeleteOptions, next) {
      try {
        return Model.batchDelete(NewModel, keys, batchDeleteOptions, next);
      } catch (err) {
        sendErrorToCallback(err, batchDeleteOptions, next);
        return Q.reject(err);
      }
    };

    NewModel.waitForActive = function (timeout, next) {
      return table.waitForActive(timeout, next);
    };

    NewModel.getTableReq = function () {
      return table.buildTableReq(table.name, table.schema);
    };

    NewModel.conditionCheck = function (key, conditionCheckOptions, next) {
      try {
        return Model.conditionCheck(NewModel, key, conditionCheckOptions, next);
      } catch (err) {
        sendErrorToCallback(err, conditionCheckOptions, next);
        return Q.reject(err);
      }
    };

    function createTransactionFunction (func, val, optionsIndex) {
      return async function (...args) {
        if (typeof args[args.length - 1] === "function") {
          console.warn("Dynamoose Warning: Passing callback function into transaction method not allowed. Removing callback function from list of arguments.");
          // Callback function passed in which is not allowed, removing that from arguments list
          args.pop();
        }

        // Adding returnRequest to options
        if (args.length >= optionsIndex + 1) {
          args[optionsIndex] = {...args[optionsIndex], "returnRequest": true};
        } else if (args.length < optionsIndex) {
          args[optionsIndex] = {"returnRequest": true};
        } else {
          args.push({"returnRequest": true});
        }

        const requestObj = await func(...args);

        if (val === "Update") {
          delete requestObj.ReturnValues;
        }

        return {[val]: requestObj};
      };
    }
    NewModel.transaction = [
      // method - the method to be called when the user calls this method
      // key - the key to be attached to the returned request object to pass into the DynamoDB transaciton request
      // name - the name to attach to the resulting object for NewModel.transaction
      // optionsIndex - the zero-based index for where the options parameter should be in the method arguments list
      {"method": NewModel.get, "key": "Get", "name": "get", "optionsIndex": 1},
      {"method": NewModel.delete, "key": "Delete", "name": "delete", "optionsIndex": 1},
      {"method": NewModel.create, "key": "Put", "name": "create", "optionsIndex": 1},
      {"method": NewModel.update, "key": "Update", "name": "update", "optionsIndex": 2},
      {"method": NewModel.conditionCheck, "key": "ConditionCheck", "name": "conditionCheck", "optionsIndex": 1}
    ].reduce((original, newItem) => {
      original[newItem.name] = createTransactionFunction(newItem.method, newItem.key, newItem.optionsIndex);
      return original;
    }, {});

    // apply methods and statics
    applyMethods(NewModel, schema);
    applyStatics(NewModel, schema);

    // set up middleware
    for (const k in hooks) {
      NewModel[k] = hooks[k];
    }

    table.init((err) => {
      if (err) {
        throw err;
      }
    });

    return NewModel;
  }