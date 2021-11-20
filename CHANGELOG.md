# Dynamoose Changelog

---

## Version 2.8.2

This release fixes a few major bugs.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fixed bug where Model initialization would fail if `waitForActive: true`
- Fixing multiple bugs where objects passed into Dynamoose functions would be mutated

### Documentation

- Added FAQ about empty arrays or objects
- Improved schema index documentation
- Improving `Scan.startAt` & `Query.startAt` example in documentation
- Fixing issue where `\n` appeared in schema attribute type documentation appeared instead of new line

---

## Version 2.8.1

This release includes a few critical bug fixes.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fix issue where query would fail with `Index can't be found for query` error when querying table itself
- Resolve issue where Model.update would fail if beginning of attribute was identical to another attribute and marked as required
- Fix issue in TypeScript where you couldn't pass a number value in for a key parameter
- Resolved bug where passing a string or number in for Model.update key parameter would throw error

---

## Version 2.8.0

This release contains general stability improvements to Dynamoose.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- New `returnValues` settings property for `Model.update`
- Allowing `waitForActive` model setting to be a boolean

### Bug Fixes

- Improvements to index selection when querying without `using` method
- Including `saveUnknown` properties when using `Model.update`
- Allowing for strings to be passed into `Query.sort` method when using TypeScript
- Removing internal cache to improve memory usage
- Improving performance when working with Buffers

### Documentation

- Model default settings documentation fixes

---

## Version 2.7.3

This release moves internal Dynamoose object utilities to a different package.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Other

- Moving internal object utilities to different package

---

## Version 2.7.2

This release fixes a bug related to the return value of `document.save` and `Model.create`, and more.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- `document.save` & `Model.create` now return the document saved to DynamoDB
- Type messages now display `null` when passing in a invalid type `null` value as opposed to the previous `object`

### Other

- Added some more TypeScript tests

---

## Version 2.7.1

This release has a lot of bug fixes for Dynamoose.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fixing issue where with required check failing for non updating properties when using `$DELETE` in `Model.delete`
- Prioritizing indexes with range key when querying
- Improvements to type and schema matching for nested properties
- Fixing issue where retrieving previously created model would ignore prefix and suffix
- Fixing TypeScript issues with nested models
- Fixing issue where nested models would auto-populate
- Fixing issues with nested models within nested elements

### Documentation

- Making `saveUnknown` more clear in documentation

### Other

- Added warning when passing in `undefined` into Conditional

---

## Version 2.7.0

This release patches a 🚨 security vulnerability 🚨.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- Patch for [Prototype Pollution (GHSA-rrqm-p222-8ph2)](https://github.com/dynamoose/dynamoose/security/advisories/GHSA-rrqm-p222-8ph2)
- Added `$DELETE` option for `Model.update`

### Bug Fixes

- Fixed a bug related to `update` setting being true for model with index

---

## Version 2.6.0

This release adds support for a new constant type along with a bunch of other improvements and fixes.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- Added Constant type
- Added `attributes` setting for Model.batchGet

### Bug Fixes

- Fixed issues with nested arrays with multiple data types
- Fixed issue with array of indexes
- Fixed bugs related to multiple types for attribute
- Fixed internal method bug that had the potential to cause issues throughout codebase (only known issue related to update transactions)

### Other

- Added security policy

---

## Version 2.5.0

This release adds support for the DynamoDB `null` type, along with some more TypeScript fixes, and some other cool enhancements.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- Added support for the DynamoDB `null` type
- Added support for `Document.save` condition setting

### Bug Fixes

- Fixed TypeScript typing bugs related to Scan & Queries
- Fixed TypeScript typing bugs related to `dynamoose.THIS`
- Fixed TypeScript typing bugs related to `Model.waitForActive.check` setting
- Fixed TypeScript typing bugs related to `dynamoose.THIS`
- Fixed TypeScript typing issue with multiple type options for attribute

### Documentation

- Better explaination for `name` parameter representing the DynamoDB table name

---

## Version 2.4.1

This release fixes a performance issue related to TypeScript.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Other

- Fixes a memory leak related to the TypeScript target being `es6`. This was fixed by changing the target to `es2017`.

---

## Version 2.4.0

This release fixes a lot of bugs and adds support for consistent read support to `Model.get` and support for conditional deletes.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- Added consistent read support to `Model.get`
- Added support for passing a condition into `Model.delete`
- Added support for strongly typed models in TypeScript

### Bug Fixes

- Fixed bug where `document.delete` would fail with rangeKey
- Transaction TypeScript improvements
- Set schema type TypeScript improvements
- Fixed issue related to having `0` as number for key (range or hash)
- Fixed bug where passing in reserved keyword attributes into `Model.get` would fail
- Improvements to how queries decide which index to use
- Improvements to storing and retrieving documents with multi-dimensional arrays (nested arrays)

### Documentation

- Updated website search
- Improvements to documentation clarity

---

## Version 2.3.0

This release adds major new support for single table design.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Major New Features

- Single Table Design Enhancements
	- Nested Schemas
	- Multiple Attribute Types
	- Combine Type
	- Multiple Schemas per Model
- Readds populate support (similar to v1 but breaking changes between v1 and v2 populate functionality)

### General

- Adds document.toJSON() method
- Adds Serialization support

### Bug Fixes

- Minor bug fixes for TypeScript typings

---

## Version 2.2.1

This release fixes some minor bugs found in Dynamoose.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fixed an issue with creation of local secondary indexes
- Fixed an issue where specifying attributes to retrieve wouldn't work with reserved DynamoDB keywords

### Other

- Adding icons to website for GitHub & npm links

---

## Version 2.2.0

This release adds a few key features to improve your Dynamoose workflow.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- Added support for `query.sort`
- Added support for only passing model name into `dynamoose.model` and having it retrieve the registered model that was already registered previously
- Added support for passing original value into `set` attribute setting function
- Added attributes setting to `Model.get` to only retrieve certain attributes

### Bug Fixes

- Fixed an issue where `document.original` would return a DynamoDB object and not a parsed object in certain cases

---

## Version 2.1.3

This release fixes some minor bugs.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fixing issue where creating multiple indexes would fail when creating or updating table
- Fixing issue where `Model.update` with single object and `rangeKey` would fail

---

## Version 2.1.2

This release fixes a few minor bugs with `Model.update`.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- Fixed an issue where `Model.update` using `$REMOVE` wouldn't work on non defined attributes using `saveUnknown`
- Fixed an issue where `Model.update` would throw an AWS error `ExpressionAttributeValues must not be empty` when using `$REMOVE`

---

## Version 2.1.1

This release fixes some bugs related to TypeScript and improves the website with more accurate information.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- 🔍 Added search functionality to website

### Bug Fixes

- TypeScript Fixes
	- Removed esModuleInterop from tsconfig.json
	- Allowing Schema Index Throughput to be Optional

### Documentation

- Add migration section from v1 to v2 to website FAQ page
- Fixed ES Modules Import Documentation

---

## Version 2.1.0

This release adds beta support for TypeScript typings.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Major New Features

- Beta support for TypeScript Typings

---

## Version 2.0.0

Version 2.0 is here!! This is a **full** rewrite of Dynamoose from the ground up. This means that the changelog listed below is not necessarily complete, but attempts to cover a lot of the high level items of this release. There are a lot of minor bug fixes and improvements that went into this rewrite that will not be covered, as well as potientally some breaking changes that are not included in the changelog below.

Although version 2.0 is a full rewrite, the underlying API hasn't changed very much. Things like `Model.scan` or `Model.get` have not changed seamingly at all. The foundational syntax is indentical to version 1.0. This means the majority of breaking changes won't effect most users or will require only minor tweaks.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions or problems with this release.

### General

- Complete rewrite of the codebase!!!
	- Better conditional support with new `dynamoose.Condition` class
	- Same familiar API
- Entirely new [website](https://dynamoosejs.com)
	- Dark mode 🌑
	- Edit links on each page to contribute changes and improve documentation
	- Improved sidebar with easier orgainzation
	- Links to navigate to next/previous pages on website
- License has been changed to The Unlicense from MIT

### 🚨 Breaking Changes 🚨

- `dynamoose.setDefaults` has been renamed to `dynamoose.model.defaults.set`
- `dynamoose.local` has been renamed to `dynamoose.aws.ddb.local`
- `dynamoose.setDDB` has been renamed to `dynamoose.aws.ddb.set`
- `dynamoose.revertDDB` has been renamed to `dynamoose.aws.ddb.revert`
- `dynamoose.AWS.config.update` has been renamed to `dynamoose.aws.sdk.config.update`
- `dynamoose.ddb` has been renamed to `dynamoose.aws.ddb`
- `Map` attribute type has been replaced with `Object`
- `List` attribute type has been replaced with `Array`
- DynamoDB set types are now returned as JavaScript Set's instead of Array's
- DynamoDB set types are now defined as `{"type": Set, "schema": [String]}` as opposed to the former `[String]` or `{"type": [String]}`. This is more explict and makes it more clear that the type is a set.
- Trying to save a Document with a property set to `null` will now throw an error. If you would like to remove the property set it to `dynamoose.UNDEFINED` to set it to undefined without taking into account the `default` setting, or `undefined` to set it to undefined while taking into account the `default` setting.
- Model `update` setting now includes more update actions. To use the v1 update behavior change the value of `update` setting to be `["ttl", "indexes"]`.
- Schema `default` value does not pass the model instance into `default` functions any more.
- `Model.update`
	- `$LISTAPPEND` has been removed, and `$ADD` now includes the behavior of `$LISTAPPEND`
	- `$DELETE` has been renamed to `$REMOVE`
	- `$REMOVE` (previously `$DELETE`) now maps to the correct underlying DynamoDB method instead of the previous behavior of mapping to `$REMOVE`
	- `$PUT` has been replaced with `$SET`
- `Model.getTableReq` has been renamed to `Model.table.create.request`
- `Model.table.create.request` (formerly `Model.getTableReq`) is now an async function
- `model.originalItem` has been renamed to `model.original` (or `Document.original`)
- `Document.original` formerly (`model.originalItem`) no longer returns the last item saved, but the item first retrieved from DynamoDB
- The following Schema settings have been moved to Model settings:
	 - `expires`
	 - `throughput`
- `expires.ttl` now accepts a number representing milliseconds as opposed to seconds
- `expires.defaultExpires` is no longer an option (most behavior from this option can be replicated by using the new `dynamoose.UNDEFINED` feature)
- `expires.returnExpiredItems` has been renamed to `expires.items.returnExpired`
- `Model.transaction.conditionCheck` has been renamed to `Model.transaction.condition`
- `Model.transaction.condition` now accepts a conditional instance instead of an object to specify the conditional you wish to run
- In the past the `saveUnknown` option for attribute names would handle all nested properties. Now you must use `*` to indicate one level of wildcard or `**` to indicate infinate levels of wildcard. So if you have an object property (`address`) and want to parse one level of values (no sub objects) you can use `address.*`, or `address.**` to all for infinate levels of values (including sub objects)
- In the past non-string type properties would be implicitly coerced into strings with a call to their `toString()` methods when saved as `String` type attributes. This will now throw a `TypeMismatch` error. Strings should be converted before saving.
- `useNativeBooleans` & `useDocumentTypes` have been removed from the Model settings
- `scan.count()` has been removed, and `scan.counts()` has been renamed to `scan.count()`.
- The attribute types `Array` & `Object` in Dynamoose v1 don't work without a `schema` option in v2
- `Scan.null` & `Query.null` have been removed. In most cases this can be replaced with `.not().exists()`.
- Expires TTL value is set to be a default value. In Dynamoose v1 there were cases where expires TTL wouldn't be set, in Dynamoose v2, the behavior of if the Expires TTL is set behaves the same as any default value
- Custom methods have changed behavior:
	- `schema.method` is now `model.methods.document`
	- `schema.statics` is now `model.methods`
	- Both `model.methods` & `model.methods` have two functions that you call to add & remove methods. `set` & `delete` methods exist on both objects that you can use to add your methods. This is compared to the old system of calling the function for `schema.method` or setting the object for `schema.statics`.

#### Features Removed to be Readded Later

- TypeScript Support (v2.1.0) (coming soon, see more information [here](https://github.com/dynamoose/dynamoose/issues/836))
- `Model.populate`
- Plugin Support

### Bug Fixes

- Fixed issue where objects would get stored as a string `[object Object]` instead of the actual object

### Documentation

- Documentation has been rewritten from the ground up to be more clear and provide more examples

### Other

- Dynamoose logo now included in `internal` folder
- More automated tests which leads to more stablity for Dynamoose (100% code coverage)
- More resources/documentation have been added regarding project structure
	- Code of Conduct (CODE_OF_CONDUCT.md)
	- Contributing Guidelines (CONTRIBUTING.md)
- Improvements to README
	- More badges about project state
	- More information relevant to repository (branch strategy, etc)

---

## [1.11.1](https://github.com/dynamoose/dynamoose/compare/v1.11.0...v1.11.1) (2019-09-05)


### Bug Fixes

* fixing model.transaction.conditioncheck ([cc04bee](https://github.com/dynamoose/dynamoose/commit/cc04bee)), closes [#539](https://github.com/dynamoose/dynamoose/issues/539)

# [1.11.0](https://github.com/dynamoose/dynamoose/compare/v1.10.0...v1.11.0) (2019-08-25)


### Bug Fixes

* **plugin:** solve problem with rejecting during batchput:called ([be01f8c](https://github.com/dynamoose/dynamoose/commit/be01f8c))
* **plugin:** solve problem with rejecting during update:called ([959ba8c](https://github.com/dynamoose/dynamoose/commit/959ba8c))


### Features

* **plugin:** add batchPut events ([501c689](https://github.com/dynamoose/dynamoose/commit/501c689))
* **plugin:** add update events ([78e8538](https://github.com/dynamoose/dynamoose/commit/78e8538))

# [1.10.0](https://github.com/dynamoose/dynamoose/compare/v1.9.0...v1.10.0) (2019-06-28)


### Features

* **scan:** add Scan.using() for scanning sparse secondary indexes ([cfb5614](https://github.com/dynamoose/dynamoose/commit/cfb5614))

# [1.9.0](https://github.com/dynamoose/dynamoose/compare/v1.8.5...v1.9.0) (2019-06-27)


### Features

* **schema:** change the way attributes are set by parseDynamo function ([b8d1737](https://github.com/dynamoose/dynamoose/commit/b8d1737))

## [1.8.5](https://github.com/dynamoose/dynamoose/compare/v1.8.4...v1.8.5) (2019-06-25)


### Bug Fixes

* **schema:** fixed circular reference with `JSON.stringify` in Schema ([3f614f0](https://github.com/dynamoose/dynamoose/commit/3f614f0))

## [1.8.4](https://github.com/dynamoose/dynamoose/compare/v1.8.3...v1.8.4) (2019-06-23)


### Bug Fixes

* change originalItem from being static ([44a5b6b](https://github.com/dynamoose/dynamoose/commit/44a5b6b))

## [1.8.3](https://github.com/dynamoose/dynamoose/compare/v1.8.2...v1.8.3) (2019-06-22)


### Bug Fixes

* **types:** add property to interface ([0c05751](https://github.com/dynamoose/dynamoose/commit/0c05751)), closes [#617](https://github.com/dynamoose/dynamoose/issues/617)

## [1.8.2](https://github.com/dynamoose/dynamoose/compare/v1.8.1...v1.8.2) (2019-06-22)


### Bug Fixes

* **dynamoose.ts.d:** Add/fix TypeScript types ([e7472a7](https://github.com/dynamoose/dynamoose/commit/e7472a7))

## [1.8.1](https://github.com/dynamoose/dynamoose/compare/v1.8.0...v1.8.1) (2019-06-22)


### Bug Fixes

* **types:** added streamOptions to ModelOption ([a85780a](https://github.com/dynamoose/dynamoose/commit/a85780a))

# [1.8.0](https://github.com/dynamoose/dynamoose/compare/v1.7.3...v1.8.0) (2019-06-11)


### Features

* **plugin:** item prop for model:put put:called ([5043cf3](https://github.com/dynamoose/dynamoose/commit/5043cf3))

## [1.7.3](https://github.com/dynamoose/dynamoose/compare/v1.7.2...v1.7.3) (2019-05-15)


### Bug Fixes

* **model:** allows string for array attribute in contains condition ([f68c13a](https://github.com/dynamoose/dynamoose/commit/f68c13a))

## [1.7.2](https://github.com/dynamoose/dynamoose/compare/v1.7.1...v1.7.2) (2019-03-18)


### Bug Fixes

* **types:** minor updates to typings ([63bb60d](https://github.com/dynamoose/dynamoose/commit/63bb60d)), closes [#599](https://github.com/dynamoose/dynamoose/issues/599) [#600](https://github.com/dynamoose/dynamoose/issues/600)

## [1.7.1](https://github.com/dynamoose/dynamoose/compare/v1.7.0...v1.7.1) (2019-03-18)


### Bug Fixes

* **naming:** remove extension from name ([ca346d0](https://github.com/dynamoose/dynamoose/commit/ca346d0))

# [1.7.0](https://github.com/dynamoose/dynamoose/compare/v1.6.5...v1.7.0) (2019-03-18)


### Features

* **ts:** adding ts testing, compiling and exports ([0d2ef68](https://github.com/dynamoose/dynamoose/commit/0d2ef68))
* **ts:** fix ci script to also lint typescript ([992c7ff](https://github.com/dynamoose/dynamoose/commit/992c7ff))
* **ts:** fixing spelling ([e087570](https://github.com/dynamoose/dynamoose/commit/e087570))

## [1.6.5](https://github.com/dynamoose/dynamoose/compare/v1.6.4...v1.6.5) (2019-03-03)


### Bug Fixes

* **comment:** fix comments in pr ([68d757b](https://github.com/dynamoose/dynamoose/commit/68d757b))
* **index:** fixing styling and content ([75ea512](https://github.com/dynamoose/dynamoose/commit/75ea512))

## [1.6.4](https://github.com/dynamoose/dynamoose/compare/v1.6.3...v1.6.4) (2019-02-19)


### Bug Fixes

* stop conditions being overwritten ([966d7bc](https://github.com/dynamoose/dynamoose/commit/966d7bc))
* **lint:** increase limit for Model test file ([907b8a6](https://github.com/dynamoose/dynamoose/commit/907b8a6))

## [1.6.3](https://github.com/dynamoose/dynamoose/compare/v1.6.2...v1.6.3) (2019-02-18)


### Bug Fixes

* **model:** fixing batchDelete syntax bug ([dfb448f](https://github.com/dynamoose/dynamoose/commit/dfb448f))
* **model:** fixing update and condition check syntax bug ([74623bf](https://github.com/dynamoose/dynamoose/commit/74623bf))

## [1.6.2](https://github.com/dynamoose/dynamoose/compare/v1.6.1...v1.6.2) (2019-02-13)


### Bug Fixes

* **saveunknown:** fixing saveunknown toDynamo for maps ([873a6ed](https://github.com/dynamoose/dynamoose/commit/873a6ed)), closes [#323](https://github.com/dynamoose/dynamoose/issues/323)

## Version 1.5.2

This is a minor bug fix for Plugins, and also adds some other improvements for plugins and other parts of the app.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Plugin shouldContinue Fix & Other Improvements](https://github.com/dynamoose/dynamoose/pull/564)** #564

---

## Version 1.5.1

This is a minor release with documentation and project improvements.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Documentation

- **[Add constructor for model schema types in TypeScript](https://github.com/dynamoose/dynamoose/pull/547)** #547
- **[Defined dynamoose transaction in dynamoose.d.ts](https://github.com/dynamoose/dynamoose/pull/540)** #540
- **[Documentation Improvements](https://github.com/dynamoose/dynamoose/pull/561)** #561

### Other

- **[ESLint](https://github.com/dynamoose/dynamoose/pull/557)** #557
- **[Project Improvements](https://github.com/dynamoose/dynamoose/pull/558)** #558
- **[Updating issue template with warning about not filling out fields](https://github.com/dynamoose/dynamoose/pull/538)** #538
- **[Updating Dependencies](https://github.com/dynamoose/dynamoose/pull/562)** #562
- **[Refactor transactions tests to use DynamoDB Local tests](https://github.com/dynamoose/dynamoose/pull/563)** #563

---

## Version 1.5.0

This release adds support for `list_append` when adding elements to a list using the `Model.update` method.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Adding support for list_append](https://github.com/dynamoose/dynamoose/pull/544)** #544

---

## Version 1.4.0

This version adds some more options to the model and schema options objects.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[errorUnknown](https://github.com/dynamoose/dynamoose/pull/531)** #531
- **[defaultReturnValues](https://github.com/dynamoose/dynamoose/pull/533)** #533

---

## Version 1.3.1

Just a simple bug fix release!

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- **[Make saveUnknown work recursively](https://github.com/dynamoose/dynamoose/pull/522)** #522
- **[Always use Array.isArray to check if array](https://github.com/dynamoose/dynamoose/pull/521)** #521
- **[Fix error logging for data/schema mismatch](https://github.com/dynamoose/dynamoose/pull/518)** #518
- **[Changing to not update timestamps when scaning or querying with filter](https://github.com/dynamoose/dynamoose/pull/510)** #510

### Documentation

- **[dynamoose.d.ts allow validate property on schema to return promise as well as raw boolean](https://github.com/dynamoose/dynamoose/pull/520)** #520
- **[update typescript typings to allow `ON_DEMAND` throughput in SchemaOptions](https://github.com/dynamoose/dynamoose/pull/530)** #530

### Other

- **[Add error when not missing hash key for Model.get](https://github.com/dynamoose/dynamoose/pull/524)** #524

---

## Version 1.3.0

Dynamoose Version 1.3.0 finishes implementation of some important features (DynamoDB transaction support, and pay per request billing mode), improves the overall stability of the project (reduces NPM package size, bug fixes, throwing more errors), along many more improvements.

Please comment or contact me if you have any questions about this release.

### General

- **[RAW DynamoDB Transaction Item Support](https://github.com/dynamoose/dynamoose/pull/486)** #486
- **[Model.transaction.conditionCheck](https://github.com/dynamoose/dynamoose/pull/485)** #485
- **[Async Schema Methods](https://github.com/dynamoose/dynamoose/pull/492)** #492
- **[Reducing Size of NPM Package](https://github.com/dynamoose/dynamoose/pull/484)** #484
- **[Raise error if list or map not provided](https://github.com/dynamoose/dynamoose/pull/443)** #443

### Bug Fixes

- **[Fix support for PAY_PER_REQUEST BillingMode when Model includes Global Secondary Indexes](https://github.com/dynamoose/dynamoose/pull/504)** #504
- **[Fixing problem where if primary key starts with underscore Model.create doesn’t work](https://github.com/dynamoose/dynamoose/pull/502)** #502

### Other

- **[Pin & Update Dependency Versions](https://github.com/dynamoose/dynamoose/pull/487)** #487
- **[Creating release notes template](https://github.com/dynamoose/dynamoose/pull/482)** #482
- **[Project Cleanup](https://github.com/dynamoose/dynamoose/pull/483)** #483

### Documentation

- **[Adding documentation for query.using method](https://github.com/dynamoose/dynamoose/pull/489)** #489
- **[Adding documentation for populating an array of items](https://github.com/dynamoose/dynamoose/pull/493)** #493
- **[Fixes a typo in Model.update documentation](https://github.com/dynamoose/dynamoose/pull/506)** #506

---

## Version 1.2.0

AWS reInvent 2018 has wrapped up, and this release includes support for all of the DynamoDB goodies announced. This version also includes beta support for plugins! Plugin support has the potential to have breaking changes in the future with no warning, so please be aware of that when using the system. Please give feedback on plugins by creating issues on the Dynamoose repository.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Major New Features

- **[DynamoDB Transaction Support](https://github.com/dynamoose/dynamoose/pull/472)** #472
- **[DynamoDB On-Demand Support](https://github.com/dynamoose/dynamoose/pull/471)** #471
- **[Plugins - BETA](https://github.com/dynamoose/dynamoose/pull/325)** #325

### General

- **[ES6 Template Literals](https://github.com/dynamoose/dynamoose/pull/465)** #465

### Bug Fixes

- **[Return LastKey when using RAW Scan](https://github.com/dynamoose/dynamoose/pull/475)** #475
- **[Sorting index project array before comparing](https://github.com/dynamoose/dynamoose/pull/455)** #455

### Other

- **[Adding Node.js version 11 to Travis CI test suite](https://github.com/dynamoose/dynamoose/pull/468)** #468
- **[Adding more NPM Keywords](https://github.com/dynamoose/dynamoose/pull/469)** #469
- **[Updating NPM Dependencies](https://github.com/dynamoose/dynamoose/pull/466)** #466 #473

---

## Version 1.1.0

Dynamoose version 1.1.0 has a few improvements for debugging Dynamoose as well as a few new features.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Update batchPut to work with timestamps](https://github.com/automategreen/dynamoose/pull/449)** #449
- **[Adding expires defaultExpires function](https://github.com/automategreen/dynamoose/pull/452)** #452
- **[Make debugging index creation dramatically easier](https://github.com/automategreen/dynamoose/pull/440)** #440
- **[Adding debug messages for setDDB and revertDDB](https://github.com/dynamoose/dynamoose/pull/451)** #451

---

## Version 1.0.1

Dynamoose version 1.0.1 comes with some minor bug fixes to solve problems with Dynamoose version 1.0.0. We are actively monitoring the [GitHub Issues](https://github.com/dynamoose/dynamoose/issues) and will continue to work to provide bug fixes as fast as possible. Please create a [GitHub Issue](https://github.com/dynamoose/dynamoose/issues) or [contact me](https://charlie.fish/contact) if you are having problems and we will work to address it as fast as possible.

### Bug Fixes

- **[Fix saveUnknown throwing errors when value where falsy](https://github.com/automategreen/dynamoose/pull/442)** #442

### Documentation

- **[Fix model update add documentation](https://github.com/automategreen/dynamoose/pull/438)** #438

---

## Version 1.0.0

Dynamoose version 1.0.0 is here. This is a **massive** release, and will also be the first official breaking update to Dynamoose. You can view the details about the release below.

This version officially removes support for Node.js versions below 8.0. Versions below 8.0 _might_ work, but we do not make guarantees. Even if Node.js versions below 8.0 work with Dynamoose 1.0+ we might add features that break support for older Node.js versions _without_ a SEMVER major version release.

The one major thing about the release notes below that is a bit confusing is the fact that `ES6/Future Changes` are in the `Breaking changes` section. That section is directly related to `Requiring Node.js version 8.0 and higher`. Therefor although the breaking change is technically the fact that Node.js versions less than 8.0 won't be supported, they are directly related, therefor they are both in the `Breaking changes` section. In future 1.x we might add more ES6/Future Changes, but those will not be considered breaking changes due to the fact that it will only break if you are running on a Node.js version less than version 8.0.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### 🚨 Breaking changes 🚨

- **[Requiring Node.js version 8.0 and higher](https://github.com/automategreen/dynamoose/pull/366)** #366
- **[Toggle useDocumentTypes and useNativeBooleans defaults to true](https://github.com/dynamoose/dynamoose/pull/376)** #376
- **[Query.all and Scan.all Delay Seconds to Milliseconds](https://github.com/automategreen/dynamoose/pull/287)** #287
- **[Fix data corruption when storing binary data](https://github.com/automategreen/dynamoose/pull/386)** #386

### Major New Features

- **[Adding updateTimestamps option to Model.save](https://github.com/automategreen/dynamoose/pull/317)** #317
- **[Feature/add enum attribute](https://github.com/automategreen/dynamoose/pull/274)** #274
- **[`model.originalItem() `](https://github.com/automategreen/dynamoose/pull/338)** #338

### General

- **[Adding support for saveUnknown being an array](https://github.com/automategreen/dynamoose/pull/333)** #333
- **[DynamoDB Document Client/DAX Support](https://github.com/automategreen/dynamoose/pull/330)** #330
- **[Adding better error handling for parsing invalid data from DynamoDB](https://github.com/automategreen/dynamoose/pull/331)** #331
- **[Adding support for SSESpecification](https://github.com/automategreen/dynamoose/pull/306)** #306
- **[Adding support for DynamoDB table streams](https://github.com/automategreen/dynamoose/pull/332)** #332
- **[`Model.getTableReq()`](https://github.com/automategreen/dynamoose/pull/308)** #308 #151
- **[Static methods are automatically bound with the context of their Model](https://github.com/automategreen/dynamoose/pull/361)** #361
- **[Recreate dynamo db instance on .local()](https://github.com/automategreen/dynamoose/pull/354)** #354
- **[added support for specifying the ReturnValues option in update](https://github.com/automategreen/dynamoose/pull/350)** #350
- **[Expose Model classes to Schema methods](https://github.com/automategreen/dynamoose/pull/400)** #400 #397
- **[Refactoring custom error code](https://github.com/automategreen/dynamoose/pull/414)** #414
- **[Saying which table is effected by Error](https://github.com/automategreen/dynamoose/pull/356)** #356
- **[Adding expires returnExpiredItems property](https://github.com/automategreen/dynamoose/pull/426)** #426
- **[DDB Functions](https://github.com/automategreen/dynamoose/pull/429)** #429
- **[Updates Expires attribute on Model Updates Option](https://github.com/automategreen/dynamoose/pull/420)** #420
- ES6/Future Changes
    - **[`let`/`const`](https://github.com/automategreen/dynamoose/pull/410)** #410
    - **[Removing Lodash](https://github.com/automategreen/dynamoose/pull/411)** #411
    - **[Removing self = this in favor of arrow functions](https://github.com/automategreen/dynamoose/pull/412)** #412

### Bug Fixes

- **[Fix saveUnknown throwing errors when value where falsy](https://github.com/automategreen/dynamoose/pull/336)** #336
- **[Fix scanByRawFilter containing - Select: 'COUNT'](https://github.com/automategreen/dynamoose/pull/341)** #341
- **[Fix loading document type attributes from DynamoDB when when saveUnknown=true](https://github.com/automategreen/dynamoose/pull/339)** #339
- **[Fix the ModelError type](https://github.com/automategreen/dynamoose/pull/374)** #374
- **[Fixes falsy key value for batch get](https://github.com/automategreen/dynamoose/pull/379)** #379
- **[Fix serverSideEncryption option](https://github.com/automategreen/dynamoose/pull/383)** #383
- **[Using Buffer.from instead of new Buffer](https://github.com/automategreen/dynamoose/pull/413)** #413
- **[Fixing issue with query with multiple indexes](https://github.com/automategreen/dynamoose/pull/344)** #344 #343
- **[Save unknown update](https://github.com/automategreen/dynamoose/pull/431)** #431 #403
- **[Fixing typo related to stream options](https://github.com/automategreen/dynamoose/pull/432)** #432 #430

### Documentation

- **[Improving Model.delete documentation](https://github.com/automategreen/dynamoose/pull/309)** #309
- **Updated TypeScript types** #358 #357
- **[Updating typescript documentation for create vs put overwrite default](https://github.com/automategreen/dynamoose/pull/377)** #377 #359
- **[GitHub issue and PR templates](https://github.com/automategreen/dynamoose/pull/394)** #394 #405
- **[Updating metadata](https://github.com/automategreen/dynamoose/pull/369)** #369
- **[Change QueryKey and ScanKey type to any](https://github.com/automategreen/dynamoose/pull/419)** #419

### Other

- **[General project work](https://github.com/automategreen/dynamoose/pull/409)** #409

---

## Version 0.8.7

Version 0.8.7 is here! Below is a list of the changes released in Version 0.8.7. Huge **THANK YOU** to everyone who submitted pull requests and issues in this release. As always keep the issues and pull requests coming, only makes this package better!!

### Major New Features

- **[Adding support for `Query.all()`](https://github.com/dynamoose/dynamoose/pull/223)** #223
  - **[Adding `Query.all()` to documentation](https://github.com/dynamoose/dynamoose/pull/285)** #285
  - **[Changing `Query.all()` timesScanned to timesQueried](https://github.com/dynamoose/dynamoose/pull/286)** #286
- **[Suffix Option](https://github.com/dynamoose/dynamoose/pull/321)** #321

### General

- **[Catch corrupted JSON error](https://github.com/dynamoose/dynamoose/pull/243)** #243 #242
- **[Pass model instance directly to schema::attributeFromDynamo](https://github.com/dynamoose/dynamoose/pull/257)** #257
- **[Fix range key on queries](https://github.com/dynamoose/dynamoose/pull/225)** #225
- **[Provide model when converting keys .toDynamo](https://github.com/dynamoose/dynamoose/pull/217)** #217
- **[Normalise Scan response shape when using "RawAWSFilter"](https://github.com/dynamoose/dynamoose/pull/320)** #320
- **[Remove JSON.stringify for model in Debug message](https://github.com/dynamoose/dynamoose/pull/277)** #277
- **[Set NewModel.name to include table name](https://github.com/dynamoose/dynamoose/pull/300)** #300
- **[Allow unknown types to be populated as native dynamo types](https://github.com/dynamoose/dynamoose/pull/240)** #240
- **[Competition of `.populate` method](https://github.com/dynamoose/dynamoose/pull/250)** #250


### Documentation

- **[Adding Model.queryOne to docs](https://github.com/dynamoose/dynamoose/pull/298)** #298
- **[Schema Get Function Clarification](https://github.com/dynamoose/dynamoose/pull/291)** #291
- **[Fixed Typo in README](https://github.com/dynamoose/dynamoose/pull/282)** #282
- **[Better Static method example (`getAll`)](https://github.com/dynamoose/dynamoose/pull/284)** #284
- **[Added Dynamoose Gitter chat badge to README](https://github.com/dynamoose/dynamoose/pull/247)** #247
- **[Improving README badges on retina displays](https://github.com/dynamoose/dynamoose/pull/229)** #229
- **[Moving ChangeLog and Roadmap to separate files](https://github.com/dynamoose/dynamoose/pull/305)** #305
- **[Moving Examples to Website](https://github.com/dynamoose/dynamoose/pull/304)** #304
- **[Adding AWS X-Ray Support documentation](https://github.com/dynamoose/dynamoose/pull/307)** #307 #144
- **[Throughput is only respected on table creation](https://github.com/dynamoose/dynamoose/pull/316)** #316 #311


### Testing

- **[More Query tests](https://github.com/dynamoose/dynamoose/pull/290)** #290
- **[Even more Query tests](https://github.com/dynamoose/dynamoose/pull/310)** #310
- **[Fixing issue where some scan tests weren't being run correctly](https://github.com/dynamoose/dynamoose/pull/289)** #289
- **[Switch to NYC (istanbul) for unit test coverage](https://github.com/dynamoose/dynamoose/pull/219)** #219
- **[Enable unit test code coverage reporting](https://github.com/dynamoose/dynamoose/pull/215)** #215
- **[Scan test to ensure all with delay and limit works correctly](https://github.com/dynamoose/dynamoose/pull/314)** #314


### TypeScript Improvements

- **[Nested Properties Schema Support](https://github.com/dynamoose/dynamoose/pull/258)** #258
- **[Option fields optional, and added overloaded create function](https://github.com/dynamoose/dynamoose/pull/245)** #245
- **[Improve the typing support for `.model()`](https://github.com/dynamoose/dynamoose/pull/234)** #234 #233
- **[Allow update partial data](https://github.com/dynamoose/dynamoose/pull/319)** #319
- **[Adds `ddb` interface](https://github.com/dynamoose/dynamoose/pull/280)** #280

---

## 0.8.0

- useNativeBooleans [#55](//github.com/dynamoose/dynamoose/issues/55)
- saveUnknown [#125](//github.com/dynamoose/dynamoose/issues/125)
- Support for multiple indexes defined on the hashkey attribute of the table
- scan.all() [#93](//github.com/dynamoose/dynamoose/issues/93) [#140](//github.com/dynamoose/dynamoose/issues/140)
- scan.parallel [d7f7f77](//github.com/dynamoose/dynamoose/commit/d7f7f77)
- TTL support [92994f1](//github.com/dynamoose/dynamoose/commit/92994f1)
- added schema parsing overrides [#145](//github.com/dynamoose/dynamoose/issues/145)
- populate [#137](//github.com/dynamoose/dynamoose/issues/137)
- Added consistent() to scan.  [#15](//github.com/dynamoose/dynamoose/issues/15) [#142](//github.com/dynamoose/dynamoose/issues/142)
- Default function enhancements [#127](//github.com/dynamoose/dynamoose/issues/127)
- Create required attributes on update [#96](//github.com/dynamoose/dynamoose/issues/96)
- Add typescript typings [#123](//github.com/dynamoose/dynamoose/issues/123)
- Added .count() for Query and Scan [#101](//github.com/dynamoose/dynamoose/issues/101)
- Nested scans [#141](//github.com/dynamoose/dynamoose/issues/141) [#158](//github.com/dynamoose/dynamoose/issues/158)
