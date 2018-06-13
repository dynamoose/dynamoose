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
