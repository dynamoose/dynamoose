# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed a serializer `exclude` path into a nested object or list (such as `"address.city"` or `"lines.0.cost"`) deleting the value from the item itself, so a later `save` could write the change to DynamoDB. The plain objects and lists along each excluded path are now copied before deleting, so the item is left as it was and the serialized output is unchanged. An `exclude` path through an inherited `__proto__`, `constructor` or `prototype` property is now ignored, instead of deleting from a built-in prototype such as `Object.prototype`
