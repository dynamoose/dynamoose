# Scan

Dynamoose provides the ability to scan a model by using the `Model.scan` function. This function acts as a builder to construct your scan with the appropriate settings before executing it (`scan.exec`).

## Model.scan([filter])

This is the basic entry point to construct a scan request. The filter property is optional and can either be an object or a string representing the key you which to first filter on. In the event you don't pass in any parameters and don't call any other methods on the scan object it will scan with no filters or options.

```js
Cat.scan().exec() // will scan all items with no filters or options
Cat.scan("breed").contains("Terrier").exec() // will scan all items and filter all items where the key `breed` contains `Terrier`
Cat.scan({"breed": {"contains": "Terrier"}}).exec() // will scan all items and filter all items where the key `breed` contains `Terrier`
```

If you pass an object into `Model.scan` the object for each key should contain the comparison type. For example, in the last example above, `contains` was our comparison type. This comparison type must match one of the comparison type functions listed on this page.

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
	}
});
```

```js
const results = await Cat.scan().exec();
// `results` is identical to what is listed in the callback version of this function.
```

The results array will have some special parameters attached to it to give you more information about the scan operation:

- `lastKey` - In the event there are more items to scan in DynamoDB this property will be equal to an object that you can pass into [`scan.startAt(key)`](#scanstartatkey) to retrieve more items. Normally DynamoDB returns this property as a DynamoDB object, but Dynamoose returns it and handles it as a standard JS object without the DynamoDB types.
- `count` - The count property from DynamoDB, which represents how many items were returned from DynamoDB. This should always equal the number of items in the array.
- `scannedCount` - How many items DynamoDB scanned. This doesn't necessarily represent how many items were returned from DynamoDB due to filters that might have been applied to the scan request.
- `timesScanned` - How many times Dynamoose made a scan request to DynamoDB. This will always equal 1, unless you used the `scan.all` or `scan.parallel` method.

## scan.and()

This function has no behavior and is only used to increase readability of your scan object. This function can be omitted with no behavior change to your code.

```js
// The two scan objects below are identical
Cat.scan().filter("id").eq(1).and().filter("name").eq("Bob");
Cat.scan().filter("id").eq(1).filter("name").eq("Bob");
```

## scan.not()

This function sets the scan to use the opposite comparison type for the given filter condition. You can find the list opposite comparison types below.

- equals (EQ) - not equals (NE)
- less than or equals (LE) - greater than (GT)
- less than (LT) - greater than or equals (GE)
- null (NULL) - not null (NOT_NULL)
- contains (CONTAINS) - not contains (NOT_CONTAINS)
- exists (EXISTS) - not exists (NOT_EXISTS)

As well the following comparisons do not have an opposite comparison type, and will throw an error if you try to use scan.not() with them.

- in (IN)
- between (BETWEEN)
- begins with (BEGINS_WITH)

```js
Cat.scan().filter("id").not().eq(1); // Retrieve all objects where id does NOT equal 1
Cat.scan().filter("id").not().between(1, 2); // Will throw error since between does not have an opposite comparison type
```

## scan.filter(key)

This function prepares a new filter conditional to be used with the request. If you have not finished your previous filter conditional before using this function again it will wipe out the previous pending conditional filter. The `key` parameter is a string that you pass in representing which attribute you would like to filter on.

You will use this function with a comparison function which will complete the filter conditional and allow you to start another filter conditional if you wish.

```js
Cat.scan().filter("id"); // Currently this scan has no filter behavior and will scan all items in the table
Cat.scan().filter("id").eq(1); // Since this scan has a comparison function (eq) after the filter it will complete the filter conditional and only scan items where `id` = 1
```

## scan.where(key)

This function is identical to [`scan.filter(key)`](#scanfilterkey) and just used as an alias.

## scan.eq(value)

This comparison function will check to see if the given filter key is equal to the value you pass in as a parameter.

```js
Cat.scan().filter("name").eq("Tom"); // Return all items where `name` equals `Tom`
```

## scan.exists()

This comparison function will check to see if the given filter key exists in the document.

```js
Cat.scan().filter("phoneNumber").exists(); // Return all items where `phoneNumber` exists in the document

Cat.scan().filter("phoneNumber").not().exists(); // Return all items where `phoneNumber` does not exist in the document
```

## scan.lt(value)

This comparison function will check to see if the given filter key is less than the value you pass in as a parameter.

```js
Cat.scan().filter("age").lt(5); // Return all items where `age` is less than 5
```

## scan.le(value)

This comparison function will check to see if the given filter key is less than or equal to the value you pass in as a parameter.

```js
Cat.scan().filter("age").le(5); // Return all items where `age` is less than or equal to 5
```

## scan.gt(value)

This comparison function will check to see if the given filter key is greater than the value you pass in as a parameter.

```js
Cat.scan().filter("age").gt(5); // Return all items where `age` is greater than 5
```

## scan.ge(value)

This comparison function will check to see if the given filter key is greater than or equal to the value you pass in as a parameter.

```js
Cat.scan().filter("age").ge(5); // Return all items where `age` is greater than or equal to 5
```

## scan.beginsWith(value)

This comparison function will check to see if the given filter key begins with the value you pass in as a parameter.

```js
Cat.scan().filter("name").beginsWith("T"); // Return all items where `name` begins with `T`
```

## scan.contains(value)

This comparison function will check to see if the given filter key contains the value you pass in as a parameter.

```js
Cat.scan().filter("name").contains("om"); // Return all items where `name` contains `om`
```

## scan.in(values)

This comparison function will check to see if the given filter key equals any of the items you pass in in the values array you pass in. The `values` parameter must be an array and will only return results where the value for the given key exists in the array you pass in.

```js
Cat.scan("name").in(["Charlie", "Bob"]) // Return all items where `name` = `Charlie` OR `Bob`
```

## scan.between(a, b)

This comparison function will check to see if the given filter key is between the two values you pass in as parameters.

```js
Cat.scan().filter("age").between(5, 9); // Return all items where `age` is between 5 and 9
```

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
