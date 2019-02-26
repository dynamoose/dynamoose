'use strict';

const debug = require('debug')('dynamoose:plugin');
const Listener = require('./Listener');

/**
 * @alias module:plugin
 * @typicalname Plguin
*/
/**
 * This is a helper to bind new plugins and the events they trigger to your model.
 * This helper is consumed by the Model, and not directly when creating a Plugin.
 * @param {class} model - the passed in model class
 * @param {function} func - the user provided plugin function
 * @param {object} options - the user provided options
 * @param {function} registerPlugin - the bound model plugin method
 */
function Plugin (model, func, options, registerPlugin) {
  this.name = '';
  this.description = '';
  this.listeners = [];
  this._model = model;
  this.registerPlugin = registerPlugin;

  func({

    /**
     * Sets the plugin name
     * @param  {string} name - the name of the plugin
     */
    'setName': (name) => {
      this.name = name;
      debug(`Set plugin name to ${name}`);
    },

    /**
     * Sets the plugin description
     * @param  {string} description - the description of the plugin
     */
    'setDescription': (description) => {
      this.description = description;
      debug(`Set description to ${description}`);
    },

    /**
     * This allows for the ability for plugin to add listeners on certain events emmited from Dynamoose.
     * This is the function that gets called from your plugin.on() hook.
     *
     * This example will reject a put if they attempt to modify a key you don't want modified.
     *```js
     *plugin.on('model:put', 'put:called', (pluginEvent) => {
     *    const {event, model} = pluginEvent;
     *    const ItemToTransform = event.item.Item;
     *    const mutatingKeys = Object.keys(putQuery);
     *    const staticOnlyKeys = 'id'
     *    const result = {}
     *    if (mutatingKeys.includes(staticOnlyKeys)) {
     *      result.reject = 'This key must not be included, we manage it.';
     *    } else {
     *      result.resolve = 'Good to go.'
     *    }
     *    return Promise.resolve(result)
     *  }
     *)
     *```
     *
     * @param  {mixed} type - if a string, sets what type to listen to, a function sets listeners on all event stages and types
     * @param  {mixed} stage - if a string, sets the stage to listen to, a function sets listeners on all stage for the preceding type
     * @param  {function} onFunction - the function to call with the correct payloads at the defined type and stage
     */
    'on': (type, stage, onFunction) => {
      // If type is not passed in then set func to type, and stage to null, and type to null, this will make type an optional catch all parameter
      if (typeof type === 'function') {
        onFunction = type;
        type = null;
        stage = null;
      } else if (typeof stage === 'function') {
        // If stage is not passed in then set func to stage, and stage to null, this will make stage an optional parameter
        onFunction = stage;
        stage = null;
      }

      if (type === '*') {
        type = null;
      }
      if (stage === '*') {
        stage = null;
      }

      this.listeners.push(new Listener(type, stage, onFunction, this));
    }
  }, options);
  this.emit('plugin', 'init');
}

/**
 * Sets up the model for all built listeners
 * @param  {string} type - the type of model change occuring
 * @param  {string} stage - the stage, pre or post, of the type being emitted
 * @param  {object} obj - the Plugin object to configure for listeners
 */
Plugin.prototype.emit = async function (type, stage, obj) {
  debug('Received emit');
  debug(`Type: ${type}`);
  debug(`Stage: ${stage}`);
  debug('Filtering listeners that match type and stage');
  // filter listeners where type is the same and stage is null or the same
  const listenersToRun = this.listeners.filter((listener) => (!listener.type || listener.type === type) && (!listener.stage || listener.stage === stage));

  // If obj is undefined set to empty object
  if (!obj) {
    obj = {};
  }
  // If obj.actions is undefined set to empty object
  if (!obj.actions) {
    obj.actions = {};
  }

  // Map actions.registerPlugin to Model.plugin function
  obj.actions.registerPlugin = this.registerPlugin;

  // Adding Model specific things to object
  obj.model = this._model;
  obj.modelName = this._model.$__.name;
  obj.plugins = this._model.$__.plugins;

  obj.plugin = this;
  for (let i = 0; i < listenersToRun.length; i += 1) {
    const listener = listenersToRun[i];
    const result = await listener.emit(type, stage, obj);
    if (result && (result.resolve || result.reject)) {
      return result;
    }
  }
};

module.exports = Plugin;
