---
order: 6
---

## Plugins

Please view the `Model.plugin` documentation for how to use plugins in your own models. This documentation will be going over how to create plugins from scratch.

### Overview

All plugins will export a function. Dynamoose will pass in 2 parameters into that function. `plugin` and `options`. `options` is the object that was passed into `Model.plugin`. `plugin` properties are defined below.

### plugin.setName

Set the name of the plugin.

#### Parameters accepted

- `name` - Name of plugin (string) 


### plugin.setDescription

Set the description of the plugin.

#### Parameters accepted

- `description` - Description of plugin (string) 


### plugin.on

Adds a listener to emitted events from Dynamoose.

#### Parameters accepted

- `event` - Type of event you wish to listen for from Dynamoose, you can view possible options below (string) 
- [`stage`] - Type of stage you wish you listen for from Dynamoose within the event (string) (optional)
- `callback` - Function to be run when event is emitted from Dynamoose (function)
	- `obj` - Object with properties and methods about event emitted from Dynamoose, you can view more details below (object)


### Example Plugin Implementation

```js
module.exports = function(plugin, options) {
	plugin.setName("My Plugin"); // required
	plugin.setDescription(""); // optional
	plugin.on('init', function() { // this will handle all stages related to init
		console.log("Plugin registered");
	});
	plugin.on('scan', 'preRequest', function(obj) { // this will handle only preRequest stages on the scan type
		console.log("About to make request to DynamoDB");
	});
	plugin.on('scan', 'postRequest', function(obj) { // this will handle only postRequest stages on the scan type, and will wait for promise to resolve before moving on (NOT SURE IF WE WILL SUPPORT THIS)
		return new Promise(function(resolve, reject) {
			resolve();
		});
	});
	return plugin;
}
```

### Items Passed Into .on callback object

Below is the default object passed into the callback object, each event might add more properties and methods to this object.

```
{
	model: _____, // the model instance (object)
	modelName: _____, // the model name (string)
	plugins: _____, // array of plugins registered to model (array)
	plugin: _____, // the plugin that is being called (object)
	event: {
		type: _____, // the type of event that was emitted from Dynamoose (ex. "plugin:register") (string)
		stage: _____ // the stage that was emitted from Dynamoose (ex. "pre", "post") (string)
	}
}
```

### Events emitted from Dynamoose

#### `plugin:register`

Dynamoose will emit this event when a new plugin is registered to a model.

##### Stages

- `pre` - Dynamoose will emit this stage when a new plugin **is about to be** registered to a model
- `post` - Dynamoose will emit this stage when a new plugin **has been** registered to a model (remember: if you are listening for this stage within your plugin, this will be called after your plugin is registered, so almost instantly after it gets registered to a model)

##### Additional Items Added to Object

```
{
	event: {
		plugin: _____, // plugin package that is going to/has been registered (function)
		pluginOptions: _____ // options that were passed into plugin registration (object)
	}
}
```
