const debug = require('debug')('dynamoose:plugin');
const Listener = require('./Listener');

function Plugin(model, func, options, registerPlugin) {
	this.name = '';
	this.description = '';
	this.listeners = [];
	this._model = model;
	this.registerPlugin = registerPlugin;

	const self = this;
	func({
		setName: function(name) {
			self.name = name;
			debug('Set plugin name to ' + name);
		},
		setDescription: function(description) {
			self.description = description;
			debug('Set description to ' + description);
		},

		// Ability for plugin to add listeners on certain events emmited from Dynamoose
		on: function(type, stage, func)  {
			// If type is not passed in then set func to type, and stage to null, and type to null, this will make type an optional catch all parameter
			if (typeof type === 'function') {
				func = type;
				type = null;
				stage = null;
			}
			// If stage is not passed in then set func to stage, and stage to null, this will make stage an optional parameter
			else if (typeof stage === 'function') {
				func = stage;
				stage = null;
			}

			if (type === '*') {
				type = null;
			}
			if (stage === '*') {
				stage = null;
			}

			self.listeners.push(new Listener(type, stage, func, this));
		}
	}, options);
	this.emit('plugin', 'init');
}

Plugin.prototype.emit = async function (type, stage, obj) {
	debug('Received emit');
	debug('Type: ' + type);
	debug('Stage: ' + stage);
	debug('Filtering listeners that match type and stage');
	const listenersToRun = this.listeners.filter(function(listener) {
		// filter listeners where type is the same and stage is null or the same
		return ((!listener.type || listener.type === type) && (!listener.stage || listener.stage === stage));
	});

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
	for (let i = 0; i < listenersToRun.length; i++) {
		const listener = listenersToRun[i];
		const result = await listener.emit(type, stage, obj);
		if (result && (result.resolve || result.reject)) {
			return result;
        }
	}
};

module.exports = Plugin;
