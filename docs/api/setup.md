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
