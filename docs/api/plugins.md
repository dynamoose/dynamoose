## Plugins (BETA)

**WARNING: PLUGINS IS CURRENTLY IN BETA. THIS FUNCTIONALITY MIGHT CHANGE AT ANYTIME WITHOUT WARNING. DO NOT CONSIDER THIS FEATURE TO BE STABLE.**

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

Adds a listener to emitted events from Dynamoose. You can return a promise in the `callback` method that you pass in, and when it is called, Dynamoose will `await` for your promise to complete before continuing. Your promise must `resolve` and not `reject`. You can resolve an object with the property `resolve` or `reject` to return or reject with that result to the end user. At that point Dynamoose will take no further action. This can be useful if you want to handle more of the interaction with the user.

#### Parameters accepted

- [`event`] - Type of event you wish to listen for from Dynamoose, you can view possible options below, if not passed in it will catch all events (string) (optional)
- [`stage`] - Type of stage you wish you listen for from Dynamoose within the event, if not passed in it will catch all events (string) (optional) (note: if this is passed in `event` is required)
- `callback` - Function to be run when event is emitted from Dynamoose (function)
	- `obj` - Object with properties and methods about event emitted from Dynamoose, you can view more details below (object)


### Example Plugin Implementation

```js
module.exports = (plugin, options) => {
	plugin.setName('My Plugin'); // required
	plugin.setDescription(''); // optional
	plugin.on('init', () => { // this will handle all stages related to init
		console.log('Plugin registered');
	});
	plugin.on('scan', 'preRequest', (obj) => { // this will handle only preRequest stages on the scan type
		console.log('About to make request to DynamoDB');
	});
	plugin.on('scan', 'postRequest', (obj) => { // this will handle only postRequest stages on the scan type, and will wait for promise to resolve before moving on
		return new Promise((resolve) => {
			resolve({
				resolve: 'Hello World' // 'Hello World' will be passed back to the promise/callback of the Dynamoose scan call
			});
		});
	});
	plugin.on('query', 'postRequest', (obj) => { // this will handle only postRequest stages on the scan type, and will wait for promise to resolve before moving on
		return new Promise((resolve) => {
			resolve({
				reject: 'My Error' // 'My Error' will be passed back to the promise/callback of the Dynamoose scan call as an error (not successful)
			});
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
	actions: {
		registerPlugin: _____ // register function to model, just a pointer to Model.plugin function (this can be useful for creating sub-plugins) (function)
	}
}
```

### Events emitted from Dynamoose

#### `*`

Catch all to run listener on all events emitted from Dynamoose.

#### `plugin`

Dynamoose will emit this event when your plugin is registered to a model.

##### Stages

- `init` - Dynamoose will emit this stage when your plugin **has been** registered to a model

##### Additional Items Added to Object

```
{
}
```

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

#### `model:scan`

Dynamoose will emit this event when a scan is called on a model.

##### Stages

- `scan:called` - Dynamoose will emit this stage when a scan is about to start
- `exec:start` - Dynamoose will emit this stage when an exec is called
- `request:pre` - Dynamoose will emit this stage when an scan request is about to be made to DynamoDB
- `request:post` - Dynamoose will emit this stage when an scan request response has been received from DynamoDB

##### Additional Items Added to Object

```
{
	event: {
		scan: _____, // scan instance (object, Scan instance)
		callback: _____ // the function that was passed into the scan exec function (function) (only valid on `exec:start`)
		scanReq: _____ // the scan request object that will be sent to DynamoDB (object) (only valid on `request:pre`)
		data: _____ // the scan data object that was received from DynamoDB (object) (only valid on `request:post`)
		error: _____ // the scan error object that was received from DynamoDB (object) (only valid on `request:post`)

	}
	action: {
		updateCallback: _____ // function to update callback that is called (fn: function) (only valid on `exec:start`)
		updateScanReq: _____ // function to update scan request object that is sent to DynamoDB (reqObj: object) (only valid on `request:pre`)
		updateData: _____ // function to update data that was received from DynamoDB scan before proceeding (dataObj: object) (only valid on `request:post`)
		updateError: _____ // function to update error that was received from DynamoDB scan before proceeding (errorObj: object) (only valid on `request:post`)
	}
}
```

#### `model:get`

Dynamoose will emit this event when a get is called on a model.

##### Stages

- `get:called` - Dynamoose will emit this stage when a get is about to start
- `request:pre` - Dynamoose will emit this stage when a get request is about to be made to DynamoDB
- `request:post` - Dynamoose will emit this stage when a get request response has been recieved from DynamoDB

##### Additional Items Added to Object

```
{
	event: {
		callback: _____ // the callback function for the get command (function)
		key: _____ // the key for the get request (object)
		options: _____ // the options passed into the get call (object)
		getRequest: _____ // the options passed into the get request to DynamoDB (object) (only valid on `request:pre`)
		error: _____ // the options passed into the get call (object) (only valid on `request:post`)
		data: _____ // the options passed into the get call (object) (only valid on `request:post`)

	}
	action: {
		updateCallback: _____ // function to update callback that is called (fn: function)
		updateKey: _____ // function to update key that is sent to DynamoDB (key: string)
		updateOptions: _____ // function to update options for the get call (options: object)
		updateGetRequest: _____ // function to update request options for the get call (options: object) (only valid on `request:pre`)
		updateError: _____ // function to update error received from DynamoDB (options: object) (only valid on `request:post`)
		updateData: _____ // function to update data received from DynamoDB (options: object) (only valid on `request:post`)
	}
}
```

#### `model:query`

Dynamoose will emit this event when a query is called on a model.

##### Stages

- `query:called` - Dynamoose will emit this stage when a query is about to start
- `exec:start` - Dynamoose will emit this stage when an exec is called
- `request:pre` - Dynamoose will emit this stage when a query request is about to be made to DynamoDB
- `request:post` - Dynamoose will emit this stage when a query request response has been received from DynamoDB

##### Additional Items Added to Object

```
{
	event: {
		query: _____, // query instance (object, Query instance)
		callback: _____ // the function that was passed into the query exec function (function) (only valid on `exec:start`)
		queryReq: _____ // the query request object that will be sent to DynamoDB (object) (only valid on `request:pre`)
		data: _____ // the query data object that was received from DynamoDB (object) (only valid on `request:post`)
		error: _____ // the query error object that was received from DynamoDB (object) (only valid on `request:post`)

	}
	action: {
		updateCallback: _____ // function to update callback that is called (fn: function) (only valid on `exec:start`)
		updateQueryReq: _____ // function to update query request object that is sent to DynamoDB (reqObj: object) (only valid on `request:pre`)
		updateData: _____ // function to update data that was received from DynamoDB query before proceeding (dataObj: object) (only valid on `request:post`)
		updateError: _____ // function to update error that was received from DynamoDB query before proceeding (errorObj: object) (only valid on `request:post`)
	}
}
```

#### `model:put`

Dynamoose will emit this event when a put is called on a model.

##### Stages

- `put:called` - Dynamoose will emit this stage when a put is about to start
- `request:pre` - Dynamoose will emit this stage when a put request is about to be made to DynamoDB
- `request:post` - Dynamoose will emit this stage when a put request response has been received from DynamoDB

##### Additional Items Added to Object

```
{
	event: {
		options: _____, // options passed to put (object) (warning: in some cases this can be the callback function in the `put:called` stage)
		callback: _____, // callback passed to put (function) (warning: in some cases this can be the null if options is not passed in) (only valid on `put:called`)
		item: _____ // item that will be/has been saved to DynamoDB (object) (model class instance on `put:called`, PutItem request object on `request:*`)
		error: _____ // the error object that was received from DynamoDB (object) (only valid on `request:post`)
	}
	action: {
		updateCallback: _____ // function to update callback that is called (fn: function) (only valid on `put:called`)
		updateOptions: _____ // function to update options object (reqObj: object) (only valid on `put:called`)
		updateItem: _____ // function to update data that will be sent to DynamoDB (dataObj: object) (only valid on `request:pre`)
		updateError: _____ // function to update error that was received from DynamoDB query before proceeding (errorObj: object) (only valid on `request:post`)
	}
}
```
