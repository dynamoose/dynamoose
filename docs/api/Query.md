# Query

Dynamoose provides the ability to query a model by using the `Model.query` function. This function acts as a builder to construct your query with the appropriate settings before executing it (`query.exec`).

## Model.query([filter])

This is the basic entry point to construct a query request. It requires to set at least the hashKey of the item(s). The filter property is optional and can either be an object or a string representing the key you which to first filter on. In the event you don't pass in any parameters and don't call any other methods on the query object it will query with no filters or options.

```js
Cat.query("breed").contains("Terrier").exec() // will query all items where the hashKey `breed` contains `Terrier`
Cat.query({"breed": {"contains": "Terrier"}}).exec() // will query all items where the hashKey `breed` contains `Terrier`
```

If you pass an object into `Model.query` the object for each key should contain the comparison type. For example, in the last example above, `contains` was our comparison type. This comparison type must match one of the comparison type functions listed on this page.

Please note: `Model.query()` combines both the `KeyConditionExpression` and the `FilterExpression` from DynamoDB. If you query for an attribute that you defined as your hashKey or rangeKey DynamoDB will use `KeyConditionExpression`. This could be the most performant and cost efficient way to query for. If querying for attributes that are not defined as your hashKey or rangeKey DynamoDB might select more items at first and then filter the result which could have a bad impact on performance and costs.    

## Conditionals

On top of all of the methods listed below, every `Query` instance has all of the methods that a `Condition` instance has. This means you can use methods like `where`, `filter`, `eq`, `lt` and more.

Please check the [Condition documentation](Condition.md) to find the rest of the methods you can use with Query.

## query.exec([callback])

This will execute the query you constructed. If you pass in a callback the callback function will be executed upon completion passing in an error (if exists), and the results array. In the event you didn't pass in a callback parameter, a promise will be returned that will resolve to the results array upon completion.

```js
Cat.query("name").eq("Will").exec((error, results) => {
	if (error) {
		console.error(error);
	} else {
		console.log(results);
		// [ Document { name: 'Will', breed: 'Terrier', id: 1 },
		//   lastKey: undefined,
		//   count: 1,
		//   queriedCount: 2,
		//   timesQueried: 1 ]
		console.log(results[0]); // { name: 'Will', breed: 'Terrier', id: 1 }
		console.log(results.count); // 1
		console.log(Array.isArray(results)); // true
		console.log(results.scannedCount); // 2
	}
});
```

```js
const results = await Cat.query().exec();
// `results` is identical to what is listed in the callback version of this function.
```

The `results` array you receive back is a standard JavaScript array of objects. However, the array has some special properties with extra information about your query operation that you can access. This does not prevent the ability do running loops or accessing the objects within the array.

The extra properties attached to the array are:

| Name | Description |
|---|---|
| `lastKey` | In the event there are more items to query in DynamoDB this property will be equal to an object that you can pass into [`query.startAt(key)`](#querystartatkey) to retrieve more items. Normally DynamoDB returns this property as a DynamoDB object, but Dynamoose returns it and handles it as a standard JS object without the DynamoDB types. |
| `count` | The count property from DynamoDB, which represents how many items were returned from DynamoDB. This should always equal the number of items in the array. |
| `queriedCount` | How many items DynamoDB queried. This doesn't necessarily represent how many items were returned from DynamoDB due to filters that might have been applied to the query request. |
| `timesQueried` | How many times Dynamoose made a query request to DynamoDB. This will always equal 1, unless you used the `query.all` or `query.parallel` method. |

## query.limit(count)

This function will limit the number of items that DynamoDB will query in this request. Unlike most SQL databases this does not guarantee the response will contain 5 items. Instead DynamoDB will only query a maximum of 5 items to see if they match and should be returned. The `count` parameter passed in should be a number representing how many items you wish DynamoDB to query.

```js
Cat.query("name").eq("Will").limit(5); // Limit query request to 5 items
```

## query.startAt(key)

In the event there are more items to query in a previous response, Dynamoose will return a key in the `.lastKey` property. You can pass that object into this property to further query items in your table.

Although the `.lastKey` property returns a standard (non DynamoDB) object, you can pass a standard object OR DynamoDB object into this function, and it will handle either case.

```js
const response = await Cat.query("name").eq("Will").exec();
const moreItems = Cat.query("name").eq("Will").startAt(response.lastKey);
```

## query.attributes(attributes)

This function will limit which attributes DynamoDB returns for each item in the table. This can limit the size of the DynamoDB response and helps you only retrieve the data you need. The `attributes` property passed into this function should be an array of strings representing the property names you wish DynamoDB to return.

```js
Cat.query("name").eq("Will").attributes(["id", "name"]); // Return all documents but only return the `id` & `name` properties for each item
```

## query.count()

Instead of returning the items in the array this function will cause the query operation to return a special object with the count information for the query. The response you will receive from the query operation with this setting will be an object with the properties `count` & `queriedCount`, which have the same values as described in [`query.exec([callback])`](#queryexeccallback).

```js
const response = await Cat.query("name").eq("Will").count().exec();
console.log(response); // {"count": 1, "queriedCount": 1}
```

## query.consistent()

This will cause the query to run in a consistent manner as opposed to the default eventually consistent manner.

```js
Cat.query("name").eq("Will").consistent(); // Run the query in a consistent manner
```

## query.using(index)

This causes the query to be run on a specific index as opposed to the default table wide query. The `index` parameter you pass in should represent the name of the index you wish to query on.

```js
Cat.query("name").eq("Will").using("name-index"); // Run the query on the `name-index` index
```

## query.all([delay[, max]])

If a query result is more than the limit of your DynamoDB table, DynamoDB paginates the results so you would have to send multiple requests. This function sends continuous query requests until all items have been received (as long as the `lastKey` property exists on the response). This can be useful if you wish to get all the items from the table and don't want to worry about checking the `lastKey` property and sending a new query request yourself.

Two parameters can be specified on this setting:

- `delay` - Number (default: 0) - The number of milliseconds to delay between receiving of the response of one query request and sending of the request for the next query request.
- `max` - Number (default: 0) - The maximum number of requests that should be made to DynamoDB, regardless of if the `lastKey` property still exists in the response. In the event this is set to 0, an unlimited number of requests will be made to DynamoDB, so long as the `lastKey` property still exists.

The items for all of the requests will be merged into a single array with the `count` & `queriedCount` properties being summed in the response. If you set a maximum number of query requests and there is still a `lastKey` on the response that will be returned to you.

```js
Cat.query("name").eq("Will").all(); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items
Cat.query("name").eq("Will").all(100); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items with a 100 ms delay before the next query request
Cat.query("name").eq("Will").all(0, 5); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items with a maximum of 5 requests total
```
