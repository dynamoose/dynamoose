## What IAM permissions do I need to run Dynamoose?

The following is a chart of IAM permissions you need in order to run Dynamoose for given actions.

| Dynamoose Action | IAM Permission | Notes |
|------------------|----------------|-------|
| new Table() | `createTable`, `describeTable`, `updateTable`, `updateTimeToLive`, `describeTimeToLive`, `listTagsOfResource`, `tagResource`, `untagResource` | `createTable` is only used if `create` is set to true. `describeTable` is only used if `waitForActive` OR `create` is set to true. `updateTable` is only used if `update` is set to true. `updateTimeToLive` & `describeTimeToLive` is only used if `create` or `update` is set to true and there is an `expires` setting on the model. `listTagsOfResource`, `tagResource`, `untagResource` are only used if `update` is set to true or includes `tags` in the array of strings. |
| table.initialize | ^ | Same as `new Table()` |
| table.create | `createTable` | Only if `return` setting is not equal to `request`. |
| Model.get | `getItem` |  |
| Model.batchGet | `batchGetItem` |  |
| Model.scan | `scan` | This permission is only required on `scan.exec` |
| Model.query | `query` | This permission is only required on `query.exec` |
| Model.create | `putItem` |  |
| Model.batchPut | `batchWriteItem` |  |
| Model.update | `updateItem` |  |
| Model.delete | `deleteItem` |  |
| Model.batchDelete | `batchWriteItem` |  |
| item.save | `putItem` |  |
| item.delete | `deleteItem` |  |
| dynamoose.transaction | `transactGetItems`, `transactWriteItems` |  |

## Why is it recommended to set `create`, `update` & `waitForActive` model options to false for production environments?

Both the `create`, `update` & `waitForActive` model options add overhead to creating model instances. In your production environment it is assumed that you already have the tables setup prior to deploying your application, which makes the `create`, `update` & `waitForActive` options unnecessary.

## Why are arrays or objects empty when using Dynamoose?

Dynamoose requires strict conformance to your schema. If arrays or objects are empty, this is likely a case of not defining the sub-schema of that attribute. You should use the [`schema`](../guide/Schema#schema-object--array) property to define what the sub-schema of the array or object should be.

For example, if you have the following schema:

```js
{
	"id": String,
	"names": {
		"type": Array
	}
}
```

This can be converted to the following to tell Dynamoose what types of items should exist within the array.

```js
{
	"id": String,
	"names": {
		"type": Array,
		"schema": [String]
	}
}
```

Additionally, the same works for objects.

```js
{
	"id": String,
	"address": {
		"type": Object
	}
}
```

To:

```js
{
	"id": String,
	"address": {
		"type": Object,
		"schema": {
			"zip": String,
			"country": String
		}
	}
}
```

## What order does Dynamoose handle item actions in?

Below is a list of how Dynamoose processes item actions.

- `map`/`alias`/`aliases` mapping (toDynamo only)
- Type Checking
- Defaults
- Custom Types
- DynamoDB Type Handler (ex. converting sets to correct value)
- Combine
- `get`/`set` modifiers
- Schema level `get`/`set` modifiers
- Validation check
- Schema level validation check
- Required check
- Enum check
- `map`/`alias`/`aliases` mapping (fromDynamo only)

## Is Dynamoose's goal to be compatible with Mongoose?

No. Although Dynamoose was inspired by Mongoose, there are a lot of differences between the two database engines. We do not have the goal of a fully compatible API with Mongoose, although you will find a lot of similarities. Some areas of Dynamoose we will not attempt to take any inspiration from Mongoose, and design it in our own way.

## Can I use an undocumented property, class, method or function in Dynamoose?

Definitely not. Anything that is undocumented in Dynamoose can change at anytime without a breaking change version, and using anything that is undocumented can lead to unexpected behavior. If you notice something in the internal codebase that you would like to make publicly accessible to use in your own services, please create a PR or issue to add documentation to it, and it will be reviewed to ensure the functionality is able to remain stable.

## Where can I find information about using Dynamoose with TypeScript?

[Here](../getting_started/TypeScript).

## Where can I find documentation for v2?

[Here](https://v2.dynamoosejs.com).

## Where can I find documentation for v1?

[Here](https://v1.dynamoosejs.com).

## How do I migrate from v1 to v2?

See the [release notes for v2.0.0](https://github.com/dynamoose/dynamoose/releases/tag/v2.0.0) for a list of breaking changes.
