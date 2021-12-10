## new dynamoose.Instance()

This class allows you to create a new instance of Dynamoose, allowing for easy multi-region AWS requests.

By default Dynamoose will create a default instance for you automatically. This both ensures backwards compatibility, and allows for an easy to use API for users not using this feature.

```js
const otherDynamooseInstance = new dynamoose.Instance();
```

## instance.aws

This object has the same interface as [`dynamoose.aws`](Dynamoose#dynamooseaws). Meaning you can run `instance.aws.ddb.set` and all other methods on that object.

```js
const otherDynamooseInstance = new dynamoose.Instance();

otherDynamooseInstance.aws.ddb.set({
	"region": "us-west-1"
});

dynamoose.aws.ddb.set({
	"region": "us-east-1"
});
```

:::note
`instance.aws.converter` is a global object. Meaning all instances will share the same `instance.aws.converter` object. There is currently no way to set a custom `instance.aws.converter` object for a specific instance.
:::

## new instance.Table(name, [models][, config])

Once again, this has the same interface as [`dynamoose.Table()`](Table#new-dynamoosetablename-models). The only difference is that all table commands will be run through this instances `instance.aws.ddb` object.
