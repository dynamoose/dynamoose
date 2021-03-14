# Breaking Changes

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
- Node.js >=v10 now required
- Renamed `Document` to `Item`
	- The largest user facing API change here is changing `{"return": "document"}` to `{"return": "item"}` and `{"return": "documents"}` to `{"return": "items"}`
