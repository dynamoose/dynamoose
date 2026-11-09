# Dynamoose Changelog

---

### 🚨 Breaking Changes 🚨

- A request DynamoDB always rejects for a missing or empty value now throws an `InvalidParameter` error before it is sent, instead of being sent and failing with DynamoDB's `ValidationException`. Code that catches the `ValidationException` for these cases gets the `InvalidParameter` error instead:
  - a condition value that is `undefined`, in `query`, `scan` and every write condition (`eq(undefined)`, `{"name": undefined}`, an `undefined` item of `in` or `between`, `between` with one value, or a raw condition placeholder without a value). Before, the chained form logged `Dynamoose Warning: Passing undefined into a condition ... is not supported` and sent the request; the warning is gone
  - a query key condition (on the hashKey or rangeKey of the table or of the index the query uses) whose value is `null`, an empty string or an empty binary value
  - a key that has no hashKey or rangeKey value, or a `null`, empty string or empty binary one, in `Model.get`, `Model.delete`, `Model.update`, `Model.batchGet`, `Model.batchDelete` and the `Model.transaction` methods. `Model.get(null)` threw `TypeError: Cannot convert undefined or null to object`
  - an item saved without a key attribute of the table, or with an empty string or binary value for a key attribute of the table or of an index, in `Model.create`, `item.save`, `Model.batchPut` and `Model.transaction.create`, and an update that sets a key attribute of an index to an empty string or binary value
  - a `beginsWith` value that isn't a string or binary value (such as `null` or a number), which DynamoDB's `begins_with` doesn't accept

### Maintenance

- Built every stored condition comparison with one function, so each holds exactly one attribute, which the code reading them relies on. This replaces a TODO about comparisons that could hold several attributes; no behavior changes
- Store CLA signatures on a dedicated branch so protected main does not block contributors from signing

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `Model.get`, `Model.delete`, `Model.batchGet` and `Model.update` putting the attributes a schema's `set` setting adds into the request's `Key` when the key was passed as a value (`Model.get(1)`), so DynamoDB rejected the request with `The provided key element does not match the schema`. Only the hash key is sent now, as for a key passed as an object
- Fixed a condition object with an `undefined` or `null` value (`Model.query({"id": undefined})`, `Model.scan({"name": null})`) throwing `TypeError: Cannot read properties of undefined` or `Cannot convert undefined or null to object` when it was built, and `{"name": {"eq": null}}` comparing the attribute with the map `{"eq": null}`. A `null` value is now compared with `NULL`, as `eq(null)` does
- Fixed a condition value that is an empty map or binary value (`filter("address").eq({})`) being left out of the request, which DynamoDB rejected. Only an empty `ExpressionAttributeNames` or `ExpressionAttributeValues` is left out now
- Fixed `item.save`, `Model.batchPut` and `Model.update` with `{"return": "request"}` and a callback never calling the callback when building the request failed
- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` and `Model.transaction.update` not writing a `Combine` attribute when the model also has a `forceDefault` attribute. Both were given the same placeholder (e.g. `#a2`), so the request set the default value twice and left the combine attribute out
- Fixed `Model.update` and `Model.transaction.update` replacing an attribute that is a nested Schema with `timestamps` with just its `updatedAt` (`SET address = {"updatedAt": ...}`) when the parent schema also has `timestamps`, which deleted every other property of that attribute. Updates now set only the top-level timestamps. This also fixes such an update sending the attribute twice when it sets or removes it, and throwing `Cannot read properties of undefined (reading 'schema')` for a list of nested Schemas with `timestamps`
- Fixed `Model.update` and `Model.transaction.update` counting a combined attribute changed with `$ADD` or `$DELETE` as set when the update also set an attribute whose placeholder starts with its placeholder (`#a1` and `#a10`). The combine value was built from the amount added instead of throwing `You must update all or none of the combine attributes`
- Fixed the `expires` TTL attribute being silently dropped from every model registered against a table after the first. A model attaching to an already-constructed table did not receive the TTL attribute injection the `Table` constructor performs, so its writes stored no TTL attribute at all while DynamoDB continued to report `TimeToLiveStatus: ENABLED`. Affected every table shared by two or more distinct `Schema` objects, across `create`, `transaction.create`, and `update`
