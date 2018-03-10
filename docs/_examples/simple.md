---
order: 1
---

## Simple Example

Below is a simple example of how to setup Dynamoose and get started quickly.

```js
'use strict';

// Requiring the Dynamoose NPM package
var dynamoose = require('dynamoose');

// To configure Dynamose you can either:
/*
Set environment variables

export AWS_ACCESS_KEY_ID="Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY="Your AWS Secret Access Key"
export AWS_REGION="us-east-1"
*/
// OR configure the AWS object
/*
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
*/
// OR use an AWS IAM role assigned to an AWS resource

// To use a local DynamoDB setup you can use the following line
// dynamoose.local(); // This will set the server to "http://localhost:8000" (default)
// dynamoose.local("http://localhost:1234") // This will set the server to "http://localhost:1234"


// This will create a Dynamoose model "Cat" (which is basically like a DynamoDB table), it will allow for 2 properties in the schema, `id` (number) and `name` (string)
var Cat = dynamoose.model('Cat', { id: Number, name: String });

// This will create a new instance of our "Cat" model, with the `id` as 666, and `name` as 'Garfield'
var garfield = new Cat({id: 666, name: 'Garfield'});

// This will save our new object to DynamoDB (remember this happens asynchronously, so you need to be sure to wait before trying to access the object)
garfield.save();

// This will preform an DynamoDB get on the "Cat" model/table get the object with the `id` = 666 and return a promise with the returned object.
Cat.get(666)
.then(function (badCat) {
  console.log('Never trust a smiling cat. - ' + badCat.name);
});
```