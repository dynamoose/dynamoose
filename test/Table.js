'use strict';


const dynamoose = require('../');
dynamoose.AWS.config.update({
  'accessKeyId': 'AKID',
  'secretAccessKey': 'SECRET',
  'region': 'us-east-1'
});

dynamoose.local();

const Schema = dynamoose.Schema;
const Table = dynamoose.Table;

const should = require('should');


describe('Table tests', function () {
  this.timeout(10000);

  const schema = new Schema({'id': Number, 'name': String, 'childern': [Number], 'address': {'street': String, 'city': String}});
  const globalIndexSchema = new Schema({
    'ownerId': {
      'type': Number,
      'validate' (v) {
        return v > 0;
      },
      'hashKey': true
    },
    'breed': {
      'type': String,
      'rangeKey': true,
      'index': {
        'global': true,
        'rangeKey': 'color',
        'name': 'BreedGlobalIndex',
        'project': true, // ProjectionType: ALL
        'throughput': 5 // read and write are both 5
      }
    },
    'name': {
      'type': String,
      'required': true,
      'index': {
        'global': true,
        'name': 'NameGlobalIndex',
        'project': true, // ProjectionType: ALL
        'throughput': 5 // read and write are both 5
      }
    },
    'color': {
      'type': String,
      'default': 'Brown'
    }
  });

  const table = new Table('person', schema, null, dynamoose);
  const globalIndexTable = new Table('dog', globalIndexSchema, null, dynamoose);

  it('Create simple table', (done) => {

    table.create((err) => {
      should.not.exist(err);
      done();
    });
  });

  it('Describe simple table', (done) => {

    table.describe((err, data) => {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });

  it('Delete simple table', (done) => {

    table.delete((err, data) => {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });

  it('Describe missing table', (done) => {
    const missing = new Table('missing', schema, null, dynamoose);


    missing.describe((err, data) => {
      should.exist(err);
      should.not.exist(data);
      err.code.should.eql('ResourceNotFoundException');
      done();
    });
  });

  it('Create table with global index with non indexed range key', (done) => {

    globalIndexTable.create((err) => {
      should.not.exist(err);
      done();
    });
  });

  it('Delete table with global index', (done) => {

    globalIndexTable.delete((err, data) => {
      should.not.exist(err);
      should.exist(data);
      done();
    });
  });

  it('create DMSong with limited projection', (done) => {
    const Song = dynamoose.model('DMSong', {
      'id': {
        'type': Number,
        'required': true,
        'hashKey': true
      },
      'band': {
        'type': String,
        'required': true,
        'trim': true
      },
      'album': {
        'type': String,
        'required': true,
        'trim': true,
        'index': {
          'global': true,
          'rangeKey': 'id',
          'name': 'albumIndex',
          'project': ['band', 'album'],
          'throughput': 5 // read and write are both 5
        }
      },
      'song': {
        'type': String,
        'required': true,
        'trim': true,
        'index': {
          'global': true,
          'rangeKey': 'id',
          'name': 'songIndex',
          'project': true, // ProjectionType: ALL
          'throughput': 5 // read and write are both 5
        }
      },
      'track': {
        'type': Number,
        'required': false
      }
    },
    {
      'create': true, 'update': true
    });
    const tom_sawyer = new Song({'id': 1, 'band': 'Rush', 'album': 'Moving Pictures', 'song': 'Tom Sawyer', 'track': 1});
    tom_sawyer.save();
    const params = {'TableName': 'DMSong'};
    setTimeout(() => {
      dynamoose.ddb().describeTable(params, (err, data) => {
        if (err) {
          done(err);
        } else {
          let found = false;
          for (const i in data.Table.GlobalSecondaryIndexes) {
            const gsi = data.Table.GlobalSecondaryIndexes[i];
            if (gsi.IndexName === 'albumIndex') {
              should.equal(gsi.Projection.ProjectionType, 'INCLUDE');
              found = true;
            }
          }
          should.equal(found, true);
          delete dynamoose.models.DMSong;
          done();
        }
      });
    }, 2000);
  });
  it('update DMSong with broader projection', (done) => {
    const Song = dynamoose.model('DMSong', {
      'id': {
        'type': Number,
        'required': true,
        'hashKey': true
      },
      'band': {
        'type': String,
        'required': true,
        'trim': true
      },
      'album': {
        'type': String,
        'required': true,
        'trim': true,
        'index': {
          'global': true,
          'rangeKey': 'id',
          'name': 'albumIndex',
          'project': true, // ProjectionType: ALL
          'throughput': 5 // read and write are both 5
        }
      },
      'song': {
        'type': String,
        'required': true,
        'trim': true,
        'index': {
          'global': true,
          'rangeKey': 'id',
          'name': 'songIndex',
          'project': true, // ProjectionType: ALL
          'throughput': 5 // read and write are both 5
        }
      },
      'track': {
        'type': Number,
        'required': false
      }
    },
    {
      'create': true,
      'update': true,
      'waitForActive': true
    });

    const red_barchetta = new Song({'id': 2, 'band': 'Rush', 'album': 'Moving Pictures', 'song': 'Red Barchetta', 'track': 2});
    red_barchetta.save();

    const params = {'TableName': 'DMSong'};
    setTimeout(() => {
      dynamoose.ddb().describeTable(params, (err, data) => {
        if (err) {
          done(err);
        } else {
          // console.log("---------------------REVISED TABLE");
          // console.log(JSON.stringify(data, null, 2));
          let found = false;
          for (const i in data.Table.GlobalSecondaryIndexes) {
            const gsi = data.Table.GlobalSecondaryIndexes[i];
            if (gsi.IndexName === 'albumIndex') {
              should.equal(gsi.Projection.ProjectionType, 'ALL');
              found = true;
            }
          }
          should.equal(found, true);
          done();
        }
      });
    }, 2000);
  });
});
