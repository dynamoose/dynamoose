# Schema

## new dynamoose.Schema(schema[, options])

You can use this method to create a schema. The `schema` parameter is an object defining your schema, each value should be a type or object defining the type with additional settings (listed below).

The `options` parameter is an optional object with the following options:

- `saveUnknown` array | boolean (default: false) - This setting lets you specify if the schema should allow properties not defined in the schema. If you pass `true` in for this option all unknown properties will be allowed. If you pass in an array of strings, only properties that are included in that array will be allowed. If you retrieve items from DynamoDB with `saveUnknown` enabled, all custom Dynamoose types will be returned as the underlying DynamoDB type (ex. Dates will be returned as a Number representing number of milliseconds since Jan 1 1970)
- `timestamps` boolean | object (default: false) - This setting lets you indicate to Dynamoose that you would like it to handle storing timestamps in your documents for both creation and most recent update times. If you pass in an object for this setting you must specify two keys `createdAt` & `updatedAt`, each with a value of a string being the name of the attribute for each timestamp. If you pass in `null` for either of those keys that specific timestamp won't be added to the schema. If you set this option to `true` it will use the default attribute names of `createdAt` & `updatedAt`.

```js
const schema = new dynamoose.Schema({
	"id": String,
	"age": Number
}, {
	"saveUnknown": true,
	"timestamps": true
});
```

```js
const schema = new dynamoose.Schema({
	"id": String,
	"age": {
		"type": Number,
		"default": 5
	}
});
```

```js
const schema = new dynamoose.Schema({
	"id": String,
	"name": String
}, {
	"timestamps": {
		"createdAt": "createDate",
		"updatedAt": null // updatedAt will not be stored as part of the timestamp
	}
});
```

## Attribute Types

| Type    | Set Allowed | DynamoDB Type | Custom Dynamoose Type | Nested Type | Notes                                                                                               |
|---------|-------------|---------------|-----------------------|-------------|-----------------------------------------------------------------------------------------------------|
| String  | True        | S             | False                 | False       |                                                                                                     |
| Boolean | False       | BOOL          | False                 | False       |                                                                                                     |
| Number  | True        | N             | False                 | False       |                                                                                                     |
| Buffer  | True        | B             | False                 | False       |                                                                                                     |
| Date    | True        | N             | True                  | False       | Will be stored in DynamoDB as milliseconds since Jan 1 1970, and converted to/from a Date instance. |
| Object  | False       | M             | False                 | True        |                                                                                                     |

If you use a set you will define the type surrounded by brackets. For example a String Set would be defined as a type of `[String]`. Set's are different from Array's since they require each item in the Set be unique. If you use a Set, it will use the underlying JavaScript Set instance as opposed to an Array.

When using `saveUnknown` with a set, the type recognized by Dynamoose will be the underlying JavaScript Set constructor. If you have a set type defined in your schema the underlying type will be an Array.

Custom Dynamoose Types are not supported with the `saveUnknown` property. For example, if you wish you retrieve a document with a Date type, Dynamoose will return it as a number if that property does not exist in the schema and `saveUnknown` is enabled for that given property.

For types that are `Nested Types`, you must define a `schema` setting that includes the nested schema for that given attribute. For example something like the following is acceptable.

```js
{
	"address": {
		"type": Object,
		"schema": {
			"zip": Number,
			"country": {
				"type": String,
				"required": true
			}
		}
	}
}
```

## Attribute Settings

### default: value | function | async function

You can set a default value for an attribute that will be applied upon save if the given attribute value is `null` or `undefined`. The value for the default property can either be a value or a function that will be executed when needed that should return the default value. By default there is no default value for attributes.

```js
{
	"age": {
		"type": Number,
		"default": 5
	}
}
```

```js
{
	"age": {
		"type": Number,
		"default": () => 5
	}
}
```

You can also pass in async functions or a function that returns a promise to the default property and Dynamoose will take care of waiting for the promise to resolve before saving the object.

```js
{
	"age": {
		"type": Number,
		"default": async () => {
			const networkResponse = await axios("https://myurl.com/config.json").data;
			return networkResponse.defaults.age;
		}
	}
}
```

```js
{
	"age": {
		"type": Number,
		"default": () => {
			return new Promise((resolve) => {
				setTimeout(() => resolve(5), 1000);
			});
		}
	}
}
```

### forceDefault: boolean

You can set this property to always use the `default` value, even if a value is already set. This can be used for data that will be used as sort or secondary indexes. The default for this property is false.

```js
{
	"age": {
		"type": Number,
		"default": 5,
		"forceDefault": true
	}
}
```

### validate: value | RegExp | function | async function

You can set a validation on an attribute to ensure the value passes a given validation before saving the document. In the event you set this to be a function or async function, Dynamoose will pass in the value for you to validate as the parameter to your function. Validation will only be run if the item exists in the document. If you'd like to force validation to be run every time (even if the attribute doesn't exist in the document) you can enable `required`.

```js
{
	"age": {
		"type": Number,
		"validate": 5 // Any object that is saved must have the `age` property === to 5
	}
}
```

```js
{
	"id": {
		"type": String,
		"validate": /ID_.+/gu // Any object that is saved must have the `id` property start with `ID_` and have at least 1 character after it
	}
}
```

```js
{
	"age": {
		"type": String,
		"validate": (val) => val > 0 && val < 100 // Any object that is saved must have the `age` property be greater than 0 and less than 100
	}
}
```

```js
{
	"email": {
		"type": String,
		"validate": async (val) => {
			const networkRequest = await axios(`https://emailvalidator.com/${val}`);
			return networkRequest.data.isValid;
		} // Any object that is saved will call this function and run the network request with `val` equal to the value set for the `email` property, and only allow the document to be saved if the `isValid` property in the response is true
	}
}
```

### required: boolean

You can set an attribute to be required when saving documents to DynamoDB. By default this setting is false.

```js
{
	"email": {
		"type": String,
		"required": true
	}
}
```

### enum: array

You can set an attribute to have an enum array, which means it must match one of the values specified in the enum array. By default this setting is undefined and not set to anything.

```js
{
	"name": {
		"type": String,
		"enum": ["Tom", "Tim"] // `name` must always equal "Tom" or "Tim"
	}
}
```

### index: boolean | object | array

You can define indexes on properties to be created or updated upon model initialization. If you pass in an array for the value of this setting it must be an array of index objects. By default no indexes are specified on the attribute.

Your index object can contain the following properties:

- name: string - Name of index (default: `${attribute}${global ? "GlobalIndex" : "LocalIndex"}`)
- global: boolean - If the index should be a global secondary index or not. Attribute will be the hash key for the index. (default: `false`)
- rangeKey: string - The range key attribute name for a global secondary index. (default: undefined)
- project: boolean | [string] - Sets the attributes to be projected for the index. `true` projects all attributes, `false` projects only the key attributes, and an array of strings projects the attributes listed. (default: `true`)
- throughput: number | {read: number, write: number} - Sets the throughput for the global secondary index. (default: undefined)

If you set `index` to `true`, it will create an index with all of the default settings.

```js
{
	"email": {
		"type": String,
		"index": {
			"name": "emailIndex",
			"global": true
		} // creates a global index with the name `emailIndex`
	}
}
```
