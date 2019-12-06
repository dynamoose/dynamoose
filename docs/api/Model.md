# Model

The Model object represents one DynamoDB table. It takes in both a name and a schema and has methods to retrieve, and save items in the database.

## dynamoose.model(name, schema[, config])

This method is the basic entry point for creating a model in Dynamoose.

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
