# Schema

## TODO: fill out this documentation


## Defaults

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
