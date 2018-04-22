'use strict';

//var util = require('util');

var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();


var should = require('should');


describe('General tests', function (){
  this.timeout(10000);

  it('dynamoose.setDocumentClient should be a function', function () {
    should.exist(dynamoose.setDocumentClient);
	  (typeof dynamoose.setDocumentClient).should.eql('function');
  });

});
