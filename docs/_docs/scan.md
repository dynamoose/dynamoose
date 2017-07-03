---
order: 5
---
## Scan

### Model.scan(filter, options, callback)

Scans a table. The optional filter parameter can either be an attribute of the table or a complete filter object. If the callback is provided, the exec command is called automatically, and the scan parameter must be a Scan object.

```js
Dog.scan('breed').contains('Terrier').exec(function (err, dogs) {
  // Look at all the Terriers
});
```

```js
Dog.scan({breed: {contains: 'Terrier'} }, function (err, dogs) {
  // Look at all the Terriers
});
```

To get all the items in a table, do not provide a filter.

```js
Dog.scan().exec(function (err, dogs) {
  // Look at all the dogs
  if(dogs.lastKey) { // More dogs to get
    Dog.scan().startAt(dogs.lastKey).exec(function (err, dogs) {
      // Look more dogs
    });
  }
});
```

To use the raw AWS filter in scanning especially for nested fields scan purposes, compose the filter object and pass it in.

* *The `TableName` field in raw filter is not necessary to be specified. If it is left blank, the model name will be used as default table name.*

```js
var Dog = dynamoose.model('Dog');
// this should be composed, ref: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
var filter = {
  FilterExpression: 'details.timeWakeUp = :wakeUp',
  ExpressionAttributeValues: {
    ':wakeUp': '8am'
  }
};

Dog.scan(filter).exec()
  .then(function(dogs) {
    console.log(dogs);
  })
  .catch(function(err) {
    console.error(err);
  });
```

### scan.exec(callback)

Executes a scan against a table

### scan.all([delay[, max]])

Recursively scan as long as lastKey exists. This function will also return a property called `timesScanned` indicating how many scans were completed.

`delay` is the time (in seconds) between recursive scans. Default: 1sec

`max` is the maximum number of recursive scans. Default: 0 - unlimited

### scan.parallel(totalSegments)

Preforms a parallel scan on the table.

`totalSegments` is the number of parallel scans

The results will be merged into a single array.  `.lastKey` will be an array of `lastKey` objects.

**Warning**  this can consume a lot of capacity.

### scan.and()

For readability only. Scans us AND logic for multiple attributes.  `and()` does not provide any functionality and can be omitted.

### scan.where(filter) | scan.filter(filter)

Add additional attribute to the filter list.

### scan.not()

Inverts the filter logic that follows.

### scan.null()

Scan attribute for null.

### scan.eq(value)

Attribute is equal to the value.  If `null`, `undefined`, or a empty string is passed as the value, `scan.null()` is called.

### scan.lt(value)

Attribute is less than the value.

### scan.le(value)

Attribute is less than or equal value.

### scan.ge(value)

Attribute is greater than or equal value.

### scan.gt(value)

Attribute is greater than the value.

### scan.contains(value)

Attribute contains the value.

### scan.beginsWith(value)

Attribute begins with the value.

### scan.in(values)

Attribute is in values array.

### scan.between(a, b)

Attribute value is greater than or equal `a`. and less than or equal to `b`.

### scan.limit(limit)

The maximum number of items to evaluate (not necessarily the number of matching items). If DynamoDB processes the number of items up to the limit while processing the results, it stops the operation and returns the matching values up to that point, and a key in `lastKey` to apply in a subsequent operation, so that you can pick up where you left off. Also, if the processed data set size exceeds 1 MB before DynamoDB reaches this limit, it stops the operation and returns the matching values up to the limit, and a key in `lastKey` to apply in a subsequent operation to continue the operation. For more information, see Query and Scan in the Amazon DynamoDB Developer Guide.

### scan.startAt(key)

Start scan at key. Use `lastKey` returned in `scan.exec()` callback.

### scan.attributes(attributes)

Set the list of attributes to return.

### scan.count()

Return the number of matching items, rather than the matching items themselves.

### scan.counts()

Return the counts object of matching items, rather than the matching items themselves:

```js
{
    "count": 2,
    "scannedCount": 1000
}
```

If you used a filter in the scan, then `count` is the number of items returned after the filter was applied, and `scannedCount` is the number of matching items before the filter was applied.


### scan.consistent()

Scan with consistent read.
