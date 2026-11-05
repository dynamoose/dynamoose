# Dynamoose Changelog

---

### Maintenance

- Store CLA signatures on a dedicated branch so protected main does not block contributors from signing

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options
- `Model.batchGet` now sends more than 100 keys, and `Model.batchPut` and `Model.batchDelete` more than 25 items, as several DynamoDB requests one after another, and combine their results and unprocessed keys or items. Before, DynamoDB rejected such a batch with `ValidationException: Too many items requested`. A batch sent as more than one request throws an `InvalidParameter` error, before sending any of it, when two of its keys or items have the same key, as DynamoDB does for a single request
- Added a `retryUnprocessed` setting to `Model.batchGet`, `Model.batchPut` and `Model.batchDelete`. With `{"attempts": n}`, Dynamoose sends the keys or items DynamoDB returns as unprocessed again, up to `n` times with exponential backoff and full jitter (`delay`, default 100 ms), and returns only what is still unprocessed after that. Each wait is at most 20 seconds
- Added a `concurrency` setting to `Model.batchGet`, `Model.batchPut` and `Model.batchDelete`, which sends that many of a large batch's DynamoDB requests at a time (default 1)

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` and `Model.transaction.update` not writing a `Combine` attribute when the model also has a `forceDefault` attribute. Both were given the same placeholder (e.g. `#a2`), so the request set the default value twice and left the combine attribute out
- Fixed `Model.update` and `Model.transaction.update` counting a combined attribute changed with `$ADD` or `$DELETE` as set when the update also set an attribute whose placeholder starts with its placeholder (`#a1` and `#a10`). The combine value was built from the amount added instead of throwing `You must update all or none of the combine attributes`
