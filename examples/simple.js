'use strict';

var dynamoose = require('../');


/*
Assumes AWS setting are in environment variables

export AWS_ACCESS_KEY_ID="Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY="Your AWS Secret Access Key"
export AWS_REGION="us-east-1"

If not, they can be configured via the AWS object.

dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
*/

// dynamoose.local(); // Use a local DynamoDB


var Cat = dynamoose.model('Cat', { id: Number, name: String });

var garfield = new Cat({id: 666, name: 'Garfield'});

garfield.save();

Cat.get(666)
.then(function (badCat) {
  console.log('Never trust a smiling cat. - ' + badCat.name);
});
