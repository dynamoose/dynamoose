# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` and `Model.transaction.update` throwing `TypeMismatch` (`Expected friends.0 to be of type string, instead found type undefined.`) for a list attribute set to `undefined`. The value was wrapped in a list before the `undefined` check, so it became `[undefined]`. A list attribute set to `undefined` is now handled as any other attribute is: removed (`REMOVE`), set back to its `default`, or rejected with a `ValidationError` when `required`. A single value for a list attribute (`{"$ADD": {"friends": "Tim"}}`) is still wrapped in a list
