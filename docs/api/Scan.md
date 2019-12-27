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

- `lastKey` - In the event there are more items to scan in DynamoDB this property will be equal to an object that you can pass into `scan.startAt` to retrieve more items. Normally DynamoDB returns this property as a DynamoDB object, but we return it and handle it as a standard JS object without the DynamoDB types.
- `count` - The count property from DynamoDB, which represents how many items were returned from DynamoDB. This should always equal the number of items in the array.
- `scannedCount` - How many items DynamoDB scanned. This doesn't necessarily represent how many items were returned from DynamoDB due to filters that might have been applied to the scan request.
- `timesScanned` - How many times Dynamoose made a scan request to DynamoDB. This will always equal 1, unless you used the `scan.all` or `scan.parallel` method.

## scan.in(values)

You can use this to specify an array and only return results where the keys value exists in the array you specify.

```js
Cat.scan("name").in(["Charlie", "Bob"])
```
