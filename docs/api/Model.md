# Model

The Model object represents one DynamoDB table. It takes in both a name and a schema and has methods to retrieve, and save items in the database.

## dynamoose.model(name, schema[, config])

This method is the basic entry point for creating a model in Dynamoose. When you call this method a new model is created, and it returns a Document initializer that you can use to create instances of the given model.

The `schema` parameter can either be an object OR a Schema instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.

```js
const dynamoose = require("dynamoose");

const Cat = dynamoose.model("Cat", {"name": String});
```

```js
const dynamoose = require("dynamoose");

const Cat = dynamoose.model("Cat", new dynamoose.Schema({"name": String}));
```

The config parameter is an object used to customize settings for the model.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| create | If Dynamoose should attempt to create the table on DynamoDB. For production environments we recommend setting this value to `false`. | Boolean | true |
| throughput | An object with settings for what the throughput for the table should be on creation. If the table is not created by Dynamoose, this object has no effect. | Object |  |
| throughput.read | What the read throughput should be set to. | Number | 5 |
| throughput.write | What the write throughput should be set to. | Number | 5 |
| prefix | A string that should be prepended to every model name. | String | "" |
| suffix | A string that should be appended to every model name. | String | "" |
| waitForActive | Settings for how DynamoDB should handle waiting for the table to be active before enabling actions to be run on the table. This property can also be set to `false` to easily disable the behavior of waiting for the table to be active. For production environments we recommend setting this value to `false`. | Object |  |
| waitForActive.enabled | If Dynamoose should wait for the table to be active before running actions on it. | Boolean | true |
| waitForActive.check | Settings for how Dynamoose should check if the table is active | Object |  |
| waitForActive.check.timeout | How many milliseconds before Dynamoose should timeout and stop checking if the table is active. | Number | 180000 |
| waitForActive.check.frequency | How many milliseconds Dynamoose should delay between checks to see if the table is active. If this number is set to 0 it will use `setImmediate()` to run the check again. | Number | 1000 |

The default object is listed below.

```js
{
	"create": true,
	"throughput": {
		"read": 5,
		"write": 5
	},
	"prefix": "",
	"suffix": ""
}
```

## dynamoose.model.defaults

The `dynamoose.model.defaults` object is a property you can edit to set default values for the config object for new models that are created. Ensure that you set this property before initializing your models to ensure the defaults are applied to your models.

The priority of how the configuration gets set for new models is:

- Configuration object passed into model creation
- Custom defaults provided by `dynamoose.model.defaults`
- Dynamoose internal defaults

In the event that properties are not passed into the configuration object or custom defaults, the Dynamoose internal defaults will be used.

You can set the defaults by setting the property to a custom object:

```js
dynamoose.model.defaults = {
	"prefix": "MyApplication_"
};
```

In order to revert to the default and remove custom defaults you can set it to an empty object:

```js
dynamoose.model.defaults = {};
```

## Model.get(hashKey[, callback])

You can use Model.get to retrieve a document from DynamoDB. This method uses the `getItem` DynamoDB API call to retrieve the object.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. A Document instance will be the result of the promise or callback response. In the event no item can be found in DynamoDB this method will return undefined.

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const myUser = await User.get(1);
	console.log(myUser);
} catch (error) {
	console.error(error);
}

// OR

User.get(1, (error, myUser) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUser);
	}
});
```

In the event you have a rangeKey for your model, you can pass in an object for the `hashKey` parameter.

```js
const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});

try {
	const myUser = await User.get({"id": 1, "name": "Tim"});
	console.log(myUser);
} catch (error) {
	console.error(error);
}

// OR

User.get({"id": 1, "name": "Tim"}, (error, myUser) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUser);
	}
});
```
