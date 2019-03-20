'use strict';

const dynamooseModule = require('../lib/Dynamoose');
const dynamoose = dynamooseModule.default;

dynamoose.AWS.config.update({
  'accessKeyId': 'AKID',
  'secretAccessKey': 'SECRET',
  'region': 'us-east-1'
});
dynamoose.local();


const should = require('should');


describe('General tests', function () {
  this.timeout(10000);

  it('dynamoose.setDocumentClient should be a function', () => {
    should.exist(dynamoose.setDocumentClient);
    (typeof dynamoose.setDocumentClient).should.eql('function');
  });

  it('dynamoose.setDocumentClient should set', () => {
    const client = dynamoose.dynamoDocumentClient;
    dynamoose.setDocumentClient('test');
    dynamoose.dynamoDocumentClient.should.eql('test');
    dynamoose.setDocumentClient(client);
  });

});
