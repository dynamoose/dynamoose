'use strict';

const dynamoose = require('../');
dynamoose.AWS.config.update({
  'accessKeyId': 'AKID',
  'secretAccessKey': 'SECRET',
  'region': 'us-east-1'
});

const should = require('should');

describe('Local DB tests', () => {
  afterEach(() => {
    dynamoose.local();
  });

  it('Change to local dynamo db', () => {
    dynamoose.dynamoDB = undefined;
    let dynamoDB = dynamoose.ddb();
    should.equal(dynamoDB.endpoint.href, 'http://localhost:8000/');

    const expectURL = 'http://localhost:9000/';
    dynamoose.local(expectURL);
    dynamoDB = dynamoose.ddb();

    should.equal(dynamoDB.endpoint.href, expectURL);
  });
});
