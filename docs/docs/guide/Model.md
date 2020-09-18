The Model object represents a table in DynamoDB. It takes in both a name and a schema and has methods to retrieve, and save documents in the database.

## dynamoose.model[&lt;Document&gt;](name, [schema][, config])

This method is the basic entry point for creating a model in Dynamoose. When you call this method a new model is created, and it returns a Document initializer that you can use to create instances of the given model.

An optional class which extends `Document` can be given right before the function bracket. This provide type checking when using operations like Model.create().

The `schema` parameter can either be an object OR a [Schema](Schema.md) instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.

```ts
const dynamoose = require("dynamoose");

const Cat = dynamoose.model("Cat", {"name": String});
const Cat = dynamoose.model("Cat", {"name": String}, {"create": false});

const Cat = dynamoose.model("Cat", new dynamoose.Schema({"name": String}));
const Cat = dynamoose.model("Cat", new dynamoose.Schema({"name": String}), {"create": false});

// Strongly typed model
class Cat extends Document {
	id: number;
	name: string;
}
const CatModel = dynamoose.model<Cat>("Cat", {"id": Number, "name": String});

// Will raise type checking error as random is not a valid field.
CatModel.create({"id": 1, "random": "string"});

// Will return the correct type of Cat
const cat = await CatModel.get(1);
```

You can also pass in an array of Schema instances or schema objects into the `schema` paremeter. This is useful for cases of single table design where you want one model to have multiple options for a schema. Behind the scenes Dynamoose will automatically pick the closest schema to match to your document, and use that schema for all operations pertaining to that document. If no matching schema can be found, it will default to the first schema in the array.

:::note
If you use multiple schemas in one model, the hash & range keys must match for all schemas.
:::

```js
const Cat = dynamoose.model("Cat", [
	new dynamoose.Schema({"id": String, "name": String}),
	{"id": String, "age": Number}
]);
```

If you don't pass the `schema` parameter it is required that you have an existing model already registed with that name. This will use the existing model already registered.

```js
const Cat = dynamoose.model("Cat"); // Will reference existing model, or if no model exists already with name `Cat` it will throw an error.
```

The `config` parameter is an object used to customize settings for the model.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| create | If Dynamoose should attempt to create the table on DynamoDB. This function will run a `describeTable` call first to ensure the table doesn't already exist. For production environments we recommend setting this value to `false`. | Boolean | true |
| throughput | An object with settings for what the throughput for the table should be on creation, or a number which will use the same throughput for both read and write. If this is set to `ON_DEMAND` the table will use the `PAY_PER_REQUEST` billing mode. If the table is not created by Dynamoose, this object has no effect. | Object \| Number \| String |  |
| throughput.read | What the read throughput should be set to. Only valid if `throughput` is an object. | Number | 1 |
| throughput.write | What the write throughput should be set to. Only valid if `throughput` is an object. | Number | 1 |
| prefix | A string that should be prepended to every model name. | String | "" |
| suffix | A string that should be appended to every model name. | String | "" |
| waitForActive | Settings for how DynamoDB should handle waiting for the table to be active before enabling actions to be run on the table. This property can also be set to `false` to easily disable the behavior of waiting for the table to be active. For production environments we recommend setting this value to `false`. | Object |  |
| waitForActive.enabled | If Dynamoose should wait for the table to be active before running actions on it. | Boolean | true |
| waitForActive.check | Settings for how Dynamoose should check if the table is active | Object |  |
| waitForActive.check.timeout | How many milliseconds before Dynamoose should timeout and stop checking if the table is active. | Number | 180000 |
| waitForActive.check.frequency | How many milliseconds Dynamoose should delay between checks to see if the table is active. If this number is set to 0 it will use `setImmediate()` to run the check again. | Number | 1000 |
| update | If Dynamoose should update the capacity of the existing table to match the model throughput. If this is a boolean of `true` all update actions will be run. If this is an array of strings, only the actions in the array will be run. The array can include the following settings to update, `ttl`, `indexes`, `throughput`. | Boolean \| [String] | false |
| expires | The setting to describe the time to live for documents created. If you pass in a number it will be used for the `expires.ttl` setting, with default values for everything else. If this is `null`, no time to live will be active on the model. | Number \| Object | null |
| expires.ttl | The default amount of time the document should stay alive from creation time in milliseconds. | Number | null |
| expires.attribute | The attribute name for where the document time to live attribute. | String | `ttl` |
| expires.items | The options for documents with ttl. | Object | {} |
| expires.items.returnExpired | If Dynamoose should include expired documents when returning retrieved documents. | Boolean | true |

The default object is listed below.

```js
{
	"create": true,
	"throughput": {
		"read": 5,
		"write": 5
	}, // Same as `"throughput": 5`
	"prefix": "",
	"suffix": "",
	"waitForActive": {
		"enabled": true,
		"check": {
			"timeout": 180000,
			"frequency": 1000
		}
	},
	"update": false,
	"expires": null
}
```

## dynamoose.model.defaults.set(defaults)

This function is used to set default values for the config object for new models that are created. Ensure that you set this before initializing your models to ensure the defaults are applied to your models.

The priority of how the configuration gets set for new models is:

- Configuration object passed into model creation
- Custom defaults provided by `dynamoose.model.defaults.set(defaults)`
- Dynamoose internal defaults

In the event that properties are not passed into the configuration object or custom defaults, the Dynamoose internal defaults will be used.

You can set the defaults by setting the property to a custom object:

```js
dynamoose.model.defaults.set({
	"prefix": "MyApplication_"
});
```

In order to revert to the default and remove custom defaults you can set it to an empty object:

```js
dynamoose.model.defaults.set({});
```

## Model.table.create.request()

This function will return the object used to create the table with AWS. You can use this to create the table manually, for things like the Serverless deployment toolkit, or just to peak behind the scenes and see what Dynamoose is doing to create the table.

This function is an async function so you must wait for the promise to resolve before you are able to access the result.

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

async function printTableRequest() {
	console.log(await User.table.create.request());
	// {
	// 	"TableName": "User",
	// 	"ProvisionedThroughput": {
	// 		"ReadCapacityUnits": 5,
	// 		"WriteCapacityUnits": 5
	// 	},
	// 	"AttributeDefinitions": [
	// 		{
	// 			"AttributeName": "id",
	// 			"AttributeType": "N"
	// 		}
	// 	],
	// 	"KeySchema": [
	// 		{
	// 			"AttributeName": "id",
	// 			"KeyType": "HASH"
	// 		}
	// 	]
	// }
}
```

## Model.get(key[, settings][, callback])

You can use Model.get to retrieve a document from DynamoDB. This method uses the `getItem` DynamoDB API call to retrieve the object.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. A Document instance will be the result of the promise or callback response. In the event no item can be found in DynamoDB this method will return undefined.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `document`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. If this is `request`, the function will not be async anymore. | String | `document` |
| attributes | What document attributes should be retrieved & returned. This will use the underlying `ProjectionExpression` DynamoDB option to ensure only the attributes you request will be sent over the wire. If this value is `undefined`, then all attributes will be returned. | [String] | undefined |

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

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

const retrieveUserRequest = User.get(1, {"return": "request"});
// {
// 	"Key": {"id": {"N": "1"}},
// 	"TableName": "User"
// }

// OR

User.get(1, {"return": "request"}, (error, request) => {
	console.log(request);
});
```

In the event you have a rangeKey for your model, you can pass in an object for the `key` parameter which includes the hashKey & rangeKey.

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

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const myUser = await User.get({"id": 1});
	console.log(myUser);
} catch (error) {
	console.error(error);
}

// OR

User.get({"id": 1}, (error, myUser) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUser);
	}
});
```

## Model.batchGet(keys[, settings][, callback])

You can use Model.batchGet to retrieve multiple documents from DynamoDB. This method uses the `batchGetItem` DynamoDB API call to retrieve the object.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. An array of Document instances will be the result of the promise or callback response. In the event no documents can be found in DynamoDB this method will return an empty array.

The array you receive back is a standard JavaScript array of objects. However, the array has some special properties with extra information about your scan operation that you can access. This does not prevent the ability do running loops or accessing the objects within the array.

The extra properties attached to the array are:

- `unprocessedKeys` - In the event there are more documents to get in DynamoDB this property will be equal to an array of unprocessed keys. You can take this property and call `batchGet` again to retrieve those documents. Normally DynamoDB returns this property as a DynamoDB object, but Dynamoose returns it and handles it as a standard JS object without the DynamoDB types.
- `populate` - A function that is an alias to [`document.populate`](Document#documentpopulatesettings-callback) and will populate all documents in the array.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `documents`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. If this is `request`, the function will not be async anymore. | String | `documents` |

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const myUsers = await User.batchGet([1, 2]);
	console.log(myUsers);
} catch (error) {
	console.error(error);
}

// OR

User.batchGet([1, 2], (error, myUsers) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUsers);
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

const retrieveUsersRequest = User.batchGet([1, 2], {"return": "request"});
// {
// 	"RequestItems": {
// 		"User": {
// 			"Keys": [
// 				{"id": {"N": "1"}},
// 				{"id": {"N": "2"}}
// 			]
// 		}
// 	}
// }

// OR

User.batchGet([1, 2], {"return": "request"}, (error, request) => {
	console.log(request);
});
```

In the event you have a rangeKey for your model, you can pass in an object for the `key` parameter which includes the rangeKey & hashKey.

```js
const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});

try {
	const myUsers = await User.batchGet([{"id": 1, "name": "Tim"}, {"id": 2, "name": "Charlie"}]);
	console.log(myUsers);
} catch (error) {
	console.error(error);
}

// OR

User.batchGet({"id": 1, "name": "Tim"}, (error, myUsers) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUsers);
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const myUsers = await User.batchGet([{"id": 1}, {"id": 2}]);
	console.log(myUsers);
} catch (error) {
	console.error(error);
}

// OR

User.batchGet([{"id": 1}, {"id": 2}], (error, myUsers) => {
	if (error) {
		console.error(error);
	} else {
		console.log(myUsers);
	}
});
```

## Model.create(document, [settings], [callback])

This function lets you create a new document for a given model. This function is almost identical to creating a new document and calling `document.save`, with one key difference, this function will default to setting `overwrite` to false.

If you do not pass in a `callback` parameter a promise will be returned.

```js
const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});

try {
	const user = await User.create({"id": 1, "name": "Tim"}); // If a user with `id=1` already exists in the table, an error will be thrown.
	console.log(user);
} catch (error) {
	console.error(error);
}

// OR

User.create({"id": 1, "name": "Tim"}, (error, user) => {  // If a user with `id=1` already exists in the table, an error will be thrown.
	if (error) {
		console.error(error);
	} else {
		console.log(user);
	}
});
```

## Model.batchPut(documents, [settings], [callback])

This saves documents to DynamoDB. This method uses the `batchWriteItem` DynamoDB API call to store your objects in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the promise or callback.

You can also pass a settings object in as the second parameter. The following options are available for settings are:

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | If the function should return the `response` or `request`. If you set this to `request` the request that would be made to DynamoDB will be returned, but no requests will be made to DynamoDB. | String | `response` |

Both `settings` and `callback` parameters are optional. You can pass in a `callback` without `settings`, just by passing in your array of objects as the first parameter, and the second argument as the `callback` function. You are not required to pass in `settings` if you just want to pass in a `callback`.

```js
//...

try {
	const result = await User.batchPut([
		{"id": 1, "name": "Charlie"},
		{"id": 2, "name": "Bob"}
	]);
	console.log(result);
	// {
	// 	"unprocessedItems": []
	// }

	// OR

	// {
	// 	"unprocessedItems": [{"id": 1, "name": "Charlie"}]
	// }
} catch (error) {
	console.error(error);
}

// OR

await User.batchPut([
	{"id": 1, "name": "Charlie"},
	{"id": 2, "name": "Bob"}
], (error) => {
	if (error) {
		console.error(error);
	} else {
		console.log(result);
	}
});
```

## Model.update(key[, updateObj[, settings]],[ callback])

This function lets you update an existing item in the database. You can either pass in one object combining both the hashKey you wish to update along with the update object, or keep them separate by passing in two objects.

`key` can be a string representing the hashKey or an object containing the hashKey & rangeKey.

```js
await User.update({"id": 1, "name": "Bob"}); // This code will set `name` to Bob for the user where `id` = 1
```

If you do not pass in a `callback` parameter a promise will be returned.

You can also pass in a `settings` object parameter to define extra settings for the update call. If you pass in a `settings` parameter, the `updateObj` parameter is required. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `document`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. | String | `document` |
| condition | This is an optional instance of a Condition for the update. | [dynamoose.Condition](Condition.md) | `null`

There are two different methods for specifying what you'd like to edit in the document. The first is you can just pass in the attribute name as the key, and the new value as the value. This will set the given attribute to the new value.

```js
// The code below will set `name` to Bob for the user where `id` = 1

await User.update({"id": 1}, {"name": "Bob"});

// OR

User.update({"id": 1}, {"name": "Bob"}, (error, user) => {
	if (error) {
		console.error(error);
	} else {
		console.log(user);
	}
});
```

```js
// The following code below will only update the document if the `active` property on the existing document is set to true

const condition = new dynamoose.Condition().where("active").eq(true);


await User.update({"id": 1}, {"name": "Bob"}, {"condition": condition});

// OR

User.update({"id": 1}, {"name": "Bob"}, {"condition": condition}, (error, user) => {
	if (error) {
		console.error(error);
	} else {
		console.log(user);
	}
});
```

The other method you can use is by using specific update types. These update types are as follows.

- `$SET` - This method will set the attribute to the new value (as shown above)
- `$ADD` - This method will add the value to the attribute. If the attribute is a number it will add the value to the existing number. If the attribute is a list, it will add the value to the list. Although this method only works for sets in DynamoDB, Dynamoose will automatically update this method to work for lists/arrays as well according to your schema. This update type does not work for any other attribute type.
- `$REMOVE` - This method will remove the attribute from the document. Since this method doesn't require values you can pass in an array of attribute names.

```js
await User.update({"id": 1}, {"$SET": {"name": "Bob"}, "$ADD": {"age": 1}});
// This will set the document name to Bob and increase the age by 1 for the user where id = 1

await User.update({"id": 1}, {"$REMOVE": ["address"]});
await User.update({"id": 1}, {"$REMOVE": {"address": null}});
// These two function calls will delete the `address` attribute for the document where id = 1

await User.update({"id": 1}, {"$SET": {"name": "Bob"}, "$ADD": {"friends": "Tim"}});
await User.update({"id": 1}, {"$SET": {"name": "Bob"}, "$ADD": {"friends": ["Tim"]}});
// This will set the document name to Bob and append Tim to the list/array/set of friends where id = 1
```

You are allowed to combine these two methods into one update object.

```js
await User.update({"id": 1}, {"name": "Bob", "$ADD": {"age": 1}});
// This will set the document name to Bob and increase the age by 1 for the user where id = 1
```

The `validate` Schema attribute property will only be run on `$SET` values. This is due to the fact that Dynamoose is unaware of what the existing value is in the database for `$ADD` properties.

## Model.delete(key[, settings][, callback])

You can use Model.delete to delete a item from DynamoDB. This method uses the `deleteItem` DynamoDB API call to delete the object.

`key` can be a string representing the hashKey or an object containing the hashKey & rangeKey.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. In the event the operation was successful, noting will be returned to you. Otherwise an error will be thrown.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be null, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. If this is `request`, the function will not be async anymore. | String \| null | null |

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	await User.delete(1);
	console.log("Successfully deleted item");
} catch (error) {
	console.error(error);
}

// OR

User.delete(1, (error) => {
	if (error) {
		console.error(error);
	} else {
		console.log("Successfully deleted item");
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

const deleteUserRequest = User.delete(1, {"return": "request"});
// {
// 	"Key": {"id": {"N": "1"}},
// 	"TableName": "User"
// }

// OR

User.delete(1, {"return": "request"}, (error, request) => {
	console.log(request);
});
```

In the event you have a rangeKey for your model, you can pass in an object for the `key` parameter which includes the rangeKey & hashKey.

```js
const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});

try {
	await User.delete({"id": 1, "name": "Tim"});
	console.log("Successfully deleted item");
} catch (error) {
	console.error(error);
}

// OR

User.delete({"id": 1, "name": "Tim"}, (error) => {
	if (error) {
		console.error(error);
	} else {
		console.log("Successfully deleted item");
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	await User.delete({"id": 1});
	console.log("Successfully deleted item");
} catch (error) {
	console.error(error);
}

// OR

User.delete({"id": 1}, (error) => {
	if (error) {
		console.error(error);
	} else {
		console.log("Successfully deleted item");
	}
});
```

## Model.batchDelete(keys[, settings][, callback])

You can use Model.batchDelete to delete documents from DynamoDB. This method uses the `batchWriteItem` DynamoDB API call to delete the objects.

`keys` can be an array of strings representing the hashKey and/or an array of objects containing the hashKey & rangeKey.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. In the event the operation was successful, an object with the `unprocessedItems` will be returned to you. Otherwise an error will be thrown.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `response`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. If this is `request`, the function will not be async anymore. | String | `response` |

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const response = await User.batchDelete([1, 2]);
	console.log(response);
	// {
	// 	"unprocessedItems": []
	// }

	// OR

	// {
	// 	"unprocessedItems": [{"id": 1}]
	// }
} catch (error) {
	console.error(error);
}

// OR

User.batchDelete([1, 2], (error, response) => {
	if (error) {
		console.error(error);
	} else {
		console.log(`Successfully deleted documents. ${response.unprocessedItems.count} of unprocessed documents.`);
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

const deleteUserRequest = User.batchDelete([1, 2], {"return": "request"});
// {
// 	"RequestItems": {
// 		"User": [
// 			{
// 				"DeleteRequest": {
// 					"Key": {"id": {"N": "1"}}
// 				}
// 			},
// 			{
// 				"DeleteRequest": {
// 					"Key": {"id": {"N": "2"}}
// 				}
// 			}
// 		]
// 	}
// }

// OR

User.batchDelete([1, 2], {"return": "request"}, (error, request) => {
	console.log(request);
});
```

In the event you have a rangeKey for your model, you can pass in an object for the `key` parameter which includes the rangeKey & hashKey.

```js
const User = dynamoose.model("User", {"id": Number, "name": {"type": String, "rangeKey": true}});

try {
	const response = await User.batchDelete([{"id": 1, "name": "Tim"}, {"id": 2, "name": "Charlie"}]);
	console.log(`Successfully deleted document. ${response.unprocessedItems.count} of unprocessed documents.`);
} catch (error) {
	console.error(error);
}

// OR

User.batchDelete([{"id": 1, "name": "Tim"}, {"id": 2, "name": "Charlie"}], (error, response) => {
	if (error) {
		console.error(error);
	} else {
		console.log(`Successfully deleted document. ${response.unprocessedItems.count} of unprocessed documents.`);
	}
});
```

```js
const User = dynamoose.model("User", {"id": Number, "name": String});

try {
	const response = await User.batchDelete([{"id": 1}, {"id": 2}]);
	console.log(`Successfully deleted document. ${response.unprocessedItems.count} of unprocessed documents.`);
} catch (error) {
	console.error(error);
}

// OR

User.batchDelete([{"id": 1}, {"id": 2}], (error, response) => {
	if (error) {
		console.error(error);
	} else {
		console.log(`Successfully deleted document. ${response.unprocessedItems.count} of unprocessed documents.`);
	}
});
```

## Model.transaction

This object has the following methods that you can call.

- Model.transaction.get
- Model.transaction.create
- Model.transaction.delete
- Model.transaction.update
- Model.transaction.condition

You can pass in the same parameters into each method that you do for the normal (non-transaction) methods, except for the callback parameter.

These methods are only meant to only be called to instantiate the `dynamoose.transaction` array.

### Model.transaction.condition(key, condition)

This method allows you to run a `conditionCheck` when running a DynamoDB transaction.

The `condition` parameter is a `dynamoose.Condition` instance that represents the conditional you want to run.

```js
User.transaction.condition(1, new dynamoose.Condition("age").gt(13));
```

## Model.methods.set(name, function)

This function allows you to add a method to the given model that you can call later. When Dynamoose calls your `function` parameter, `this` will be set to the underlying model. If an existing method exists with the given name, it will be overwritten, except if you are trying to replace an internal method, then this function will fail silently.

```js
// Setup:
const User = new dynamoose.model("Model", ModelSchema);
User.methods.set("scanAll", async function () {
	let results = await this.scan().exec();
	lastKey = results.lastKey;
	do {
		const newResult = await this.scan().startAt(lastKey).exec();
		results = [...results, ...newResult];
		lastKey = newResult.lastKey;
	} while (lastKey)
	return results;
});
// OR
User.methods.set("scanAll", function (cb) {
	let result = [];
	const main = (lastKey) => {
		let scan = this.scan();
		if (lastKey) {
			scan.startAt(lastKey);
		}
		scan.exec((err, newResult) => {
			if (err) {
				cb(err);
			} else {
				result = [...result, ...newResult];
				if (newResult.lastKey) {
					main(newResult.lastKey);
				} else {
					cb(result);
				}
			}
		});
	};
	main();
});

// Using:
User.scanAll((err, models) => {
	models.forEach((model) => {
		console.log(model);
	});
});
// OR
const models = await User.scanAll();
models.forEach((model) => {
	console.log(model);
});
```

You can also pass parameters into your custom method. It is important to note that if you decide to pass custom parameters into your custom method, the `callback` parameter will always be passed in as the last parameter. This means it's highly recommended that you always pass in the same number of parameters every time to your custom method. In the event you are unable to do this (dynamic/custom parameter length), you can use the JavaScript `arguments` variable to retrieve the last argument that was passed into the function.

```js
// Setup:
const User = new dynamoose.model("Model", ModelSchema);
User.methods.set("scanAll", async function (startAt) {
	let scan = this.scan();
	if (startAt) {
		scan.startAt(startAt);
	}
	let results = await scan.exec();
	lastKey = results.lastKey;
	do {
		const newResult = await this.scan().startAt(lastKey).exec();
		results = [...results, ...newResult];
		lastKey = newResult.lastKey;
	} while (lastKey)
	return results;
});
// OR
User.methods.set("scanAll", function (startAt, cb) {
	let result = [];
	const main = (lastKey) => {
		let scan = this.scan();
		if (lastKey) {
			scan.startAt(lastKey);
		}
		scan.exec((err, newResult) => {
			if (err) {
				cb(err);
			} else {
				result = [...result, ...newResult];
				if (newResult.lastKey) {
					main(newResult.lastKey);
				} else {
					cb(result);
				}
			}
		});
	};
	main(startAt);
});

// Using:
User.scanAll({"id": 1024}, (err, models) => {
	models.forEach((model) => {
		console.log(model);
	});
});
// OR
const models = await User.scanAll({"id": 1024});
models.forEach((model) => {
	console.log(model);
});
```

## Model.methods.delete(name)

This allows you to delete an existing method from the model. If no existing method is assigned for that name, the function will do nothing and no error will be thrown.

```js
User.methods.delete("scanAll");
// The following lines will throw an error
const models = await User.scanAll();
// OR
User.scanAll((err, models) => {});
```

## Model.methods.document.set(name, function)

This function allows you to add a method to the model documents that you can call later. When Dynamoose calls your `function` parameter, `this` will be set to the underlying document. If an existing method exists with the given name, it will be overwritten, except if you are trying to replace an internal method, then this function will fail silently.

```js
// Setup:
const User = new dynamoose.model("Model", ModelSchema);
User.methods.document.set("setName", async function () {
	this.name = await getRandomName();
});
// OR
User.methods.document.set("setName", function (cb) {
	getRandomName((err, name) => {
		if (err) {
			cb(err);
		} else {
			this.name = name;
			cb();
		}
	});
});

// Using:
const user = new User();

user.setName((err) => {
	console.log("Set name");
});
// OR
await user.setName();
console.log("Set name");
```

You can also pass parameters into your custom method. It is important to note that if you decide to pass custom parameters into your custom method, the `callback` parameter will always be passed in as the last parameter. This means it's highly recommended that you always pass in the same number of parameters every time to your custom method. In the event you are unable to do this (dynamic/custom parameter length), you can use the JavaScript `arguments` variable to retrieve the last argument that was passed into the function.

```js
// Setup:
const User = new dynamoose.model("Model", ModelSchema);
User.methods.document.set("setName", async function (firstName, lastName) {
	this.name = await verifyName(`${firstName} ${lastName}`);
});
// OR
User.methods.document.set("scanAll", function (firstName, lastName, cb) {
	verifyName(`${firstName} ${lastName}`, (err, name) => {
		if (err) {
			cb(err);
		} else {
			this.name = name;
			cb();
		}
	});
});

// Using:
const user = new User();

user.setName("Charlie", "Fish", (err) => {
	console.log("Set name");
});
// OR
await user.setName("Charlie", "Fish");
console.log("Set name");
```

## Model.methods.document.delete(name)

This allows you to delete an existing method from the document. If no existing method is assigned for that name, the function will do nothing and no error will be thrown.

```js
User.methods.document.delete("setName");

const user = new User();
// The following lines will throw an error
await user.setName();
// OR
user.setName((err) => {});
```

## Model.serializeMany(items[, serializer])

This function takes in an array of `items` and serializes all of them. This function is very similar to [`document.serialize`](Document#documentserializeserializer) except it takes in an array of documents to serialize and returns an array of those documents.

```js
User.serializeMany(await User.scan().exec(), "myCustomSerializer");
```

## Model.serializer.add(name, serializer)

This function adds a serializer to the model.

The `serializer` parameter can be an object containing the following properties.

| Name | Type | Description |
| --- | --- | --- |
| include | [string] | The properties you wish to include when serializing. |
| exclude | [string] | The properties you wish to exclude when serializing. |
| modify | (serialized: Object, original: Object) => Object | A function you want to use to modify the object in the serializer. The `serialized` parameter is the new object (after `include` & `exclude` have been applied). The `original` parameter is the original document (before `include` & `exclude` have been applied). |

```js
User.serializer.add("myCustomSerializer", {
	"include": ["email"]
});

User.serializer.add("myCustomSerializer", {
	"exclude": ["password"]
});

User.serializer.add("myCustomSerializer", {
	"exclude": ["status"],
	"modify": (serialized, original) => ({...serialized, "isActive": original.status === "active"})
});
```

You can also pass an array into the `serializer` parameter, which acts as a shorthand for the `include` property.

```js
User.serializer.add("myCustomSerializer", ["id"]); // ["id"] is the same as {"include": ["id"]}
```

## Model.serializer.delete(name)

This function will delete the serializer from the list of serializer on the model. If no existing serializer is assigned for that name, the function will do nothing and no error will be thrown.

```js
User.serializer.delete("myCustomSerializer");
```

## Model.serializer.default.set([name])

This function sets the default serializer for the given model. By default the default serializer has the same behavior as [`document.toJSON`](Document#documenttojson). The default serializer will be used for [`Model.serializeMany`](#modelserializemanyitems-serializer) and [`document.serialize`](Document#documentserializeserializer) if you don't pass anything into the `serializer` parameter.

```js
User.serializer.default.set("myCustomSerializer");
```

You can revert back to the default serializer by calling this method with no arguments.

```js
User.serializer.default.set();
```
