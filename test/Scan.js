'use strict';

var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var Schema = dynamoose.Schema;

var should = require('should');


describe('Scan', function (){
  this.timeout(10000);

  before(function (done) {

    dynamoose.setDefaults({ prefix: '', suffix: '' });

    var dogSchema  = new Schema({
      ownerId: {
        type: Number,
        validate: function(v) { return v > 0; },
        hashKey: true
      },
      breed: {
        type: String,
        trim: true,
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
      color: {
        lowercase: true,
        type: [String],
        default: ['Brown']
      },
      cartoon: {
        type: Boolean
      },
      details: {
        timeWakeUp: {
          type: String
        },
        timeSleep: {
          type: String
        }
      }
    }, { useDocumentTypes: true });


    function addDogs (dogs) {
      if(dogs.length <= 0) {
        return done();
      }
      var dog = new Dog(dogs.pop());
      dog.save(function (err) {
        if (err) {
          return done(err);
        }
        addDogs(dogs);
      });
    }

    var Dog = dynamoose.model('Dog', dogSchema);

    addDogs([
      {ownerId:1, name: 'Foxy Lady', breed: 'Jack Russell Terrier ', color: ['White', 'Brown', 'Black']},
      {ownerId:2, name: 'Quincy', breed: 'Jack Russell Terrier', color: ['White', 'Brown']},
      {ownerId:2, name: 'Princes', breed: 'Jack Russell Terrier', color: ['White', 'Brown']},
      {ownerId:3, name: 'Toto', breed: 'Terrier', color: ['Brown']},
      {ownerId:4, name: 'Odie', breed: 'Beagle', color: ['Tan'], cartoon: true},
      {ownerId:5, name: 'Pluto', breed: 'unknown', color: ['Mustard'], cartoon: true},
      {ownerId:6, name: 'Brian Griffin', breed: 'unknown', color: ['White']},
      {ownerId:7, name: 'Scooby Doo', breed: 'Great Dane', cartoon: true},
      {ownerId:8, name: 'Blue', breed: 'unknown', color: ['Blue'], cartoon: true},
      {ownerId:9, name: 'Lady', breed: ' Cocker Spaniel', cartoon: true},
      {ownerId:10, name: 'Copper', breed: 'Hound', cartoon: true},
      {ownerId:11, name: 'Old Yeller', breed: 'unknown', color: ['Tan']},
      {ownerId:12, name: 'Hooch', breed: 'Dogue de Bordeaux', color: ['Brown']},
      {ownerId:13, name: 'Rin Tin Tin', breed: 'German Shepherd'},
      {ownerId:14, name: 'Benji', breed: 'unknown'},
      {ownerId:15, name: 'Wishbone', breed: 'Jack Russell Terrier', color: ['White'], details: { timeWakeUp: '6am', timeSleep: '8pm' }},
      {ownerId:16, name: 'Marley', breed: 'Labrador Retriever', color: ['Yellow']},
      {ownerId:17, name: 'Beethoven', breed: 'St. Bernard'},
      {ownerId:18, name: 'Lassie', breed: 'Collie', color: ['tan', 'white']},
      {ownerId:19, name: 'Snoopy', breed: 'Beagle', color: ['black', 'white'], cartoon: true, details: { timeWakeUp: '8am', timeSleep: '8pm' }}
    ]);
  });

  after(function (done) {
    var Dog = dynamoose.model('Dog');
    Dog.$__.table.delete(function (err) {
      if(err) {
        done(err);
      }
      delete dynamoose.models.Dog;
      done();
    });
  });

  it('Scan for all items without exec', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan for all items', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan on one attribute with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {eq: 'Jack Russell Terrier'}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan on one attribute', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan on two attribute with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {eq: 'Jack Russell Terrier'},'color':{contains:'black'}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan on two attribute', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq(' Jack Russell Terrier').and().where('color').contains('black').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan on two attribute and a not with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {eq: 'Jack Russell Terrier'},'color':{not_contains:'black'}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan on two attribute and a not', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').and().where('color').not().contains('black').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan with eq with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {eq: 'Jack Russell Terrier'}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with eq with filter object short version', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': 'Jack Russell Terrier'}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with eq', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with ne with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {ne: 'Jack Russell Terrier'}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(16);
      done();
    });
  });

  it('Scan with not eq', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').not().eq('Jack Russell Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(16);
      done();
    });
  });

  it('Scan with null with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'cartoon': {null: true}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with null', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').null().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with blank eq - same as null', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').eq('').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with not null with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'cartoon': {null: false}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(7);
      done();
    });
  });

  it('Scan with not null', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').not().null().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(7);
      done();
    });
  });

  it('Scan with lt with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {lt: 2}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with lt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').lt(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ge with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {ge: 2}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });

  it('Scan with not lt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().lt(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });

  it('Scan with gt with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {gt: 2}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });

  it('Scan with gt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').gt(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });

  it('Scan with le with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {le: 2}}, function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan with not gt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().gt(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });


  it('Scan with le', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').le(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });


  it('Scan with not le', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().le(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });


  it('Scan with ge', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').ge(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });


  it('Scan with not ge', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().ge(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with contains with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {contains: 'Terrier'}},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(5);
      done();
    });
  });

  it('Scan with contains', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').contains('Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(5);
      done();
    });
  });

  it('Scan with not contains with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {not_contains: 'Terrier'}},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with not contains', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('breed').not().contains('Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with beginsWith with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'name': {begins_with: 'B'}},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with beginsWith', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('name').beginsWith('B').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with not beginsWith (error)', async function () {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.scan('name').not().beginsWith('B').exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid scan state: beginsWith() cannot follow not()');
  });

  it('Scan with in with filter object', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan({'breed': {in: ['Beagle', 'Hound']}}).exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res.length.should.eql(3);
  });

  it('Scan with in', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan('breed').in(['Beagle', 'Hound']).exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res.length.should.eql(3);
  });


  it('Scan with not in (error)', async function () {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.scan('name').not().in(['Beagle', 'Hound']).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid scan state: in() cannot follow not()');
  });

  it('Scan with between with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {between: [5,8]}},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with between', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').between(5, 8).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });


  it('Scan with not between (error)', async function () {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.scan('ownerId').not().between(5, 8).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid scan state: between() cannot follow not()');
  });

  it('Scan with limit', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan().limit(5).exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res.length.should.eql(5);
  });

  it('Scan with startAt key', function (done) {
    var Dog = dynamoose.model('Dog');

    var key = { ownerId: { N: '15' }, name: { S: 'Wishbone' } };

    Dog.scan().startAt(key).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with limit', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan().attributes(['name', 'breed']).exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res[0].should.not.have.property('ownerId');
    res[0].should.not.have.property('color');
    res[0].should.have.property('name');
    res[0].should.have.property('breed');
  });

  it('Scan with ANDed filters (default)', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().filter('breed').eq('unknown').filter('name').eq('Benji').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ANDed filter with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({and:[{'breed': {eq: 'unknown'}},{'name':{eq:'Benji'}}]},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ANDed filter with filter object (error)', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan({and:[{'breed': {eq: 'unknown'}},{'breed':{eq:'Benji'}}]}).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid scan state; %s can only be used once');
  });

  it('Scan with ANDed filter', async function () {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan().and().filter('breed').eq('unknown').filter('name').eq('Benji').exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res.length.should.eql(1);
  });

  it('Scan with ORed filter with filter object', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan({or:[{'breed': {eq: 'unknown'}},{'name':{eq:'Odie'}}]},function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(6);
      done();
    });
  });

  it('Scan with ORed filters', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().or().filter('breed').eq('unknown').filter('name').eq('Odie').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(6);
      done();
    });
  });

  it('Scan.consistent', function (done) {
    var Dog = dynamoose.model('Dog');
    Dog.scan('ownerId').eq(2).consistent().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Scan.all', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().all().limit(5).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan.all(1,2)', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().all(1000,2).limit(5).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(10);
      done();
    });
  });

  it('Scan using raw AWS filter', function (done) {
    var Dog = dynamoose.model('Dog');
    var filter = {
      FilterExpression: 'details.timeWakeUp = :wakeUp',
      ExpressionAttributeValues: {
        ':wakeUp': '8am'
      }
    };

    Dog.scan(filter, { useRawAwsFilter: true }).exec()
      .then(function(dogs) {
        dogs.length.should.eql(1);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
  });

  it('Scan using raw AWS filter should work with lastKey', function (done) {
    var Dog = dynamoose.model('Dog');
    var filter = {
      FilterExpression: 'ownerId > :ownerIdB',
      ExpressionAttributeValues: {
        ':ownerIdB': 1
      },
      Limit: 2
    };

    Dog.scan(filter, { useRawAwsFilter: true }).exec(function (err, dogs) {
      should.not.exist(err);
      should.exist(dogs.lastKey);

      done();
    });
  });

  it('Scan using raw AWS filter and select count', function (done) {
    var Dog = dynamoose.model('Dog');
    var filter = {
      FilterExpression: 'details.timeWakeUp = :wakeUp',
      ExpressionAttributeValues: {
        ':wakeUp': '8am'
      },
      Select: 'COUNT'
    };

    Dog.scan(filter, { useRawAwsFilter: true }).exec()
      .then(function(counts) {
        counts.count.should.eql(1);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
  });

  it('Raw AWS filter should return model instances', function (done) {
    var Dog = dynamoose.model('Dog');
    var filter = {
      FilterExpression: 'details.timeWakeUp = :wakeUp',
      ExpressionAttributeValues: {
        ':wakeUp': '8am'
      }
    };

    Dog.scan(filter, { useRawAwsFilter: true }).exec()
      .then(function(dogs) {
        dogs[0].should.be.instanceof(Dog);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
  });

  it('Scan parallel', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });


  it('Scan with startAt array - implied parallel', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).limit(2).exec()
      .then(function (dogs) {
        dogs.length.should.eql(4);
        dogs.lastKey.length.should.eql(2);
        dogs.count.should.eql(4);
        dogs.scannedCount.should.eql(4);
        dogs.timesScanned.should.eql(2);
        return Dog.scan().startAt(dogs.lastKey).exec();
      })
      .then(function (more) {
        more.length.should.eql(16);
        more.count.should.eql(16);
        more.scannedCount.should.eql(16);
        more.timesScanned.should.eql(2);
        done();
      })
      .catch(done);
  });

  it('Scan parallel all', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).limit(2).all().exec()
      .then(function (dogs) {
        dogs.length.should.eql(20);
        should.not.exist(dogs.lastKey);
        done();
      })
      .catch(done);
  });

  it('Should delay when working with all and limit', function (done) {
    this.timeout(15000);

    var startTime = Date.now();
    var Dog = dynamoose.model('Dog');
    Dog.scan().all(1000, 5).limit(1).exec(function(err, dogs) {
      var endTime = Date.now();
      var timeDifference = endTime - startTime;
      dogs.length.should.eql(5);
      timeDifference.should.be.above(4000); // first request executes immediately so we take the (delay * (number of rounds (or requests) - 1)) in MS.
      done();
    });
  });


  it('Should not set timestamps', async function () {
    this.timeout(15000);

    const Lion = dynamoose.model('Lion1', {
      id: {
        type: String,
        hashKey: true,
        trim: true,
      },
    }, {
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });

    for (let i = 0; i < 10; i++) {
      const record = {
        id: `${i}`,
      };

      await new Lion(record).save();
    }

    // scan all records
    const allRecords = await Lion.scan().all(0).exec();
    allRecords.length.should.eql(10);

    // filter by created_at
    const tenMinAgo = new Date().getTime() - 10 * 60 * 1000;
    const createdFilter = {
      created_at: { gt: tenMinAgo },
    };
    const createdFilterRecords = await Lion.scan(createdFilter).all(0).exec();
    createdFilterRecords.length.should.eql(10);

    // filter by updated_at
    const updatedFilter = {
      updated_at: { gt: tenMinAgo },
    };
    const updatedFilterRecords = await Lion.scan(updatedFilter).all(0).exec();
    updatedFilterRecords.length.should.eql(10);
  });
});
