---
order: 2
---

## TTL

Below is a simple example of how to use DynamoDB TTL (time to live) with Dynamoose.

```js
'use strict';

// Requiring the Dynamoose NPM package
var dynamoose = require('dynamoose');

// Setting our table name prefix to "example-"
dynamoose.setDefaults({
  prefix: 'example-',
  suffix: ''
});

// Creating a new Dynamomoose model, with 3 attributes (id, name, and ttl), the name of our table is "example-Cat" (due to our prefix default set above, and our suffix being an empty string)
var Cat = dynamoose.model('Cat', {
  id: Number,
  name: String
}, {
  expires: {
    // ttl (time to live) will be set to 1 day (86,400 seconds), this value must always be in seconds
    ttl: 1 * 24 * 60 * 60,
    // This is the name of our attribute to be stored in DynamoDB
    attribute: 'ttl'
  }
});

// Creating a new instance of our "Cat" model
var garfield = new Cat({id: 1, name: 'Fluffy'});

// Saving our new cat to DynamoDB
garfield.save()
.then(function () {
  // Getting our cat from DynamoDB after it has completed saving
  return Cat.get(1);
})
.then(function (fluffy) {
  // After getting our cat from DynamoDB we print the object that we received from DynamoDB
  console.log(JSON.stringify(fluffy, null, ' '));
  /*
  {
   "id": 3,
   "name": "Fluffy",
   "ttl": "2017-05-28T01:35:01.000Z"
  }
  */
});
```