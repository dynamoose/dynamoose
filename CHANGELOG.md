# Dynamoose Changelog

# [1.8.0](https://github.com/dynamoosejs/dynamoose/compare/v1.7.3...v1.8.0) (2019-06-11)


### Features

* **plugin:** item prop for model:put put:called ([5043cf3](https://github.com/dynamoosejs/dynamoose/commit/5043cf3))

## [1.7.3](https://github.com/dynamoosejs/dynamoose/compare/v1.7.2...v1.7.3) (2019-05-15)


### Bug Fixes

* **model:** allows string for array attribute in contains condition ([f68c13a](https://github.com/dynamoosejs/dynamoose/commit/f68c13a))

## [1.7.2](https://github.com/dynamoosejs/dynamoose/compare/v1.7.1...v1.7.2) (2019-03-18)


### Bug Fixes

* **types:** minor updates to typings ([63bb60d](https://github.com/dynamoosejs/dynamoose/commit/63bb60d)), closes [#599](https://github.com/dynamoosejs/dynamoose/issues/599) [#600](https://github.com/dynamoosejs/dynamoose/issues/600)

## [1.7.1](https://github.com/dynamoosejs/dynamoose/compare/v1.7.0...v1.7.1) (2019-03-18)


### Bug Fixes

* **naming:** remove extension from name ([ca346d0](https://github.com/dynamoosejs/dynamoose/commit/ca346d0))

# [1.7.0](https://github.com/dynamoosejs/dynamoose/compare/v1.6.5...v1.7.0) (2019-03-18)


### Features

* **ts:** adding ts testing, compiling and exports ([0d2ef68](https://github.com/dynamoosejs/dynamoose/commit/0d2ef68))
* **ts:** fix ci script to also lint typescript ([992c7ff](https://github.com/dynamoosejs/dynamoose/commit/992c7ff))
* **ts:** fixing spelling ([e087570](https://github.com/dynamoosejs/dynamoose/commit/e087570))

## [1.6.5](https://github.com/dynamoosejs/dynamoose/compare/v1.6.4...v1.6.5) (2019-03-03)


### Bug Fixes

* **comment:** fix comments in pr ([68d757b](https://github.com/dynamoosejs/dynamoose/commit/68d757b))
* **index:** fixing styling and content ([75ea512](https://github.com/dynamoosejs/dynamoose/commit/75ea512))

## [1.6.4](https://github.com/dynamoosejs/dynamoose/compare/v1.6.3...v1.6.4) (2019-02-19)


### Bug Fixes

* stop conditions being overwritten ([966d7bc](https://github.com/dynamoosejs/dynamoose/commit/966d7bc))
* **lint:** increase limit for Model test file ([907b8a6](https://github.com/dynamoosejs/dynamoose/commit/907b8a6))

## [1.6.3](https://github.com/dynamoosejs/dynamoose/compare/v1.6.2...v1.6.3) (2019-02-18)


### Bug Fixes

* **model:** fixing batchDelete syntax bug ([dfb448f](https://github.com/dynamoosejs/dynamoose/commit/dfb448f))
* **model:** fixing update and condition check syntax bug ([74623bf](https://github.com/dynamoosejs/dynamoose/commit/74623bf))

## [1.6.2](https://github.com/dynamoosejs/dynamoose/compare/v1.6.1...v1.6.2) (2019-02-13)


### Bug Fixes

* **saveunknown:** fixing saveunknown toDynamo for maps ([873a6ed](https://github.com/dynamoosejs/dynamoose/commit/873a6ed)), closes [#323](https://github.com/dynamoosejs/dynamoose/issues/323)

## Version 1.5.2

This is a minor bug fix for Plugins, and also adds some other improvements for plugins and other parts of the app.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Plugin shouldContinue Fix & Other Improvements](https://github.com/dynamoosejs/dynamoose/pull/564)** #564

---

## Version 1.5.1

This is a minor release with documentation and project improvements.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Documentation

- **[Add constructor for model schema types in TypeScript](https://github.com/dynamoosejs/dynamoose/pull/547)** #547
- **[Defined dynamoose transaction in dynamoose.d.ts](https://github.com/dynamoosejs/dynamoose/pull/540)** #540
- **[Documentation Improvements](https://github.com/dynamoosejs/dynamoose/pull/561)** #561  

### Other

- **[ESLint](https://github.com/dynamoosejs/dynamoose/pull/557)** #557
- **[Project Improvements](https://github.com/dynamoosejs/dynamoose/pull/558)** #558
- **[Updating issue template with warning about not filling out fields](https://github.com/dynamoosejs/dynamoose/pull/538)** #538
- **[Updating Dependencies](https://github.com/dynamoosejs/dynamoose/pull/562)** #562
- **[Refactor transactions tests to use DynamoDB Local tests](https://github.com/dynamoosejs/dynamoose/pull/563)** #563

---

## Version 1.5.0

This release adds support for `list_append` when adding elements to a list using the `Model.update` method.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Adding support for list_append](https://github.com/dynamoosejs/dynamoose/pull/544)** #544

---

## Version 1.4.0

This version adds some more options to the model and schema options objects.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[errorUnknown](https://github.com/dynamoosejs/dynamoose/pull/531)** #531
- **[defaultReturnValues](https://github.com/dynamoosejs/dynamoose/pull/533)** #533

---

## Version 1.3.1

Just a simple bug fix release!

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Bug Fixes

- **[Make saveUnknown work recursively](https://github.com/dynamoosejs/dynamoose/pull/522)** #522
- **[Always use Array.isArray to check if array](https://github.com/dynamoosejs/dynamoose/pull/521)** #521
- **[Fix error logging for data/schema mismatch](https://github.com/dynamoosejs/dynamoose/pull/518)** #518
- **[Changing to not update timestamps when scaning or querying with filter](https://github.com/dynamoosejs/dynamoose/pull/510)** #510

### Documentation

- **[dynamoose.d.ts allow validate property on schema to return promise as well as raw boolean](https://github.com/dynamoosejs/dynamoose/pull/520)** #520
- **[update typescript typings to allow `ON_DEMAND` throughput in SchemaOptions](https://github.com/dynamoosejs/dynamoose/pull/530)** #530

### Other

- **[Add error when not missing hash key for Model.get](https://github.com/dynamoosejs/dynamoose/pull/524)** #524

---

## Version 1.3.0

Dynamoose Version 1.3.0 finishes implementation of some important features (DynamoDB transaction support, and pay per request billing mode), improves the overall stability of the project (reduces NPM package size, bug fixes, throwing more errors), along many more improvements.

Please comment or contact me if you have any questions about this release.

### General

- **[RAW DynamoDB Transaction Item Support](https://github.com/dynamoosejs/dynamoose/pull/486)** #486
- **[Model.transaction.conditionCheck](https://github.com/dynamoosejs/dynamoose/pull/485)** #485
- **[Async Schema Methods](https://github.com/dynamoosejs/dynamoose/pull/492)** #492
- **[Reducing Size of NPM Package](https://github.com/dynamoosejs/dynamoose/pull/484)** #484
- **[Raise error if list or map not provided](https://github.com/dynamoosejs/dynamoose/pull/443)** #443

### Bug Fixes

- **[Fix support for PAY_PER_REQUEST BillingMode when Model includes Global Secondary Indexes](https://github.com/dynamoosejs/dynamoose/pull/504)** #504
- **[Fixing problem where if primary key starts with underscore Model.create doesn’t work](https://github.com/dynamoosejs/dynamoose/pull/502)** #502

### Other

- **[Pin & Update Dependency Versions](https://github.com/dynamoosejs/dynamoose/pull/487)** #487
- **[Creating release notes template](https://github.com/dynamoosejs/dynamoose/pull/482)** #482
- **[Project Cleanup](https://github.com/dynamoosejs/dynamoose/pull/483)** #483

### Documentation

- **[Adding documentation for query.using method](https://github.com/dynamoosejs/dynamoose/pull/489)** #489
- **[Adding documentation for populating an array of items](https://github.com/dynamoosejs/dynamoose/pull/493)** #493
- **[Fixes a typo in Model.update documentation](https://github.com/dynamoosejs/dynamoose/pull/506)** #506

---

## Version 1.2.0

AWS reInvent 2018 has wrapped up, and this release includes support for all of the DynamoDB goodies announced. This version also includes beta support for plugins! Plugin support has the potential to have breaking changes in the future with no warning, so please be aware of that when using the system. Please give feedback on plugins by creating issues on the Dynamoose repository.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### Major New Features

- **[DynamoDB Transaction Support](https://github.com/dynamoosejs/dynamoose/pull/472)** #472
- **[DynamoDB On-Demand Support](https://github.com/dynamoosejs/dynamoose/pull/471)** #471
- **[Plugins - BETA](https://github.com/dynamoosejs/dynamoose/pull/325)** #325

### General

- **[ES6 Template Literals](https://github.com/dynamoosejs/dynamoose/pull/465)** #465

### Bug Fixes

- **[Return LastKey when using RAW Scan](https://github.com/dynamoosejs/dynamoose/pull/475)** #475
- **[Sorting index project array before comparing](https://github.com/dynamoosejs/dynamoose/pull/455)** #455

### Other

- **[Adding Node.js version 11 to Travis CI test suite](https://github.com/dynamoosejs/dynamoose/pull/468)** #468
- **[Adding more NPM Keywords](https://github.com/dynamoosejs/dynamoose/pull/469)** #469
- **[Updating NPM Dependencies](https://github.com/dynamoosejs/dynamoose/pull/466)** #466 #473

---

## Version 1.1.0

Dynamoose version 1.1.0 has a few improvements for debugging Dynamoose as well as a few new features.

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### General

- **[Update batchPut to work with timestamps](https://github.com/automategreen/dynamoose/pull/449)** #449
- **[Adding expires defaultExpires function](https://github.com/automategreen/dynamoose/pull/452)** #452
- **[Make debugging index creation dramatically easier](https://github.com/automategreen/dynamoose/pull/440)** #440
- **[Adding debug messages for setDDB and revertDDB](https://github.com/dynamoosejs/dynamoose/pull/451)** #451

---

## Version 1.0.1

Dynamoose version 1.0.1 comes with some minor bug fixes to solve problems with Dynamoose version 1.0.0. We are actively monitoring the [GitHub Issues](https://github.com/dynamoosejs/dynamoose/issues) and will continue to work to provide bug fixes as fast as possible. Please create a [GitHub Issue](https://github.com/dynamoosejs/dynamoose/issues) or [contact me](https://charlie.fish/contact) if you are having problems and we will work to address it as fast as possible.

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
- **[Toggle useDocumentTypes and useNativeBooleans defaults to true](https://github.com/dynamoosejs/dynamoose/pull/376)** #376
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

- **[Adding support for `Query.all()`](https://github.com/dynamoosejs/dynamoose/pull/223)** #223
  - **[Adding `Query.all()` to documentation](https://github.com/dynamoosejs/dynamoose/pull/285)** #285
  - **[Changing `Query.all()` timesScanned to timesQueried](https://github.com/dynamoosejs/dynamoose/pull/286)** #286  
- **[Suffix Option](https://github.com/dynamoosejs/dynamoose/pull/321)** #321

### General

- **[Catch corrupted JSON error](https://github.com/dynamoosejs/dynamoose/pull/243)** #243 #242  
- **[Pass model instance directly to schema::attributeFromDynamo](https://github.com/dynamoosejs/dynamoose/pull/257)** #257
- **[Fix range key on queries](https://github.com/dynamoosejs/dynamoose/pull/225)** #225  
- **[Provide model when converting keys .toDynamo](https://github.com/dynamoosejs/dynamoose/pull/217)** #217   
- **[Normalise Scan response shape when using "RawAWSFilter"](https://github.com/dynamoosejs/dynamoose/pull/320)** #320    
- **[Remove JSON.stringify for model in Debug message](https://github.com/dynamoosejs/dynamoose/pull/277)** #277     
- **[Set NewModel.name to include table name](https://github.com/dynamoosejs/dynamoose/pull/300)** #300     
- **[Allow unknown types to be populated as native dynamo types](https://github.com/dynamoosejs/dynamoose/pull/240)** #240  
- **[Competition of `.populate` method](https://github.com/dynamoosejs/dynamoose/pull/250)** #250  


### Documentation

- **[Adding Model.queryOne to docs](https://github.com/dynamoosejs/dynamoose/pull/298)** #298
- **[Schema Get Function Clarification](https://github.com/dynamoosejs/dynamoose/pull/291)** #291
- **[Fixed Typo in README](https://github.com/dynamoosejs/dynamoose/pull/282)** #282  
- **[Better Static method example (`getAll`)](https://github.com/dynamoosejs/dynamoose/pull/284)** #284   
- **[Added Dynamoose Gitter chat badge to README](https://github.com/dynamoosejs/dynamoose/pull/247)** #247    
- **[Improving README badges on retina displays](https://github.com/dynamoosejs/dynamoose/pull/229)** #229     
- **[Moving ChangeLog and Roadmap to separate files](https://github.com/dynamoosejs/dynamoose/pull/305)** #305
- **[Moving Examples to Website](https://github.com/dynamoosejs/dynamoose/pull/304)** #304
- **[Adding AWS X-Ray Support documentation](https://github.com/dynamoosejs/dynamoose/pull/307)** #307 #144
- **[Throughput is only respected on table creation](https://github.com/dynamoosejs/dynamoose/pull/316)** #316 #311


### Testing

- **[More Query tests](https://github.com/dynamoosejs/dynamoose/pull/290)** #290
- **[Even more Query tests](https://github.com/dynamoosejs/dynamoose/pull/310)** #310  
- **[Fixing issue where some scan tests weren't being run correctly](https://github.com/dynamoosejs/dynamoose/pull/289)** #289
- **[Switch to NYC (istanbul) for unit test coverage](https://github.com/dynamoosejs/dynamoose/pull/219)** #219  
- **[Enable unit test code coverage reporting](https://github.com/dynamoosejs/dynamoose/pull/215)** #215   
- **[Scan test to ensure all with delay and limit works correctly](https://github.com/dynamoosejs/dynamoose/pull/314)** #314    


### TypeScript Improvements

- **[Nested Properties Schema Support](https://github.com/dynamoosejs/dynamoose/pull/258)** #258
- **[Option fields optional, and added overloaded create function](https://github.com/dynamoosejs/dynamoose/pull/245)** #245
- **[Improve the typing support for `.model()`](https://github.com/dynamoosejs/dynamoose/pull/234)** #234 #233
- **[Allow update partial data](https://github.com/dynamoosejs/dynamoose/pull/319)** #319
- **[Adds `ddb` interface](https://github.com/dynamoosejs/dynamoose/pull/280)** #280

---

## 0.8.0

- useNativeBooleans [#55](//github.com/dynamoosejs/dynamoose/issues/55)
- saveUnknown [#125](//github.com/dynamoosejs/dynamoose/issues/125)
- Support for multiple indexes defined on the hashkey attribute of the table
- scan.all() [#93](//github.com/dynamoosejs/dynamoose/issues/93) [#140](//github.com/dynamoosejs/dynamoose/issues/140)
- scan.parallel [d7f7f77](//github.com/dynamoosejs/dynamoose/commit/d7f7f77)
- TTL support [92994f1](//github.com/dynamoosejs/dynamoose/commit/92994f1)
- added schema parsing overrides [#145](//github.com/dynamoosejs/dynamoose/issues/145)
- populate [#137](//github.com/dynamoosejs/dynamoose/issues/137)
- Added consistent() to scan.  [#15](//github.com/dynamoosejs/dynamoose/issues/15) [#142](//github.com/dynamoosejs/dynamoose/issues/142)
- Default function enhancements [#127](//github.com/dynamoosejs/dynamoose/issues/127)
- Create required attributes on update [#96](//github.com/dynamoosejs/dynamoose/issues/96)
- Add typescript typings [#123](//github.com/dynamoosejs/dynamoose/issues/123)
- Added .count() for Query and Scan [#101](//github.com/dynamoosejs/dynamoose/issues/101)
- Nested scans [#141](//github.com/dynamoosejs/dynamoose/issues/141) [#158](//github.com/dynamoosejs/dynamoose/issues/158)
