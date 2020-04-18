# Dynamoose Object

You can access Dynamoose by requiring the library. For example:

```js
const dynamoose = require("dynamoose");
```

The Dynamoose object is the entry point to everything you will do with this package.

## dynamoose.aws

The `dynamoose.aws` object is used to set AWS level settings for Dynamoose. This includes things like setting a custom DDB instance, setting the AWS region, access keys, and more.

## dynamoose.aws.sdk

The `dynamoose.aws.sdk` property is basically just a reference to the aws-sdk. This can be used to set configuration settings for AWS, an example of this is provided below.

```js
const sdk = dynamoose.aws.sdk; // require("aws-sdk");
sdk.config.update({
	"accessKeyId": "AKID",
	"secretAccessKey": "SECRET",
	"region": "us-east-1"
});
```

## dynamoose.aws.ddb

The `dynamoose.aws.ddb` property has a couple of custom settings for managing the `AWS.DynamoDB()` instance that Dynamoose uses. This is especially helpful for mocking the `AWS.DynamoDB()` instance when running automated tests against your applications.

## dynamoose.aws.ddb()

This function will return the current `AWS.DynamoDB()` instance that Dynamoose is using to interact with DynamoDB. By default this will return a new `AWS.DynamoDB()` instance. If you set a custom `AWS.DynamoDB()` instance it will return that instead.

```js
const ddb = dynamoose.aws.ddb(); // custom instance set, or `new AWS.DynamoDB()`
```

## dynamoose.aws.ddb.set(ddb)

This function is used to set a custom `AWS.DynamoDB()` instance. This is useful for mocking the instance for situations like automated tests where you want to be able to mock certain interactions with DynamoDB.

```js
const ddb = new MockAWS.DynamoDB();
dynamoose.aws.ddb.set(ddb);
// `dynamoose.aws.ddb()` will now be a reference to `ddb` not `new AWS.DynamoDB()`
```

## dynamoose.aws.ddb.revert()

This function is used to revert the `AWS.DynamoDB()` instance that Dynamoose uses back to the default `new AWS.DynamoDB()` instance.

```js
dynamoose.aws.ddb.revert();
```

## dynamoose.aws.ddb.local([endpoint])

This function is used to set the `AWS.DynamoDB()` instance to use the a local endpoint as opposed to the production instance of DynamoDB. By default the endpoint used will be `http://localhost:8000`. You can pass in a string for the `endpoint` parameter to change what endpoint will be used.

```js
dynamoose.aws.ddb.local();

dynamoose.aws.ddb.local("http://localhost:9000");
```

This function has the same behavior as running `dynamoose.aws.ddb.set` and passing in an `AWS.DynamoDB()` instance with the custom endpoint set. Therefore this function will overwrite any existing custom `dynamoose.aws.ddb` instance that was set previously.

## dynamoose.aws.converter

The `dynamoose.aws.converter` property has a couple of custom settings for managing the `AWS.DynamoDB.Converter` instance that Dynamoose uses. This is especially helpful for mocking the `AWS.DynamoDB.Converter` instance when running automated tests against your applications.

## dynamoose.aws.converter()

This function will return the current `AWS.DynamoDB.Converter` instance that Dynamoose is using to parse objects in and out of DynamoDB. By default this will return `AWS.DynamoDB.Converter`. If you set a custom `AWS.DynamoDB.Converter` instance it will return that instead.

```js
const ddb = dynamoose.aws.converter(); // custom instance set, or `AWS.DynamoDB.Converter`
```

## dynamoose.aws.converter.set(converter)

This function is used to set a custom `AWS.DynamoDB.Converter` instance. This is useful for mocking the instance for situations like automated tests where you want to be able to mock certain interactions with DynamoDB. The converter object you set **must** include all the functions that `AWS.DynamoDB.Converter` provides or else you will run into unexpected errors and undefined behavior.

```js
const converter = {
	input,
	marshall,
	output,
	unmarshall
};
dynamoose.aws.converter.set(converter);
// `dynamoose.aws.converter()` will now be a reference to `converter` not `AWS.DynamoDB.Converter`
```

## dynamoose.aws.converter.revert()

This function is used to revert the `AWS.DynamoDB.Converter` instance that Dynamoose uses back to the default `AWS.DynamoDB.Converter` instance.

```js
dynamoose.aws.converter.revert();
```

## dynamoose.logger.providers.set([provider])

This function allows you to set a provider(s) to receive logged events in Dynamoose. The `provider` parameter can either be a provider object, or an array of provider projects. This function will overwrite all existing providers set. If you pass `undefined`, `null`, or an empty array in as the `provider` parameter all existing providers will be removed. By default there are no providers setup with the Dynamoose logger.

```js
dynamoose.logger.providers.set(console);
```

## dynamoose.logger.providers.clear()

This function clears all existing log providers from Dynamooose. This function behaves the same as `dynamoose.logger.providers.set([])`.

```js
dynamoose.logger.providers.clear();
```

## dynamoose.logger.providers.add(provider)

This function allows you to add a provider(s) to receive logged events in Dynamoose. The `provider` parameter can either be a provider object or an array of provider objects.

Unlike `dynamoose.logger.providers.set` this function appends the new providers to the existing providers and does not overwrite any existing providers.

```js
dynamoose.logger.providers.add(console);
```

## dynamoose.logger.providers.delete(id)

This function allows you to pass in an `id` parameter to delete an existing provider.

```js
dynamoose.logger.providers.delete(id);
```

## dynamoose.logger.providers.list()

This function returns an array of all the log providers Dynamoose is currently using.

```js
dynamoose.logger.providers.list();
```

## dynamoose.logger.pause()

This function pauses all output of log events to all log providers.

```js
dynamoose.logger.pause();
```

## dynamoose.logger.resume()

This function resumes all output of log events to all log providers.

```js
dynamoose.logger.resume();
```

## dynamoose.logger.status()

This function returns `active` if log events are being emitted to log providers, or `paused` if log events have been paused from being emitted to log providers.

```js
dynamoose.logger.status(); // "active" || "paused"
```

## dynamoose.undefined

Setting an attribute value to this will cause it to bypass the `default` value, and set it to `undefined` in the database.

```js
const dynamoose = require("dynamoose");

const User = new dynamoose.Model("User", {"id": String, "name": {"type": String, "default": "Bob"}});
const user = new User({"id": 1, "name": dynamoose.undefined});
await user.save();
// {"id": 1}
// will be saved to the database (notice the `name` property is undefined and did not use the `default` property)
```
