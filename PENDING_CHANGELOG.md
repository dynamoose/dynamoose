# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options
- Added a `returnItems` setting to `dynamoose.transaction`, so a write transaction resolves with the written items in the same order as the request: a `create` gives the stored item built from the request, an `update` gives the stored item read back in one `transactGetItems` call, and a `delete` or `condition` gives `undefined`. Each item uses the model that built its request and looks as `Model.get` would return it. If the write succeeds but the items can't be returned, the promise rejects with a `TransactionReadError` whose `committed` property is `true`

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `dynamoose.transaction` rejecting with `No value defined: {}` when a `Get` asked for an item that does not exist. The result now has `undefined` at that position, in the same order as the request
