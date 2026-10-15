# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options
- Added `readStrict` Table option. If set to `false`, reads return items whose stored values do not match the schema type as stored, instead of throwing a `TypeMismatch` error. The default (`true`) keeps the current behavior

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
