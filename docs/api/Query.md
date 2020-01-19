# Query

Dynamoose provides the ability to query a model by using the `Model.query` function. This function acts as a builder to construct your query with the appropriate settings before executing it (`query.exec`).

## Model.query([filter])

This is the basic entry point to construct a query request. The filter property is optional and can either be an object or a string representing the key you which to first filter on. In the event you don't pass in any parameters and don't call any other methods on the query object it will query with no filters or options.

```js
Cat.query().exec() // will query all items with no filters or options
Cat.query("breed").contains("Terrier").exec() // will query all items and filter all items where the key `breed` contains `Terrier`
Cat.query({"breed": {"contains": "Terrier"}}).exec() // will query all items and filter all items where the key `breed` contains `Terrier`
```

If you pass an object into `Model.query` the object for each key should contain the comparison type. For example, in the last example above, `contains` was our comparison type. This comparison type must match one of the comparison type functions listed on this page.

## query.exec([callback])

This will execute the query you constructed. If you pass in a callback the callback function will be executed upon completion passing in an error (if exists), and the results array. In the event you didn't pass in a callback parameter, a promise will be returned that will resolve to the results array upon completion.

```js
Cat.query().exec((error, results) => {
	if (error) {
		console.error(error);
	} else {
		console.log(results);
		// [ Document { name: 'Will', breed: 'Terrier', id: 1 },
		//   lastKey: undefined,
		//   count: 1,
		//   queriedCount: 2,
		//   timesQueried: 1 ]
	}
});
```

```js
const results = await Cat.query().exec();
// `results` is identical to what is listed in the callback version of this function.
```

The results array will have some special parameters attached to it to give you more information about the query operation:

- `lastKey` - In the event there are more items to query in DynamoDB this property will be equal to an object that you can pass into [`query.startAt(key)`](#querystartatkey) to retrieve more items. Normally DynamoDB returns this property as a DynamoDB object, but Dynamoose returns it and handles it as a standard JS object without the DynamoDB types.
- `count` - The count property from DynamoDB, which represents how many items were returned from DynamoDB. This should always equal the number of items in the array.
- `queriedCount` - How many items DynamoDB queried. This doesn't necessarily represent how many items were returned from DynamoDB due to filters that might have been applied to the query request.
- `timesQueried` - How many times Dynamoose made a query request to DynamoDB. This will always equal 1, unless you used the `query.all` or `query.parallel` method.

## query.and()

This function has no behavior and is only used to increase readability of your query object. This function can be omitted with no behavior change to your code.

```js
// The two query objects below are identical
Cat.query().filter("id").eq(1).and().filter("name").eq("Bob");
Cat.query().filter("id").eq(1).filter("name").eq("Bob");
```

## query.not()

This function sets the query to use the opposite comparison type for the given filter condition. You can find the list opposite comparison types below.

- equals (EQ) - not equals (NE)
- less than or equals (LE) - greater than (GT)
- less than (LT) - greater than or equals (GE)
- null (NULL) - not null (NOT_NULL)
- contains (CONTAINS) - not contains (NOT_CONTAINS)

As well the following comparisons do not have an opposite comparison type, and will throw an error if you try to use query.not() with them.

- in (IN)
- between (BETWEEN)
- begins with (BEGINS_WITH)

```js
Cat.query().filter("id").not().eq(1); // Retrieve all objects where id does NOT equal 1
Cat.query().filter("id").not().between(1, 2); // Will throw error since between does not have an opposite comparison type
```

## query.filter(key)

This function prepares a new filter conditional to be used with the request. If you have not finished your previous conditional before using this function again it will wipe out the previous pending conditional. The `key` parameter is a string that you pass in representing which attribute you would like to filter on.

You will use this function with a comparison function which will complete the filter conditional and allow you to start another filter conditional if you wish.

```js
Cat.query().filter("id"); // Currently this query has no filter behavior and will query all items in the table
Cat.query().filter("id").eq(1); // Since this query has a comparison function (eq) after the filter it will complete the filter conditional and only query items where `id` = 1
```

## query.where(key)

This function prepares a new range key conditional to query with the request. If you have not finished your previous conditional before using this function again it will wipe out the previous pending conditional. The `key` parameter is a string that you pass in representing which range key you would like to add a conditional to.

You will use this function with a comparison function which will complete the conditional and allow you to start another conditional if you wish.

```js
Cat.query().where("id"); // Currently this query has no behavior and will query all items in the table
Cat.query().where("id").eq(1); // Since this query has a comparison function (eq) after the conditional it will complete the conditional and only query items where `id` = 1
```

## query.null()

This comparison function will check to see if the given filter key is null.

```js
Cat.query().filter("name").null(); // Return all items where `name` is null
```

## query.eq(value)

This comparison function will check to see if the given filter key is equal to the value you pass in as a parameter. If `null`, `undefined`, or an empty string is passed as the value parameter, this function will behave just like [`query.null()`](#querynull).

```js
Cat.query().filter("name").eq("Tom"); // Return all items where `name` equals `Tom`

Cat.query().filter("name").eq(); // Same as `Cat.query().filter("name").null()`
```

## query.lt(value)

This comparison function will check to see if the given filter key is less than the value you pass in as a parameter.

```js
Cat.query().filter("age").lt(5); // Return all items where `age` is less than 5
```

## query.le(value)

This comparison function will check to see if the given filter key is less than or equal to the value you pass in as a parameter.

```js
Cat.query().filter("age").le(5); // Return all items where `age` is less than or equal to 5
```

## query.gt(value)

This comparison function will check to see if the given filter key is greater than the value you pass in as a parameter.

```js
Cat.query().filter("age").gt(5); // Return all items where `age` is greater than 5
```

## query.ge(value)

This comparison function will check to see if the given filter key is greater than or equal to the value you pass in as a parameter.

```js
Cat.query().filter("age").ge(5); // Return all items where `age` is greater than or equal to 5
```

## query.beginsWith(value)

This comparison function will check to see if the given filter key begins with the value you pass in as a parameter.

```js
Cat.query().filter("name").beginsWith("T"); // Return all items where `name` begins with `T`
```

## query.contains(value)

This comparison function will check to see if the given filter key contains the value you pass in as a parameter.

```js
Cat.query().filter("name").contains("om"); // Return all items where `name` contains `om`
```

## query.in(values)

This comparison function will check to see if the given filter key equals any of the items you pass in in the values array you pass in. The `values` parameter must be an array and will only return results where the value for the given key exists in the array you pass in.

```js
Cat.query("name").in(["Charlie", "Bob"]) // Return all items where `name` = `Charlie` OR `Bob`
```

## query.between(a, b)

This comparison function will check to see if the given filter key is between the two values you pass in as parameters.

```js
Cat.query().filter("age").between(5, 9); // Return all items where `age` is between 5 and 9
```

## query.limit(count)

This function will limit the number of items that DynamoDB will query in this request. Unlike most SQL databases this does not guarantee the response will contain 5 items. Instead DynamoDB will only query a maximum of 5 items to see if they match and should be returned. The `count` parameter passed in should be a number representing how many items you wish DynamoDB to query.

```js
Cat.query().limit(5); // Limit query request to 5 items
```

## query.startAt(key)

In the event there are more items to query in a previous response, Dynamoose will return a key in the `.lastKey` property. You can pass that object into this property to further query items in your table.

Although the `.lastKey` property returns a standard (non DynamoDB) object, you can pass a standard object OR DynamoDB object into this function, and it will handle either case.

```js
const response = await Cat.query().exec();
const moreItems = Cat.query().startAt(response.lastKey);
```

## query.attributes(attributes)

This function will limit which attributes DynamoDB returns for each item in the table. This can limit the size of the DynamoDB response and helps you only retrieve the data you need. The `attributes` property passed into this function should be an array of strings representing the property names you wish DynamoDB to return.

```js
Cat.query().attributes(["id", "name"]); // Return all documents but only return the `id` & `name` properties for each item
```

## query.count()

Instead of returning the items in the array this function will cause the query operation to return a special object with the count information for the query. The response you will receive from the query operation with this setting will be an object with the properties `count` & `queriedCount`, which have the same values as described in [`query.exec([callback])`](#queryexeccallback).

```js
const response = await Cat.query().count().exec();
console.log(response); // {"count": 1, "queriedCount": 1}
```

## query.consistent()

This will cause the query to run in a consistent manner as opposed to the default eventually consistent manner.

```js
Cat.query().consistent(); // Run the query in a consistent manner
```

## query.using(index)

This causes the query to be run on a specific index as opposed to the default table wide query. The `index` parameter you pass in should represent the name of the index you wish to query on.

```js
Cat.query().using("name-index"); // Run the query on the `name-index` index
```

## query.all([delay[, max]])

Unlike most other query functions that directly change the DynamoDB query request, this function is purely internal and unique to Dynamoose. This function sends continuous query requests upon receiving the response so long as the `lastKey` property exists on the response. This can be useful if you wish to get all the items from the table and don't want to worry about checking the `lastKey` property and sending a new query request yourself.

Two parameters can be specified on this setting:

- `delay` - Number (default: 0) - The number of milliseconds to delay between receiving of the response of one query request and sending of the request for the next query request.
- `max` - Number (default: 0) - The maximum number of requests that should be made to DynamoDB, regardless of if the `lastKey` property still exists in the response. In the event this is set to 0, an unlimited number of requests will be made to DynamoDB, so long as the `lastKey` property still exists.

The items for all of the requests will be merged into a single array with the `count` & `queriedCount` properties being summed in the response. If you set a maximum number of query requests and there is still a `lastKey` on the response that will be returned to you.

```js
Cat.query().all(); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items
Cat.query().all(100); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items with a 100 ms delay before the next query request
Cat.query().all(0, 5); // Query table and so long as the `lastKey` property exists continuously query the table to retrieve all items with a maximum of 5 requests total
```
