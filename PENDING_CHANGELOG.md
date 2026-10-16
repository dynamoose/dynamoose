# Dynamoose Changelog

---

### 🚨 Breaking Changes 🚨

- `item.save` and `Model.create` now resolve with the saved item in the same form as `Model.get`: schema `get` modifiers are applied, and `Date` attributes and timestamps are `Date` objects instead of numbers. Timestamps set on the saved item instance are also `Date` objects now

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
