# Dynamoose ChangeLog

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
