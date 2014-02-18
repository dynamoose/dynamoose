'use strict';

var dynamoose = require('../');

dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var Cat = dynamoose.model('Cat', { id: Number, name: String });

var badCat = new Cat({id: 666, name: 'Garfield'});

badCat.save(function (err) {
  if (err) { return console.log(err); }
  console.log('Never trust a smiling cat.');
});
