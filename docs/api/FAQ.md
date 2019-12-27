# FAQ

## What IAM permissions do I need to run Dynamoose?

The following is a chart of IAM permissions you need in order to run Dynamoose for given actions.

| Dynamoose Action | IAM Permission | Notes |
|------------------|----------------|-------|
| new Model() | `createTable`, `describeTable` | `createTable` is only used if `create` is set to true. `describeTable` is only used if `waitForActive` is set to true. |
| Model.get | `getItem` |  |
| Model.scan | `scan` | This permission is only required on `scan.exec` |
| document.save | `putItem` |  |

## Why is it recommended to set `create` & `waitForActive` model options to false for production environments?

Both the `create` & `waitForActive` model options add overhead to creating model instances. In your production environment it is assumed that you already have the tables setup prior to deploying your application, which makes the `create` & `waitForActive` options unnecessary.
