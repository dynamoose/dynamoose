## new dynamoose.Instance()

dyno_jsdoc_dist/Instance.js|new Instance()

## instance.aws

This object has the same interface as [`dynamoose.aws`](Dynamoose#dynamooseaws). Meaning you can run `instance.aws.ddb.set` and all other methods on that object.

```js
const otherDynamooseInstance = new dynamoose.Instance();

otherDynamooseInstance.aws.ddb.set(new DynamoDB.DynamoDB({
	"region": "us-west-1"
}));

dynamoose.aws.ddb.set(new DynamoDB.DynamoDB({
	"region": "us-east-1"
}));
```

:::note
`instance.aws.converter` is a global object. Meaning all instances will share the same `instance.aws.converter` object. There is currently no way to set a custom `instance.aws.converter` object for a specific instance.
:::

## new instance.Table(name, [models][, config])

Once again, this has the same interface as [`dynamoose.Table()`](Table#new-dynamoosetablename-models-options). The only difference is that all table commands will be run through this instances `instance.aws.ddb` object.
