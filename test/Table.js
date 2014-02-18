'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
dynamoose.local();

var Schema = dynamoose.Schema;
var Table = dynamoose.Table;

var should = require('should');


describe('Table tests', function (){

  var schema = new Schema({ id: Number, name: String, childern: [Number] });

  var table = new Table('person', schema, null, dynamoose);

  it('Create simple table', function (done) {

    table.create(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('Describe simple table', function (done) {

    table.describe(function(err, data) {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });

  it('Delete simple table', function (done) {

    table.delete(function(err, data) {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });

  it('Describe missing table', function (done) {
    var missing = new Table('missing', schema, null, dynamoose);


    missing.describe(function(err, data) {
      should.exist(err);
      should.not.exist(data);
      err.code.should.eql('ResourceNotFoundException');
      done();
    });
  });

});