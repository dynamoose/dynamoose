Dynamoose supports running DynamoDB Transactions in your database. Transactions are all or nothing, meaning the entire transaction will succeed, or the entire transaction will fail. In the event the transaction fails, the state of the database will be the exact same as if the transaction didn't take place at all (ex. no items will have been modified). You are also able to run these Transactions across multiple tables.

## dynamoose.transaction(transactions[, settings][, callback])

You can use `dynamoose.transaction` to run a transaction on your table. This method uses either the `transactGetItems` or `transactWriteItems` DynamoDB API call to run the transaction.

The `transactions` parameter must be an array of transaction objects that will be passed into the DynamoDB API. The standard way to get these is by using the [`Model.transaction` methods](Model#modeltransaction). You can also pass Promises into this array that will resolve to an object, and Dynamoose will wait for those promises to be resolved before proceeding.

If you pass RAW objects into the `transactions` array (without using `Model.transaction`) you must be sure that the given model has been registered with Dynamoose at some point so we can convert the response to Item instances of that Model.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. For a `get` transaction, the promise resolves with an array of items in the same order as `transactions`, with `undefined` in place of an item that does not exist. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format.

You can also pass in an object for the optional `settings` parameter that is an object. The table below represents the options for the `settings` object.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| return | What the function should return. Can be `items`, or `request`. In the event this is set to `request` the request Dynamoose will make to DynamoDB will be returned, and no request to DynamoDB will be made. | String | `items` |
| type | If Dynamoose should use `get` (`transactGetItems`) or `write` (`transactWriteItems`) to make the transaction call. | String (`get` \| `write`) | By default, if all `transactions` objects are `Get`, `get` will be run, otherwise `write` will be used. |
| returnItems | If a `write` transaction should resolve with the written items. See [Returning written items](#returning-written-items). Can't be used when `return` is set to `request`. | Boolean | `false` |

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

## Returning written items

DynamoDB does not return items from a write transaction, so by default a `write` transaction resolves with `null`. Set `returnItems` to `true` to resolve with an array that has one entry per object in `transactions`, in the same order:

- `create` (`Put`): the item as stored, built from the request without reading it from DynamoDB.
- `update` (`Update`): the item as stored after the transaction. Dynamoose reads every updated item back in one `transactGetItems` call after the write succeeds, which uses read capacity for each of them. The item is read after the write, so a change another request makes in between is included, and an item deleted in between is `undefined`.
- `delete` (`Delete`) and `condition` (`ConditionCheck`): `undefined`.

Every item looks the same as `Model.get` would return it: an instance of the model whose `Model.transaction` method built that request, with its `get` functions and `map` names applied. That differs from `Model.create`, which returns the item without its `get` functions applied. A written item is returned even if its `expires` time has passed. For an object you build yourself, or a copy of one a `Model.transaction` method returned, Dynamoose uses the first model of that table the item fits.

```js
const [charge, user, , product] = await dynamoose.transaction([
	Charge.transaction.create({"id": "charge1", "userid": "user1", "amount": 100}),
	User.transaction.update({"id": "user1"}, {"$ADD": {"balance": -100}}),
	Credit.transaction.delete({"id": "credit1"}),
	Product.transaction.update({"id": "product1"}, {"$ADD": {"inventory": -1}})
], {"returnItems": true});

console.log(user.balance); // The balance stored after the transaction
```

In TypeScript, you can pass the item types in the same order: `dynamoose.transaction<[Charge, User, undefined, Product]>(...)`. Dynamoose does not check them against the requests.

If the write succeeds but the written items can't be returned (reading them back fails, or a `get` function throws), the promise rejects with an error whose `name` is `TransactionReadError`. Its `committed` property is `true` and its `cause` property is the original error. The data is saved, so don't retry the write: a retried `create` fails because the item exists, and a retried `$ADD` is applied twice.

