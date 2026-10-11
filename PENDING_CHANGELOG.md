# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.batchGet`, `Model.update` and `dynamoose.transaction` get results not applying the schema `map`/`alias` settings. Items returned from these methods now use the mapped attribute names, the same as `Model.get`, `Model.query`, and `Model.scan`
- Fixed a mapped (`map`/`alias`) attribute being dropped from a returned item when its value was falsy (`0`, `false` or an empty string)
- Fixed `Model.batchGet` throwing `TypeError: Cannot read properties of undefined` when DynamoDB returned an expired item on a table with `expires.items.returnExpired` set to `false`. Expired items are now left out of the result, the same as `Model.query` and `Model.scan`
- Fixed `Model.batchGet` silently leaving out items whose key attribute has a `get` function. Requested keys were matched against the item after its `get` functions ran, so a key stored as `user#1` and returned as `1` never matched; keys are now matched against the item as DynamoDB returned it
- Fixed `Model.batchGet` silently leaving out items, and unprocessed keys, whose key is a `Buffer`. Key values were compared with `===`, which is never true for two `Buffer` instances; they are now compared by content
