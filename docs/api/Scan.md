# Scan

Dynamoose provides the ability to scan a model by using the `Model.scan` function. This function acts as a builder to construct your scan with the appropriate settings before executing it (`scan.exec`).

*Please note:* The Scan operation operates on your entire table. For tables of real size, this can quickly use up all of your Read Capacity. If you're using it in your application's critical path, it will be very slow in returning a response to your users. The best option is not never use `scan()` unless you know what you are doing! 

## Model.scan([filter])

This is the basic entry point to construct a scan request. The filter property is optional and can either be an object or a string representing the key you which to first filter on. In the event you don't pass in any parameters and don't call any other methods on the scan object it will scan with no filters or options.

```js
Cat.scan().exec() // will scan all items with no filters or options
Cat.scan("breed").contains("Terrier").exec() // will scan all items and filter all items where the key `breed` contains `Terrier`
Cat.scan({"breed": {"contains": "Terrier"}}).exec() // will scan all items and filter all items where the key `breed` contains `Terrier`
```

If you pass an object into `Model.scan` the object for each key should contain the comparison type. For example, in the last example above, `contains` was our comparison type. This comparison type must match one of the comparison type functions listed on this page.

## Conditionals

On top of all of the methods listed below, every `Scan` instance has all of the methods that a `Condition` instance has. This means you can use methods like `where`, `filter`, `eq`, `lt` and more.

Please check the [Condition documentation](Condition.md) to find the rest of the methods you can use with Scan.

## scan.exec([callback])

This will execute the scan you constructed. If you pass in a callback the callback function will be executed upon completion passing in an error (if exists), and the results array. In the event you didn't pass in a callback parameter, a promise will be returned that will resolve to the results array upon completion.

```js
Cat.scan().exec((error, results) => {
	if (error) {
		console.error(error);
	} else {
		console.log(results);
		// [ Document { name: 'Will', breed: 'Terrier', id: 1 },
		//   lastKey: undefined,
		//   count: 1,
		//   scannedCount: 2,
		//   timesScanned: 1 ]
		console.log(results[0]); // { name: 'Will', breed: 'Terrier', id: 1 }
		console.log(results.count); // 1
		console.log(Array.isArray(results)); // true
		console.log(results.scannedCount); // 2
	}
});
```

```js
const results = await Cat.scan().exec();
// `results` is identical to what is listed in the callback version of this function.
```

The `results` array you receive back is a standard JavaScript array of objects. However, the array has some special properties with extra information about your scan operation that you can access. This does not prevent the ability do running loops or accessing the objects within the array.

The extra properties attached to the array are:

| Name | Description |
|---|---|
| `lastKey` | In the event there are more items to scan in DynamoDB this property will be equal to an object that you can pass into [`scan.startAt(key)`](#scanstartatkey) to retrieve more items. Normally DynamoDB returns this property as a DynamoDB object, but Dynamoose returns it and handles it as a standard JS object without the DynamoDB types. |
| `count` | The count property from DynamoDB, which represents how many items were returned from DynamoDB. This should always equal the number of items in the array. |
| `scannedCount` | How many items DynamoDB scanned. This doesn't necessarily represent how many items were returned from DynamoDB due to filters that might have been applied to the scan request. |
| `timesScanned` | How many times Dynamoose made a scan request to DynamoDB. This will always equal 1, unless you used the `scan.all` or `scan.parallel` method. |

## scan.limit(count)

This function will limit the number of items that DynamoDB will scan in this request. Unlike most SQL databases this does not guarantee the response will contain 5 items. Instead DynamoDB will only scan a maximum of 5 items to see if they match and should be returned. The `count` parameter passed in should be a number representing how many items you wish DynamoDB to scan.

```js
Cat.scan().limit(5); // Limit scan request to 5 items
```

## scan.startAt(key)

In the event there are more items to scan in a previous response, Dynamoose will return a key in the `.lastKey` property. You can pass that object into this property to further scan items in your table.

Although the `.lastKey` property returns a standard (non DynamoDB) object, you can pass a standard object OR DynamoDB object into this function, and it will handle either case.

```js
const response = await Cat.scan().exec();
const moreItems = Cat.scan().startAt(response.lastKey);
```

## scan.attributes(attributes)

This function will limit which attributes DynamoDB returns for each item in the table. This can limit the size of the DynamoDB response and helps you only retrieve the data you need. The `attributes` property passed into this function should be an array of strings representing the property names you wish DynamoDB to return.

```js
Cat.scan().attributes(["id", "name"]); // Return all documents but only return the `id` & `name` properties for each item
```

## scan.parallel(parallelScans)

This function will run parallel scans on your table. The `parallelScans` parameter should be a number representing how many concurrent scans you wish to preform on the table. The results will be merged into a single array, with the `count`, `scannedCount`, & `timesScanned` properties being summed in the response. In the event there are multiple `lastKey` properties these will be merged into an array of objects.

**WARNING this action can consume a lot of capacity**

```js
Cat.scan().parallel(4); // Run 4 parallel scans on the table
```

## scan.count()

Instead of returning the items in the array this function will cause the scan operation to return a special object with the count information for the scan. The response you will receive from the scan operation with this setting will be an object with the properties `count` & `scannedCount`, which have the same values as described in [`scan.exec([callback])`](#scanexeccallback).

```js
const response = await Cat.scan().count().exec();
console.log(response); // {"count": 1, "scannedCount": 1}
```

## scan.consistent()

This will cause the scan to run in a consistent manner as opposed to the default eventually consistent manner.

```js
Cat.scan().consistent(); // Run the scan in a consistent manner
```

## scan.using(index)

This causes the scan to be run on a specific index as opposed to the default table wide scan. The `index` parameter you pass in should represent the name of the index you wish to scan on.

```js
Cat.scan().using("name-index"); // Run the scan on the `name-index` index
```

## scan.all([delay[, max]])

If a scan result is more than 1 MB (before filtering!), DynamoDB paginates the results so you would have to send multiple requests. Please see the [AWS DynamoDB documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html) for further informations.

Unlike most other scan functions that directly change the DynamoDB scan request, this function is purely internal and unique to Dynamoose. This function sends continuous scan requests upon receiving the response so long as the `lastKey` property exists on the response. This can be useful if you wish to get all the items from the table and don't want to worry about checking the `lastKey` property and sending a new scan request yourself.

Two parameters can be specified on this setting:

- `delay` - Number (default: 0) - The number of milliseconds to delay between receiving of the response of one scan request and sending of the request for the next scan request.
- `max` - Number (default: 0) - The maximum number of requests that should be made to DynamoDB, regardless of if the `lastKey` property still exists in the response. In the event this is set to 0, an unlimited number of requests will be made to DynamoDB, so long as the `lastKey` property still exists.

The items for all of the requests will be merged into a single array with the `count` & `scannedCount` properties being summed in the response. If you set a maximum number of scan requests and there is still a `lastKey` on the response that will be returned to you.

```js
Cat.scan().all(); // Scan table and so long as the `lastKey` property exists continuously scan the table to retrieve all items
Cat.scan().all(100); // Scan table and so long as the `lastKey` property exists continuously scan the table to retrieve all items with a 100 ms delay before the next scan request
Cat.scan().all(0, 5); // Scan table and so long as the `lastKey` property exists continuously scan the table to retrieve all items with a maximum of 5 requests total
```
