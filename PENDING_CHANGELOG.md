# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Performance

- Improved performance of `Model.update` on items with many nested attributes when the schema has nested `required` attributes (~270x faster for a 2,000 element list: 26.8 s to 99 ms). The update flattened the whole item once for every attribute it checked; it now flattens it once

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
