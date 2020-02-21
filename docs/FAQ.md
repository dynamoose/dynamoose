# FAQ

## What IAM permissions do I need to run Dynamoose?

The following is a chart of IAM permissions you need in order to run Dynamoose for given actions.

| Dynamoose Action | IAM Permission | Notes |
|------------------|----------------|-------|
| new Model() | `createTable`, `describeTable`, `updateTable` | `createTable` is only used if `create` is set to true. `describeTable` is only used if `waitForActive` OR `create` is set to true. `updateTable` is only used if `update` is set to true. |
| Model.get | `getItem` |  |
| Model.scan | `scan` | This permission is only required on `scan.exec` |
| Model.query | `query` | This permission is only required on `query.exec` |
| Model.create | `putItem` |  |
| Model.update | `updateItem` |  |
| Model.delete | `deleteItem` |  |
| document.save | `putItem` |  |
| document.delete | `deleteItem` |  |

## Why is it recommended to set `create` & `waitForActive` model options to false for production environments?

Both the `create` & `waitForActive` model options add overhead to creating model instances. In your production environment it is assumed that you already have the tables setup prior to deploying your application, which makes the `create` & `waitForActive` options unnecessary.

## Is Dynamoose's goal to be compatible with Mongoose?

No. Although Dynamoose was inspired by Mongoose, there are a lot of differences between the two database engines. We do not have the goal of a fully compatible API with Mongoose, although you will find a lot of similarities. Some areas of Dynamoose we will not attempt to take any inspiration from Mongoose, and design it in our own way.
