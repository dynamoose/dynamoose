'use strict';

var dynamoose = require('../');

dynamoose.setDefaults({
  prefix: 'example-'
});

var Cat = dynamoose.model('Cat', {
  id: Number,
  name: String
}, {
  expires: {
    ttl: 1 * 24 * 60 * 60,
    attribute: 'ttl'
  }
});

var garfield = new Cat({id: 1, name: 'Fluffy'});

garfield.save()
.then(function () {
  return Cat.get(1);
})
.then(function (fluffy) {
  console.log(JSON.stringify(fluffy, null, ' '));
  /*
  {
   "id": 3,
   "name": "Fluffy",
   "ttl": "2017-05-28T01:35:01.000Z"
  }
  */
});
