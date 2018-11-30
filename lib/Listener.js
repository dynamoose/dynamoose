var debug;

function Listener(type, stage, func, plugin) {
	this.type = type;
	this.stage = stage;
	this.func = func;

	debug = require('debug')('dynamoose:' + (plugin.name && plugin.name !== '' ? plugin.name : 'unnamed-plugin') + ':listener');
}

Listener.prototype.emit = async function (type, stage, obj) {
	debug('Received emit');

	// PROMISE SUPPORT
	// This is how we can support promises returned by functions, but it requires newer syntax that isn't supported by all versions on Node.js
	// If we choose to do this we also need to add `async` to this function
	// try {
	// 	await this.func(obj);
	// } catch (e) {
	// 	debug('Fatal Error running listener function');
	// 	throw e;
	// }

	if (!obj.event) {
		obj.event = {};
	}
	obj.event.type = type;
	obj.event.stage = stage;

	try {
		const result = await this.func(obj);
		return result;
	} catch (e) {
		debug('Error running emit on plugin ' + obj.plugin.name);
		return;
	}
};

module.exports = Listener;
