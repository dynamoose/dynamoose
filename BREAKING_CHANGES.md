# Breaking Changes

## 2.0 - incomplete list

- Everything in Dynamoose are now classes. This includes `Model` and `Schema`. This means to initialize a new instance of one of these items, you must use the `new` keyword before it
- `scan.count()` has been removed, and `scan.counts()` has been renamed to `scan.count()`.
- Schema `default` value does not pass the model instance into `default` functions any more.
- `Model.update`
	- `$LISTAPPEND` has been removed, and `$ADD` now includes the behavior of `$LISTAPPEND`
	- `$DELETE` now maps to the correct underlying DynamoDB method instead of the previous behavior of mapping to `$REMOVE`
	- `$PUT` has been replaced with `$SET`
- `dynamoose.model` has been renamed to `dynamoose.Model`
- `dynamoose.local` has been renamed to `dynamoose.aws.ddb.local`
- `dynamoose.setDDB` has been renamed to `dynamoose.aws.ddb.set`
- `Model.getTableReq` has been renamed to `Model.table.create.request`
- `Model.table.create.request` (formerly `Model.getTableReq`) is now an async function
- `model.originalItem` has been renamed to `model.original` (or `Document.original`)
- `Document.original` formerly (`model.originalItem`) no longer returns the last item saved, but the item first retrieved from DynamoDB
- `expires` has been moved from the Schema settings to the Model settings
- `expires.ttl` is now milliseconds as opposed to seconds
- `expires.defaultExpires` is no longer an option (most behavior from this option can be replicated by using the new `dynamoose.undefined` feature)
- `expires.returnExpiredItems` has been renamed to `expires.items.returnExpired`
- `Model.transaction.conditionCheck` has been renamed to `Model.transaction.condition`
- `Model.transaction.condition` options parameter now gets appended to the object returned. This means you can no longer use the helpers that Dynamoose provided to make conditions. Instead, pass in the DynamoDB API level conditions you wish to use
- In the past the `saveUnknown` option for attribute names would handle all nested properties. Now you must use `*` to indicate one level of wildcard or `**` to indicate infinate levels of wildcard. So if you have an object property (`address`) and want to parse one level of values (no sub objects) you can use `address.*`, or `address.**` to all for infinate levels of values (including sub objects)
- `useNativeBooleans` & `useDocumentTypes` have been removed from the Model settings
- `Map` attribute type has been replaced with `Object`
- `List` attribute type has been replaced with `Array`
- `Scan.null` & `Query.null` have been removed. In most cases this can be replaced with `.not().exists()`.
- DynamoDB set types are now returned as JavaScript Set's instead of Array's
- Trying to save a Document with a property set to `null` will now throw an error. If you would like to remove the property set it to `dynamoose.undefined` to set it to undefined without taking into account the `default` setting, or `undefined` to set it to undefined while taking into account the `default` setting.
- Expires TTL value is set to be a default value. In Dynamoose v1 there were cases where expires TTL wouldn't be set, in Dynamoose v2, the behavior of if the Expires TTL is set behaves the same as any default value
