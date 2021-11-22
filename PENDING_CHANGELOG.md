This release ________

Please comment or [contact me](https://charlie.fish/contact) if you have any questions about this release.

### 🚨 Breaking Changes 🚨

- Upgraded to AWS-SDK v3.
	- This leads to a MASSIVE reduction in the package size of Dynamoose.
	- Only users using the `dynamoose.aws` object will be impacted (if you are only using `dynamoose.aws.ddb.local`, there will be no breaking changes).
	- In depth changelog:
		- `dynamoose.aws.sdk` has been removed.
		- `dynamoose.aws.ddb` now references a `@aws-sdk/client-dynamodb` `DynamoDB` instance instead of the previous `AWS.DynamoDB` instance.
			- Please refer to the AWS-SDK v3 changelogs for more information about what this means for you.
		- `dynamoose.aws.converter` now uses the methods from `@aws-sdk/util-dynamodb`.
			- `input` has changed to `convertToAttr`.
			- `output` has changed to `convertToNative`.
			- For more information please refer to the AWS-SDK v3 changelogs.
- Added `dynamoose.Table` class. `dynamoose.model` now represents an entity or type of data (ex. User, Movie, Order), and `dynamoose.Table` represents a single DynamoDB table. The example below show how to convert your code to this new syntax.
```
// If you have the following code in v2:

const User = dynamoose.model("User", {"id": String});

// It will be converted to this in v3:

const User = dynamoose.model("User", {"id": String});
const DBTable = new dynamoose.Table("DBTable", [User]);
```
- Renamed `Document` to `Item`.
	- The largest user facing API change is changing `{"return": "document"}` to `{"return": "item"}` and `{"return": "documents"}` to `{"return": "items"}`.
- `set` Schema attribute settings are now used when retrieving items (ie. `get`, `query`, `update`, etc).
- Passing `{"return": "request"}` as a setting into the following methods are now preformed asynchronously:
	- `Model.get`
	- `Model.delete`
	- `Model.batchGet`
	- `Model.batchDelete`
- Default values are now only applied if the parent object exists. For example nested object properties with a default value will only be applied if the parent object exists. If this is not what you intended, consider adding a `default` value of an empty object (`{}`) or array (`[]`) to the parent attribute.
- `dynamoose.logger` is now an async function instead of an object. For example, `dynamoose.logger.status()` is now `(await dynamoose.logger()).status()`.
	- You must also now install the `dynamoose-logger` package in order to use `dynamoose.logger()`, otherwise an error will be thrown.
- Renaming `seperator` to `separator` in Combine type settings to fix typo.
- Renaming `miliseconds` to `milliseconds` in Date type settings to fix typo.
- Migrate properties to new `dynamoose.type` object.
	- `dynamoose.UNDEFINED` is now `dynamoose.type.UNDEFINED`.
	- `dynamoose.THIS` is now `dynamoose.type.THIS`.
	- `dynamoose.NULL` is now `dynamoose.type.NULL`.
- Stricter validation of Schema types. If you pass in an invalid schema attribute type, it will now throw an error upon initialization.
	- For example, `new dynamoose.Schema({"id": "random"})` will now throw an error.
- Node.js >=v10 now required.

### Major New Features

### General

- Added `dynamoose.type.ANY` type to allow for schema attributes to be any type. This also works for the `schema` setting on Schema properties.
- Added `table.create()` method to create a table manually.
- Added `table.name` property to be able to access table name.
- Added `table.hashKey` property to be able to access table's hash key.
- Added `table.rangeKey` property to be able to access table's range key.
- Added `model.name` property to be able to access model name.
- Added `dynamoose.type.CONSTANT` helper function to create a constant type.
- Added `dynamoose.type.COMBINE` helper function to create a combine type.

### Bug Fixes

### Documentation

- Dynamoose's website now respects your OS color theme preference instead of always defaulting to light mode.
- Migrated documentation from Vercel to [Cloudflare Pages](https://pages.cloudflare.com/) for PR & branch builds.

### Other

- Source map files are no longer included in the package.
	- You can generate source map files by cloning the repository, running `npm install`, then running `npm run build:sourcemap`. The generated source map files will be located in the `dist` folder.
- Made a lot of internal properties private.
	- This is not considered a breaking change since only documented properties, classes, methods, and functions are included in breaking changes. You should only be using documented properties, classes, methods, and functions in Dynamoose. Anything not documented is subject to change at anytime, and can lead to unexpected behavior. Read more at [this FAQ item](https://dynamoosejs.com/other/FAQ#can-i-use-an-undocumented-property-class-method-or-function-in-dynamoose).
- Moved `source-map-support` package into `devDependencies`.
