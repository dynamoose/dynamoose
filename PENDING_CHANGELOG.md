# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` typing a value by another attribute's schema when a `$REMOVE` came before it. For example `{"$REMOVE": ["tags"], "$SET": {"list": ["a", "b"]}}` stored `list` as a string set, because values were paired with attribute names by position
- Fixed `Model.update` writing a nested `forceDefault` attribute as a top-level attribute named after its dotted path (for example `business.tier`) on every update
- Fixed `Model.update` throwing "You must update all or none of the combine attributes" when the update writes none of them
- Fixed `Model.update` being impossible to run against a schema whose hash or range key is a `Combine` attribute. Updating the sources of such a key now throws a clear error instead of a DynamoDB rejection
