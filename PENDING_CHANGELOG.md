# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### General

- Improved read and write performance: `utils.object.entries` and `keys` no longer walk each nested object's whole subtree to detect cycles, schema lookups skip the list-index regex for keys without an index, and `Item.attributesWithSchema` reuses a cached tree of the schema's attributes
- Improved performance by caching attribute lookups per Schema: `Item.save`, `Model.get` and `Model.update` are about 1.5 to 2.8 times as fast on large schemas. A Schema now assumes that its definition is not changed after `new Schema()`: a nested definition object edited in place afterwards is not seen, so create a new Schema instead

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
