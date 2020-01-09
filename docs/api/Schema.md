# Schema

## TODO: fill out this documentation

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

### validate: value | RegExp | function | async function

You can set a validation on an attribute to ensure the value passes a given validation before saving the document. In the event you set this to be a function or async function, Dynamoose will pass in the value for you to validate as the parameter to your function.

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
