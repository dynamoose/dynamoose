# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Performance

- Improved performance of converting items returned from `scan` and `query` (~2x faster on large result sets). `Schema` now memoizes `attributes`, `getAttributeValue`, `getAttributeType`, and `getAttributeTypeDetails` per schema, and object flattening no longer re-walks each nested value's subtree to detect circular references
- Improved performance of items containing a long list of attributes with multiple possible types (~4x faster for a 800 element list). Building the type paths for such an item no longer copies the accumulated result once per element

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
