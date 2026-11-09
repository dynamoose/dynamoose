# Dynamoose Changelog

---

### 🚨 Breaking Changes 🚨

- `Model.update` and `Model.transaction.update` now throw an `InvalidParameter` error, before sending, for an update with nothing to write, such as an empty update object or one whose attributes are all skipped. Before, it was sent and DynamoDB rejected the empty update expression with a `ValidationException`. With `{"return": "request"}` and a callback, the error is passed to the callback

### Maintenance

- Store CLA signatures on a dedicated branch so protected main does not block contributors from signing

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `Model.get`, `Model.delete`, `Model.batchGet` and `Model.update` putting the attributes a schema's `set` setting adds into the request's `Key` when the key was passed as a value (`Model.get(1)`), so DynamoDB rejected the request with `The provided key element does not match the schema`. Only the hash key is sent now, as for a key passed as an object
- Fixed `Model.update` and `Model.transaction.update` on a model with several schemas always following the first schema's rules. An attribute only a later schema defines was skipped when set to `undefined`, so the update was sent empty and DynamoDB rejected it, and its `required` and `default` settings were ignored. An update now follows the schema that defines the most of the attributes it names (the first one on a tie), including that schema's `forceDefault` and timestamps
- Fixed `Model.update` and `Model.transaction.update` ignoring an attribute named by its `alias`, `aliases` or `map` name in the update object, which left it out of the update. The key in a single object (`Model.update({"email": "a@b.c", "name": "Bob"})`) can still be named by its alias. An update that names one attribute twice, such as an attribute and its alias, now throws an `InvalidParameter` error instead of writing the last value
- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` and `Model.transaction.update` not writing a `Combine` attribute when the model also has a `forceDefault` attribute. Both were given the same placeholder (e.g. `#a2`), so the request set the default value twice and left the combine attribute out
- Fixed `Model.update` and `Model.transaction.update` replacing an attribute that is a nested Schema with `timestamps` with just its `updatedAt` (`SET address = {"updatedAt": ...}`) when the parent schema also has `timestamps`, which deleted every other property of that attribute. Updates now set only the top-level timestamps. This also fixes such an update sending the attribute twice when it sets or removes it, and throwing `Cannot read properties of undefined (reading 'schema')` for a list of nested Schemas with `timestamps`
- Fixed `Model.update` and `Model.transaction.update` counting a combined attribute changed with `$ADD` or `$DELETE` as set when the update also set an attribute whose placeholder starts with its placeholder (`#a1` and `#a10`). The combine value was built from the amount added instead of throwing `You must update all or none of the combine attributes`
- Fixed the `expires` TTL attribute being silently dropped from every model registered against a table after the first. A model attaching to an already-constructed table did not receive the TTL attribute injection the `Table` constructor performs, so its writes stored no TTL attribute at all while DynamoDB continued to report `TimeToLiveStatus: ENABLED`. Affected every table shared by two or more distinct `Schema` objects, across `create`, `transaction.create`, and `update`
