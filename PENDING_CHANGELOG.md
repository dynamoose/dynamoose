# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed a raw condition object being silently ignored when its expression property didn't match the request. A `FilterExpression` raw condition passed to `Model.update`, `Model.delete`, `Item.save` or a transaction was dropped, so the write ran without its condition; a `ConditionExpression` raw condition passed to `query` or `scan` was dropped, so no filter was applied. Either property is now used for both, and any other property (such as `ComparisonExpression`, which the documentation previously named) throws an `InvalidParameter` error
- Fixed `Model.update` adding its update expression, names and values to the raw condition object passed in, which made a reused raw condition throw or be ignored on the next request
- Fixed a raw condition object without `ExpressionAttributeValues` (for an expression that uses no values, such as `attribute_exists(#id)`) throwing `The type: #id is invalid`. It is now used as a raw condition, and the request leaves out `ExpressionAttributeValues` unless something else in the request adds values. An empty `ExpressionAttributeNames` or `ExpressionAttributeValues` map, which DynamoDB rejects, is left out as well
- Fixed `Model.query` with a raw condition object throwing `Index can't be found for query.`. Dynamoose now splits the raw expression at its top-level `AND`s, picks the index from the parts that are key conditions, and sends those as the `KeyConditionExpression`, leaving the rest in the `FilterExpression`. A second condition on the same key attribute throws an `InvalidParameter` error, because DynamoDB rejects a key attribute in the `FilterExpression`
- Fixed `Model.update` replacing a raw condition's names and values when they used the same placeholders as the update (`#a0`, `:v0`), which made the condition silently check a different attribute or value. The update's placeholders now start after the raw condition's
- Fixed the `Condition` documentation naming `ComparisonExpression` instead of `ConditionExpression` for raw condition objects, and a raw example using a number instead of a string for an `N` value
- Fixed a raw condition object passed to `condition.parenthesis()` or `condition.group()` being dropped, which made `Model.query` throw `TypeError: Cannot read properties of undefined (reading '0')` and a scan or conditional write run without it. It is now sent in parentheses with its own names and values, and two raw conditions that use one placeholder for different names or values throw an `InvalidParameter` error
