# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Date` and `Buffer` key values in `Model.get`, `Model.batchGet`, `Model.delete`, `Model.batchDelete`, `Model.update` and the `Model.transaction` methods. A `Date` or `Buffer` passed as the hash key sent an empty `Key` to DynamoDB, and a `Date` inside a key object threw `Unsupported type passed`. `Date` key values are now converted using the attribute's `storage` setting before the attribute's `set` function runs, the same as when saving an item (previously a key's `set` function received the `Date` itself), and the key types accept `Date` and `Buffer` values. `Model.batchDelete` also now reports unprocessed items whose key is a `Buffer`; key values were compared with `===`, which is never true for two `Buffer` instances
