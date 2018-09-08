'use strict';


var dynamoose = require('../');

dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1',
});
dynamoose.local();
var Schema = dynamoose.Schema;

var should = require('should');
var tableName = 'MicroDog';

describe('Inner Map handling', function (){
  before(function (done) {

    function hookupDynamoose() {
      dynamoose.setDefaults({ prefix: '', suffix: '' });

      var microDogSchema  = new Schema({
        ownerId: {
          type: Number,
          validate: function(v) { return v > 0; },
          hashKey: true,
        },
        birthData: {
          type: Object
        },
        breed: {
          type: String,
          required: true,
          index: {
            global: true,
            rangeKey: 'ownerId',
            name: 'BreedIndex',
            project: true, // ProjectionType: ALL
            throughput: 5 // read and write are both 5
          }
        },
        name: {
          type: String,
          rangeKey: true,
          index: true // name: nameLocalIndex, ProjectionType: ALL
        },
      });
      dynamoose.model(tableName, microDogSchema);
      done();
    }

    var microDog = {
      Item: {
        ownerId:{N:'1'},
        birthData: {M:
            {kennel:{S:"MyKennel"}, state:{S:"NC"}}
        },
        name: {'S':'Foxy Lady'},
        breed: {'S':'Jack Russell Terrier'},
      },
      ReturnConsumedCapacity: "TOTAL",
      TableName: 'MicroDog'
    };



    var ddb = dynamoose.ddb();
    /**
     * Simulates the creation/management of a table outside of dynamoose, e.g. from cloudformation script
     */
    var tableparams = {
      AttributeDefinitions: [
        {
          AttributeName: "ownerId",
          AttributeType: "N"
        },
        {
          AttributeName: "name",
          AttributeType: "S"
        }
      ],
      KeySchema: [
        {
          AttributeName: "ownerId",
          KeyType: "HASH"
        },
        {
          AttributeName: "name",
          KeyType: "RANGE"
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      TableName: tableName
    };



    ddb.createTable(tableparams, function(err){
      if(err) {
        console.log("Error", err);
        done(err);
      }
      ddb.putItem(microDog, function(err) {
        if (err) {
          console.log("Error", err);
          done(err);
        } else {
          hookupDynamoose();
        }
      });
    });
  });

  after(function(done) {
    var ddb = dynamoose.ddb();
    ddb.deleteTable({TableName: tableName}, function(err){
      if(err) {
        done(err);
      }
      done();
    });
  });

  it('Map Query', function (done) {
    // var MicroDog = dynamoose.model(tableName);
    //
    // // Will fail without patch.
    // MicroDog.query('ownerId').eq(1).exec(function (err, dogs) {
    //   should.not.exist(err);
    //   dogs.length.should.eql(1);
    //   done();
    // });
    done();
  });
  
});
