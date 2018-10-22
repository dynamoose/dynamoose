# Dynamoose ChangeLog

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
