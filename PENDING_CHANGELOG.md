This release ________

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### 🚨 Breaking Changes 🚨

- Upgraded to AWS-SDK v3
	- This leads to a MASSIVE reduction in the size of Dynamoose
	- Only users using the `dynamoose.aws` object will be impacted (if you are only using `dynamoose.aws.ddb.local`, there will be no breaking changes)
	- In depth changelog:
		- `dynamoose.aws.sdk` has been removed
		- `dynamoose.aws.ddb` now references a `@aws-sdk/client-dynamodb` `DynamoDB` instance instead of the previous `AWS.DynamoDB` instance
			- Please refer to the AWS-SDK v3 changelogs for more information about what this means for you
		- `dynamoose.aws.converter` now uses the methods from `@aws-sdk/util-dynamodb`
			- `input` has changed to `convertToAttr`
			- `output` has changed to `convertToNative`
			- For more information please refer to the AWS-SDK v3 changelogs
- Renamed `Document` to `Item`
	- The largest user facing API change is changing `{"return": "document"}` to `{"return": "item"}` and `{"return": "documents"}` to `{"return": "items"}`
- `dynamoose.logger` is now an async function instead of an object. For example, `dynamoose.logger.status()` is now `(await dynamoose.logger()).status()`
	- You must also now install the `dynamoose-logger` package in order to use `dynamoose.logger()`, otherwise an error will be thrown.
- Node.js >=v10 now required

### Major New Features

### General

### Bug Fixes

### Documentation

### Other

- Removed `source-map-support` dependency
- Source map files are no longer included in the package
	- You can generate source map files by cloning the reposistory, running `npm install`, then running `npm run build:sourcemap`. The generated source map files will be located in the `dist` folder.
