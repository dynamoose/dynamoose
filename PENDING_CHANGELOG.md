# Dynamoose Changelog

---

### 🚨 Breaking Changes 🚨

- `Item.save` now applies custom type conversion to the item it resolves with, so custom typed attributes (such as `Date`) are returned in the same representation as `Model.get`. Previously `save` resolved with the underlying DynamoDB representation (for example a `number` for `Date` attributes) while `get` resolved with the custom type (a `Date` instance)

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options
- Added a `merge` setting to `Model.update`. Passing `{"merge": true}` updates a nested object in place by writing each provided property to its own document path (`SET attr.sub = :v`), matching how a nested attribute update is expressed against DynamoDB directly, instead of replacing the whole attribute as a map. The default behavior is unchanged

### Bug Fixes

- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` corrupting arrays, Sets, and Buffers nested inside a map attribute. These values were traversed as if they were nested maps, which produced document paths keyed by array indices or byte offsets, and silently dropped Sets from the update entirely
- Fixed `Item.attributesWithSchema` throwing `node.forEach is not a function` when an object was supplied for an attribute the schema defines as an array
- Fixed `Model.update` rejecting partially specified nested attributes at the type level. Update bodies are now typed as `DeepPartial<T>`
- Fixed the `save` callback being invoked a second time when the supplied callback itself threw an error
