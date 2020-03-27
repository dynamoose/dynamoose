# FAQ

## What IAM permissions do I need to run Dynamoose?

The following is a chart of IAM permissions you need in order to run Dynamoose for given actions.

| Dynamoose Action | IAM Permission | Notes |
|------------------|----------------|-------|
| new Model() | `createTable`, `describeTable`, `updateTable`, `updateTimeToLive`, `describeTimeToLive` | `createTable` is only used if `create` is set to true. `describeTable` is only used if `waitForActive` OR `create` is set to true. `updateTable` is only used if `update` is set to true. `updateTimeToLive` & `describeTimeToLive` is only used if `create` or `update` is set to true and there is an `expires` setting on the model. |
| Model.get | `getItem` |  |
| Model.scan | `scan` | This permission is only required on `scan.exec` |
| Model.query | `query` | This permission is only required on `query.exec` |
| Model.create | `putItem` |  |
| Model.update | `updateItem` |  |
| Model.delete | `deleteItem` |  |
| document.save | `putItem` |  |
| document.delete | `deleteItem` |  |
| dynamoose.transaction | `transactGetItems`, `transactWriteItems` |  |

## Why is it recommended to set `create` & `waitForActive` model options to false for production environments?

Both the `create` & `waitForActive` model options add overhead to creating model instances. In your production environment it is assumed that you already have the tables setup prior to deploying your application, which makes the `create` & `waitForActive` options unnecessary.

## Is Dynamoose's goal to be compatible with Mongoose?

No. Although Dynamoose was inspired by Mongoose, there are a lot of differences between the two database engines. We do not have the goal of a fully compatible API with Mongoose, although you will find a lot of similarities. Some areas of Dynamoose we will not attempt to take any inspiration from Mongoose, and design it in our own way.

## Can I use an undocumented property, class, method or function in Dynamoose?

Definitely not. Anything that is undocumented in Dynamoose can change at anytime without a breaking change version, and using anything that is undocumented can lead to unexpected behavior. If you notice something in the internal codebase that you would like to make publicly accessible to use in your own services, please create a PR or issue to add documentation to it, and it will be reviewed to ensure the functionality is able to remain stable.
