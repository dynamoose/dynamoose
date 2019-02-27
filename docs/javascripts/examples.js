document.addEventListener('DOMContentLoaded', () => {
    console.log('Docs loaded');

    var startersCard = document.getElementById('starters-card');
    var ttlCard = document.getElementById('ttl-card');

    var startersCode = `
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


    // This will create a Dynamoose model "Cat" (which is basically like a DynamoDB table), 
    // it will allow for 2 properties in the schema, "id" (number) and "name" (string)
    var Cat = dynamoose.model('Cat', { id: Number, name: String });

    // This will create a new instance of our "Cat" model, with the "id" as 666, and "name" as 'Garfield'
    var garfield = new Cat({id: 666, name: 'Garfield'});

    // This will save our new object to DynamoDB (remember this happens asynchronously, 
    // so you need to be sure to wait before trying to access the object)
    garfield.save();

    // This will preform an DynamoDB get on the "Cat" model/table get the object with the "id" = 666 and
    // return a promise with the returned object.
    Cat.get(666)
    .then(function (badCat) {
    console.log('Never trust a smiling cat. - ' + badCat.name);
    });
    `

    var ttlCode = `
    use strict';

    // Requiring the Dynamoose NPM package
    var dynamoose = require('dynamoose');
    
    // Setting our table name prefix to "example-"
    dynamoose.setDefaults({
      prefix: 'example-',
      suffix: ''
    });
    
    // Creating a new Dynamomoose model, with 3 attributes (id, name, and ttl), 
    // the name of our table is "example-Cat" (due to our prefix default set above, and our suffix being an empty string)
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
    `

    var codeBox = document.getElementById('code-box');

    startersCard.onclick = () => {
        console.log('Starters');
        codeBox.innerHTML = startersCode;
    };

    ttlCard.onclick = () => {
        console.log('TTL');
        codeBox.innerHTML = ttlCode;
    };
})