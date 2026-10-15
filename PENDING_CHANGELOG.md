# Dynamoose Changelog

---

### Maintenance

- Store CLA signatures on a dedicated branch so protected main does not block contributors from signing

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `Model.get`, `Model.delete`, `Model.batchGet` and `Model.update` putting the attributes a schema's `set` setting adds into the request's `Key` when the key was passed as a value (`Model.get(1)`), so DynamoDB rejected the request with `The provided key element does not match the schema`. Only the hash key is sent now, as for a key passed as an object
- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` and `Model.transaction.update` not writing a `Combine` attribute when the model also has a `forceDefault` attribute. Both were given the same placeholder (e.g. `#a2`), so the request set the default value twice and left the combine attribute out
- Fixed `Model.update` and `Model.transaction.update` replacing an attribute that is a nested Schema with `timestamps` with just its `updatedAt` (`SET address = {"updatedAt": ...}`) when the parent schema also has `timestamps`, which deleted every other property of that attribute. Updates now set only the top-level timestamps. This also fixes such an update sending the attribute twice when it sets or removes it, and throwing `Cannot read properties of undefined (reading 'schema')` for a list of nested Schemas with `timestamps`
- Fixed `Model.update` and `Model.transaction.update` counting a combined attribute changed with `$ADD` or `$DELETE` as set when the update also set an attribute whose placeholder starts with its placeholder (`#a1` and `#a10`). The combine value was built from the amount added instead of throwing `You must update all or none of the combine attributes`
- Fixed the `expires` TTL attribute being silently dropped from every model registered against a table after the first. A model attaching to an already-constructed table did not receive the TTL attribute injection the `Table` constructor performs, so its writes stored no TTL attribute at all while DynamoDB continued to report `TimeToLiveStatus: ENABLED`. Affected every table shared by two or more distinct `Schema` objects, across `create`, `transaction.create`, and `update`
- Fixed a raw condition object being silently ignored when its expression property didn't match the request. A `FilterExpression` raw condition passed to `Model.update`, `Model.delete`, `Item.save` or a transaction was dropped, so the write ran without its condition; a `ConditionExpression` raw condition passed to `query` or `scan` was dropped, so no filter was applied. Either property is now used for both, and any other property (such as `ComparisonExpression`, which the documentation previously named) throws an `InvalidParameter` error
- Fixed `Model.update` adding its update expression, names and values to the raw condition object passed in, which made a reused raw condition throw or be ignored on the next request
- Fixed a raw condition object without `ExpressionAttributeValues` (for an expression that uses no values, such as `attribute_exists(#id)`) throwing `The type: #id is invalid`. It is now used as a raw condition, and the request leaves out `ExpressionAttributeValues` unless something else in the request adds values. An empty `ExpressionAttributeNames` or `ExpressionAttributeValues` map, which DynamoDB rejects, is left out as well
- Fixed `Model.query` with a raw condition object throwing `Index can't be found for query.`. Dynamoose now splits the raw expression at its top-level `AND`s, picks the index from the parts that are key conditions, and sends those as the `KeyConditionExpression`, leaving the rest in the `FilterExpression`. A second condition on the same key attribute throws an `InvalidParameter` error, because DynamoDB rejects a key attribute in the `FilterExpression`
- Fixed `Model.update` replacing a raw condition's names and values when they used the same placeholders as the update (`#a0`, `:v0`), which made the condition silently check a different attribute or value. The update's placeholders now start after the raw condition's
- Fixed the `Condition` documentation naming `ComparisonExpression` instead of `ConditionExpression` for raw condition objects, and a raw example using a number instead of a string for an `N` value
- Fixed a raw condition object passed to `condition.parenthesis()` or `condition.group()` being dropped, which made `Model.query` throw `TypeError: Cannot read properties of undefined (reading '0')` and a scan or conditional write run without it. It is now sent in parentheses with its own names and values, and two raw conditions that use one placeholder for different names or values throw an `InvalidParameter` error
