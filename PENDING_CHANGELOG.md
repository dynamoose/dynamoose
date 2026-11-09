# Dynamoose Changelog

---

### 🚨 Breaking Changes 🚨

- `new dynamoose.Schema` now throws `The updatedAt timestamp attribute "updatedAt" must not be a hashKey or rangeKey.` when an `updatedAt` timestamp is the schema's `hashKey` or `rangeKey`. Its value changes on every save, so `item.save()` wrote the item under a new key and left the old item in the table, and `Model.update` failed on DynamoDB because an update can't set a key attribute. An `updatedAt` timestamp can still be an index key, and a `createdAt` timestamp can still be the `hashKey` or `rangeKey`. To keep a version per save, use your own sort key attribute and set it on each save

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
