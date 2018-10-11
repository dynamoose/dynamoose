'use strict';

var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

var should = require('should');

describe('Local DB tests', function () {
  afterEach(function() {
    dynamoose.local();
  });

  it('Change to local dynamo db', function () {
    dynamoose.dynamoDB = undefined;
    var dynamoDB = dynamoose.ddb();
    should.equal(dynamoDB.endpoint.href, 'http://localhost:8000/');

    var expectURL = 'http://localhost:9000/';
    dynamoose.local(expectURL);
    dynamoDB = dynamoose.ddb();

    should.equal(dynamoDB.endpoint.href, expectURL);
   });
});
