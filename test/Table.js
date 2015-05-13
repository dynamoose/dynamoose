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
  this.timeout(5000);

  var schema = new Schema({ id: Number, name: String, childern: [Number], address: { street:String,city:String} });
  var globalIndexSchema = new Schema({
    ownerId: {
      type: Number,
      validate: function(v) { return v > 0; },
      hashKey: true
    },
    breed: {
      type: String,
      rangeKey: true,
      index: {
        global: true,
        rangeKey: 'color',
        name: 'BreedGlobalIndex',
        project: true, // ProjectionType: ALL
        throughput: 5 // read and write are both 5
      }
    },
    name: {
      type: String,
      required: true,
      index: {
        global: true,
        name: 'NameGlobalIndex',
        project: true, // ProjectionType: ALL
        throughput: 5 // read and write are both 5
      }
    },
    color: {
      type: String,
      default: 'Brown'
    }
  });

  var table = new Table('person', schema, null, dynamoose);
  var globalIndexTable = new Table('dog', globalIndexSchema, null, dynamoose);

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

  it('Create table with global index with non indexed range key', function (done) {

    globalIndexTable.create(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('Delete table with global index', function (done) {

    globalIndexTable.delete(function(err, data) {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });
});
