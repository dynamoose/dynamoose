## dynamoose.aws

The `dynamoose.aws` object is used to set AWS level settings for Dynamoose. This includes things like setting a custom DDB instance, setting the AWS region, access keys, and more.

## dynamoose.aws.ddb

The `dynamoose.aws.ddb` property has a couple of custom settings for managing the `@aws-sdk/client-dynamodb` `DynamoDB` instance that Dynamoose uses. This is especially helpful for mocking the `@aws-sdk/client-dynamodb` `DynamoDB` instance when running automated tests against your applications.

## dynamoose.aws.ddb()

This function will return the current `@aws-sdk/client-dynamodb` `DynamoDB` instance that Dynamoose is using to interact with DynamoDB. By default this will return a new `@aws-sdk/client-dynamodb` `DynamoDB` instance. If you set a custom `@aws-sdk/client-dynamodb` `DynamoDB` instance it will return that instead.

```js
const ddb = dynamoose.aws.ddb(); // custom instance set, or `new AWS.DynamoDB()`
```

## dynamoose.aws.ddb.DynamoDB

This is the default `@aws-sdk/client-dynamodb` `DynamoDB` constructor that you can use to create a new DynamoDB client instance. You can pass this into the [`dynamoose.aws.ddb.set`](#dynamooseawsddbsetddb) function to set a custom `@aws-sdk/client-dynamodb` `DynamoDB` instance.

```js
const ddb = new dynamoose.aws.ddb.DynamoDB({
	"region": "us-east-1",
});
```

## dynamoose.aws.ddb.set(ddb)

This function is used to set a custom `@aws-sdk/client-dynamodb` `DynamoDB` instance. This is useful for mocking the instance for situations like automated tests where you want to be able to mock certain interactions with DynamoDB.

```js
const ddb = new MockAWS.DynamoDB();
dynamoose.aws.ddb.set(ddb);
// `dynamoose.aws.ddb()` will now be a reference to `ddb` not `new DynamoDB()`
```

## dynamoose.aws.ddb.revert()

This function is used to revert the `@aws-sdk/client-dynamodb` `DynamoDB` instance that Dynamoose uses back to the default `@aws-sdk/client-dynamodb` `DynamoDB` instance.

```js
dynamoose.aws.ddb.revert();
```

## dynamoose.aws.ddb.local([endpoint])

This function is used to set the `@aws-sdk/client-dynamodb` `DynamoDB` instance to use the a local endpoint as opposed to the production instance of DynamoDB. By default the endpoint used will be `http://localhost:8000`. You can pass in a string for the `endpoint` parameter to change what endpoint will be used.

```js
dynamoose.aws.ddb.local();

dynamoose.aws.ddb.local("http://localhost:9000");
```

This function has the same behavior as running `dynamoose.aws.ddb.set` and passing in an `@aws-sdk/client-dynamodb` `DynamoDB` instance with the custom endpoint set. Therefore this function will overwrite any existing custom `dynamoose.aws.ddb` instance that was set previously.

## dynamoose.aws.converter

The `dynamoose.aws.converter` property has a couple of custom settings for managing the `@aws-sdk/util-dynamodb` converter methods that Dynamoose uses. This is especially helpful for mocking the converter methods when running automated tests against your applications.

Dynamoose currently stores/uses the following converter methods from `@aws-sdk/util-dynamodb`:

- marshall
- unmarshall
- convertToAttr
- convertToNative

:::note
`dynamoose.aws.converter` is a global object. Meaning if you take advantage of [Dynamoose Instances](Instance), all instances will share the same `dynamoose.aws.converter` object. There is currently no way to set a custom `dynamoose.aws.converter` object for a specific instance.
:::

## dynamoose.aws.converter()

This function will return the current object of converter methods that Dynamoose is using to parse objects in and out of DynamoDB. By default this will return an object with the methods (listed above) from `@aws-sdk/util-dynamodb`. If you set a custom object it will return that instead.

```js
const ddb = dynamoose.aws.converter(); // custom object set, or object with `@aws-sdk/util-dynamodb` default methods
```

## dynamoose.aws.converter.set(converter)

This function is used to set a custom object of methods for Dynamoose to use when converting. This is useful for mocking the methods for situations like automated tests where you want to be able to mock certain interactions with DynamoDB. The converter object you set **must** include all the functions listed above in the [`dynamoose.aws.converter`](#dynamooseawsconverter) section or else you will run into unexpected errors and undefined behavior.

```js
const converter = {
	marshall,
	unmarshall,
	convertToAttr,
	convertToNative
};
dynamoose.aws.converter.set(converter);
// `dynamoose.aws.converter()` will now be a reference to `converter` not the default `@aws-sdk/util-dynamodb` methods
```

## dynamoose.aws.converter.revert()

This function is used to revert the converter object back to the original methods that `@aws-sdk/util-dynamodb` provides for Dynamoose to use.

```js
dynamoose.aws.converter.revert();
```

## dynamoose.logger()

For Dynamoose logging information refer to the [logging](Logging) documentation.

## dynamoose.type.UNDEFINED

dyno_jsdoc_dist/type.d.ts|_default.UNDEFINED

## dynamoose.type.THIS

dyno_jsdoc_dist/type.d.ts|_default.THIS

## dynamoose.type.NULL

dyno_jsdoc_dist/type.d.ts|_default.NULL

## dynamoose.type.ANY

dyno_jsdoc_dist/type.d.ts|_default.ANY

## dynamoose.type.CONSTANT(value)

dyno_jsdoc_dist/type.d.ts|_default.CONSTANT

## dynamoose.type.COMBINE(attributes[, separator])

dyno_jsdoc_dist/type.d.ts|_default.COMBINE
