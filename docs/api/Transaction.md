# Transaction

DynamoDB supports running transactions in your database. These transactions are all or nothing, meaning the entire transaction will succeed, or the entire transaction will fail. In the event the transaction fails, the state of the database will be the exact same as if the transaction didn't take place at all.

## dynamoose.transaction(transactions[, settings][, callback])

You can use `dynamoose.transaction` to run a transaction on your table. This method uses either the `transactGetItems` or `transactWriteItems` DynamoDB API call to run the transaction.

The `transactions` parameter must be an array of transaction objects that will be passed into the DynamoDB API. The standard way to get these is by using the `Model.transaction` methods. You can also pass Promises into this array that will resolve to an object, and Dynamoose will wait for those promises to be resolved before proceeding.

If you pass RAW objects into the `transactions` array (without using `Model.transaction`) you must be sure that the given model has been registered with Dynamoose at some point so we can convert the response to Document instances of that Model.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `documents`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. | String | `documents` |
| type | If Dynamoose should use `transactGetItems` or `transactWriteItems` to make the transaction call. | String | By default, if all `transactions` items are `Get`, `transactGetItems` will be run, otherwise `transactWriteItems` will be used. |

```js
await dynamoose.transaction([
	User.transaction.update({"id": "user1"}, {"$ADD": {"balance": -100}}),
	Charge.transaction.create({"userid": "user1", "product": "product1", "amount": 100, "status": "successful"}),
	Product.transaction.update({"id": "product1"}, {"$ADD": {"inventory": -1}}),
	Credit.transaction.delete({"id": "credit1"}),
	{
		"Delete": {
			"Key": {
				"id": {
					"S": "helloworld"
				}
			},
			"TableName": "MyOtherTable"
		}
	}
]);
```
