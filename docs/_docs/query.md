---
order: 4
---
## Query

### Model.query(query, options, callback)

Queries a table or index. The query parameter can either the the hash key of the table or global index or a complete query object. If the callback is provided, the exec command is called automatically, and the query parameter must be a query object.

```js
Dog.query('breed').eq('Beagle').exec(function (err, dogs) {
  // Look at all the beagles
});
```

```js
Dog.query({breed: {eq: 'Beagle'} }, function (err, dogs) {
  // Look at all the beagles
});
```

### query.exec(callback)

Executes the query against the table or index.

### query.where(rangeKey)

Set the range key of the table or index to query.

### query.filter(filter)

Set the attribute on which to filter.

### query.and()

Use add logic for filters.

### query.or()

Use or logic for filters.

### query.not()

Inverts the filter logic that follows.

### query.null()

Filter attribute for null.

### query.eq(value)

Hash, range key, or filter must equal the value provided. This is the only comparison option allowed for a hash key.

### query.lt(value)

Range key or filter less than the value.

### query.le(value)

Range key or filter less than or equal value.

### query.ge(value)

Range key or filter greater than or equal value.

### query.gt(value)

Range key or filter greater than the value.

### query.beginsWith(value)

Range key or filter begins with value

### query.between(a, b)

Range key or filter is greater than or equal `a`. and less than or equal to `b`.

### query.contains(value)

Filter contains the value.

### query.beginsWith(value)

Filter begins with the value.

### query.in(values)

Filter is in values array.

### query.limit(limit)

The maximum number of items to evaluate (not necessarily the number of matching items). If DynamoDB processes the number of items up to the limit while processing the results, it stops the operation and returns the matching values up to that point, and a key in `lastKey` to apply in a subsequent operation, so that you can pick up where you left off. Also, if the processed data set size exceeds 1 MB before DynamoDB reaches this limit, it stops the operation and returns the matching values up to the limit, and a key in `lastKey` to apply in a subsequent operation to continue the operation. For more information, see Query and Scan in the Amazon DynamoDB Developer Guide.

### query.consistent()

Query with consistent read.

### query.descending()

Sort in descending order.

### query.ascending()

Sort in ascending order (default).

### query.startAt(key)

Start query at key. Use `lastKey` returned in query.exec() callback.

### query.attributes(attributes)

Set the list of attributes to return.

### query.count()

Return the number of matching items, rather than the matching items themselves.

### query.counts()

Return the counts object of matching items, rather than the matching items themselves:

```js
{
    "count": 2,
    "scannedCount": 1000
}
```

If you used a filter in the request, then `count` is the number of items returned after the filter was applied, and `scannedCount` is the number of matching items before the filter was applied.
