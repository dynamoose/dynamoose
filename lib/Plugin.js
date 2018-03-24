var debug = require('debug')('dynamoose:plugin');
var Listener = require('./Listener');

function Plugin(model, func, options) {
	this.name = '';
	this.description = '';
	this.listeners = [];
	
	var self = this;
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
}

Plugin.prototype.emit = function (type, stage, obj) {
	debug('Received emit');
	debug('Type: ' + type);
	debug('Stage: ' + stage);
	debug('Filtering listeners that match type and stage');
	var listenersToRun = this.listeners.filter(function(listener) {
		// filter listeners where type is the same and stage is null or the same
		return ((!listener.type || listener.type === type) && (!listener.stage || listener.stage === stage));
	});
	
	obj.plugin = this;
	listenersToRun.forEach(function(listener) {
		listener.emit(obj);
	});
};

module.exports = Plugin;
