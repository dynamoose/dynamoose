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
  waitForActiveTimeout: 180000 // wait 3 minutes for table to activate
}
```

Basic example:

```js
var Cat = dynamoose.model('Cat', { id: Number, name: String });
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