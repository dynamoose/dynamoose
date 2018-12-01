---
order: 1
---

## AWS Credentials

There are three ways to specify AWS credentials:

  - .aws/credentials
  - Environment Variables
  - AWS.config

## Dynamoose Object

```js
var dynamoose = require('dynamoose');
```

### dynamoose.model(name, schema, [options])

Compiles a new model or looks up an existing one. `options` is optional.

Default `options`:

```js
{
  create: true, // Create table in DB, if it does not exist,
  update: false, // Update remote indexes if they do not match local index structure
  waitForActive: true, // Wait for table to be created before trying to use it
  waitForActiveTimeout: 180000, // wait 3 minutes for table to activate
  streamOptions: { // sets table stream options
    enabled: false, // sets if stream is enabled on the table
    type: undefined // sets the stream type (NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES | KEYS_ONLY) (https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html#DDB-Type-StreamSpecification-StreamViewType)
  },
  serverSideEncryption: false // Set SSESpecification.Enabled (server-side encryption) to true or false (default: true)
}
```

Basic example:

```js
var Cat = dynamoose.model('Cat', { id: Number, name: String });
```

streamOptions: object (optional)

Indicates whether stream is enabled or disabled on the table and dictates which type of stream the table should have. This is passed into into the `StreamSpecification` option property when creating the table.


serverSideEncryption: boolean

Indicates whether server-side encryption is enabled (true) or disabled (false) on the table. This boolean will be passed into the `SSESpecification.Enabled` option property when creating the table. Currently (when feature was implemented) DynamoDB doesn't support updating a table to add or remove server-side encryption, therefore this option will only be respected on creation of table, if table already exists in DynamoDB when using Dynamoose this value will be ignored.

```js
var model = dynamoose.model('Cat', {...}, {
	streamOptions: {
      enabled: true,
      type: "NEW_AND_OLD_IMAGES"
    },
	serverSideEncryption: true
});
```

### dynamoose.local(url)

Configure dynamoose to use a DynamoDB local for testing.

`url` defaults to 'http://localhost:8000'

```js
dynamoose.local();
```

### dynamoose.ddb()

Configures and returns the AWS.DynamoDB object

### dynamoose.AWS

AWS object for dynamoose.  Used to configure AWS for dynamoose.

```js
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
```

### dynamoose.setDDB

Function to set the DynamoDB object that Dynamoose uses.

```js
var AWS = require('aws-sdk');
var dynamoDB = new AWS.dynamoDB();
dynamoose.setDDB(dynamoDB);
```

### dynamoose.revertDDB

Function to revert the DynamoDB object that Dynamoose uses to the default.

```js
dynamoose.revertDDB();
```

### dynamoose.setDefaults(options)

Sets the default to be used when creating a model. Can be modified on a per model by passing options to `.model()`.

Default `options`:

```js
{
  create: true // Create table in DB if it does not exist
  prefix: '', // Default prefix for all DynamoDB tables
  suffix: '' // Default suffix for all DynamoDB tables
}
```

It is recommended that `create` be disabled for production environments.

```js
dynamoose.setDefaults( { create: false });
```

### dynamoose.Schema

The dynamoose Schema class, used to create new schema definitions. For example:

```js
var appleSchema = new dynamoose.Schema({
  id: Number, 
  type: String
});
```

### dynamoose.Table

Table class

### AWS X-Ray Support

You can achieve Amazon Web Services X-Ray support using a configuration similar to the following.

```js
var AWSXRay = require('aws-xray-sdk');
var dynamoose = require('dynamoose');
dynamoose.AWS = AWSXRay.captureAWS(require('aws-sdk'));
```

### dynamoose.setDocumentClient(documentClient)

Sets the document client for DynamoDB. This can be used to integrate with Amazon Web Services DAX.

### dynamoose.transaction(items[, options][, cb])

Allows you to run DynamoDB transactions. Accepts an array as the `items` parameter. Every item in the `items` array must use the `Model.transaction` methods.

```js
dynamoose.transaction([
  User.transaction.update({id: "user1"}, {$ADD: {balance: -100}}),
  Charge.transaction.create({userid: "user1", product: "product1", amount: 100, status: "successful"}),
  Product.transaction.update({id: "product1"}, {$ADD: {inventory: -1}}),
  Credit.transaction.delete({id: "credit1"})
]).then(function (result) {
  console.log(result);
}).catch(function (err) {
  console.error(err);
});
```

`options` properties:

- `type` (string): The type of transaction Dynamoose will run. Can either be "get", or "write". By default if all of your items are of type "get", it will default to "get", otherwise, will default to "write".
