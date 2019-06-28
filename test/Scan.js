'use strict';

const dynamoose = require('../lib/');
dynamoose.AWS.config.update({
  'accessKeyId': 'AKID',
  'secretAccessKey': 'SECRET',
  'region': 'us-east-1'
});

dynamoose.local();

const {Schema} = dynamoose;
const should = require('should');


describe('Scan', function () {
  this.timeout(10000);

  before((done) => {

    dynamoose.setDefaults({'prefix': '', 'suffix': ''});

    const dogSchema = new Schema({
      'ownerId': {
        'type': Number,
        'validate' (v) { return v > 0; },
        'hashKey': true
      },
      'breed': {
        'type': String,
        'trim': true,
        'required': true,
        'index': {
          'global': true,
          'rangeKey': 'ownerId',
          'name': 'BreedIndex',
          'project': true, // ProjectionType: ALL
          'throughput': 5 // read and write are both 5
        }
      },
      'name': {
        'type': String,
        'rangeKey': true,
        'index': true // name: nameLocalIndex, ProjectionType: ALL
      },
      'color': {
        'lowercase': true,
        'type': [String],
        'default': ['Brown']
      },
      'cartoon': {
        'type': Boolean
      },
      'details': {
        'timeWakeUp': {
          'type': String
        },
        'timeSleep': {
          'type': String
        }
      }
    }, {'useDocumentTypes': true});
    const Dog = dynamoose.model('Dog', dogSchema);

    function addDogs (dogs) {
      if (dogs.length <= 0) {
        return done();
      }
      const dog = new Dog(dogs.pop());
      dog.save((err) => {
        if (err) {
          return done(err);
        }
        addDogs(dogs);
      });
    }

    addDogs([
      {'ownerId': 1, 'name': 'Foxy Lady', 'breed': 'Jack Russell Terrier ', 'color': ['White', 'Brown', 'Black']},
      {'ownerId': 2, 'name': 'Quincy', 'breed': 'Jack Russell Terrier', 'color': ['White', 'Brown']},
      {'ownerId': 2, 'name': 'Princes', 'breed': 'Jack Russell Terrier', 'color': ['White', 'Brown']},
      {'ownerId': 3, 'name': 'Toto', 'breed': 'Terrier', 'color': ['Brown']},
      {'ownerId': 4, 'name': 'Odie', 'breed': 'Beagle', 'color': ['Tan'], 'cartoon': true},
      {'ownerId': 5, 'name': 'Pluto', 'breed': 'unknown', 'color': ['Mustard'], 'cartoon': true},
      {'ownerId': 6, 'name': 'Brian Griffin', 'breed': 'unknown', 'color': ['White']},
      {'ownerId': 7, 'name': 'Scooby Doo', 'breed': 'Great Dane', 'cartoon': true},
      {'ownerId': 8, 'name': 'Blue', 'breed': 'unknown', 'color': ['Blue'], 'cartoon': true},
      {'ownerId': 9, 'name': 'Lady', 'breed': ' Cocker Spaniel', 'cartoon': true},
      {'ownerId': 10, 'name': 'Copper', 'breed': 'Hound', 'cartoon': true},
      {'ownerId': 11, 'name': 'Old Yeller', 'breed': 'unknown', 'color': ['Tan']},
      {'ownerId': 12, 'name': 'Hooch', 'breed': 'Dogue de Bordeaux', 'color': ['Brown']},
      {'ownerId': 13, 'name': 'Rin Tin Tin', 'breed': 'German Shepherd'},
      {'ownerId': 14, 'name': 'Benji', 'breed': 'unknown'},
      {'ownerId': 15, 'name': 'Wishbone', 'breed': 'Jack Russell Terrier', 'color': ['White'], 'details': {'timeWakeUp': '6am', 'timeSleep': '8pm'}},
      {'ownerId': 16, 'name': 'Marley', 'breed': 'Labrador Retriever', 'color': ['Yellow']},
      {'ownerId': 17, 'name': 'Beethoven', 'breed': 'St. Bernard'},
      {'ownerId': 18, 'name': 'Lassie', 'breed': 'Collie', 'color': ['tan', 'white']},
      {'ownerId': 19, 'name': 'Snoopy', 'breed': 'Beagle', 'color': ['black', 'white'], 'cartoon': true, 'details': {'timeWakeUp': '8am', 'timeSleep': '8pm'}}
    ]);
  });

  after((done) => {
    const Dog = dynamoose.model('Dog');
    Dog.$__.table.delete((err) => {
      if (err) {
        done(err);
      }
      delete dynamoose.models.Dog;
      done();
    });
  });

  it('Scan for all items without exec', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan for all items', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan on one attribute with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'eq': 'Jack Russell Terrier'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan on one attribute', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan on two attribute with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'eq': 'Jack Russell Terrier'}, 'color': {'contains': 'black'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan on two attribute', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq(' Jack Russell Terrier').and().where('color').contains('black').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan on two attribute and a not with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'eq': 'Jack Russell Terrier'}, 'color': {'not_contains': 'black'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan on two attribute and a not', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').and().where('color').not().contains('black').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan with eq with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'eq': 'Jack Russell Terrier'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with eq with filter object short version', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': 'Jack Russell Terrier'}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with eq', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').eq('Jack Russell Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with ne with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'ne': 'Jack Russell Terrier'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(16);
      done();
    });
  });

  it('Scan with not eq', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').not().eq('Jack Russell Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(16);
      done();
    });
  });

  it('Scan with null with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'cartoon': {'null': true}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with null', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').null().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with blank eq - same as null', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').eq('').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(13);
      done();
    });
  });

  it('Scan with not null with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'cartoon': {'null': false}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(7);
      done();
    });
  });

  it('Scan with not null', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('cartoon').not().null().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(7);
      done();
    });
  });

  it('Scan with lt with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {'lt': 2}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with lt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').lt(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ge with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {'ge': 2}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });

  it('Scan with not lt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().lt(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });

  it('Scan with gt with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {'gt': 2}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });

  it('Scan with gt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').gt(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });

  it('Scan with le with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {'le': 2}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });

  it('Scan with not gt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().gt(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });


  it('Scan with le', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').le(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(3);
      done();
    });
  });


  it('Scan with not le', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().le(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(17);
      done();
    });
  });


  it('Scan with ge', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').ge(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(19);
      done();
    });
  });


  it('Scan with not ge', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').not().ge(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with contains with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'contains': 'Terrier'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(5);
      done();
    });
  });

  it('Scan with contains', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').contains('Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(5);
      done();
    });
  });

  it('Scan with not contains with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'breed': {'not_contains': 'Terrier'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with not contains', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('breed').not().contains('Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with beginsWith with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'name': {'begins_with': 'B'}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with beginsWith', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('name').beginsWith('B').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with not beginsWith (error)', async () => {
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

  it('Scan with in with filter object', async () => {
    const Dog = dynamoose.model('Dog');

    let error, res;
    try {
      res = await Dog.scan({'breed': {'in': ['Beagle', 'Hound']}}).exec();
    } catch (e) {
      error = e;
    }

    should.not.exist(error);
    res.length.should.eql(3);
  });

  it('Scan with in', async () => {
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


  it('Scan with not in (error)', async () => {
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

  it('Scan with between with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'ownerId': {'between': [5, 8]}}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });

  it('Scan with between', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan('ownerId').between(5, 8).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      done();
    });
  });


  it('Scan with not between (error)', async () => {
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

  it('Scan with limit', async () => {
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

  it('Scan with startAt key', (done) => {
    const Dog = dynamoose.model('Dog');

    const key = {'ownerId': {'N': '15'}, 'name': {'S': 'Wishbone'}};

    Dog.scan().startAt(key).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(15);
      done();
    });
  });

  it('Scan with limit', async () => {
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

  it('Scan with ANDed filters (default)', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().filter('breed').eq('unknown').filter('name').eq('Benji').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ANDed filter with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'and': [{'breed': {'eq': 'unknown'}}, {'name': {'eq': 'Benji'}}]}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      done();
    });
  });

  it('Scan with ANDed filter with filter object (error)', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.scan({'and': [{'breed': {'eq': 'unknown'}}, {'breed': {'eq': 'Benji'}}]}).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid scan state; %s can only be used once');
  });

  it('Scan with ANDed filter', async () => {
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

  it('Scan with ORed filter with filter object', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan({'or': [{'breed': {'eq': 'unknown'}}, {'name': {'eq': 'Odie'}}]}, (err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(6);
      done();
    });
  });

  it('Scan with ORed filters', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().or().filter('breed').eq('unknown').filter('name').eq('Odie').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(6);
      done();
    });
  });

  it('Scan.consistent', (done) => {
    const Dog = dynamoose.model('Dog');
    Dog.scan('ownerId').eq(2).consistent().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Scan.all', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().all().limit(5).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });

  it('Scan.all(1,2)', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().all(1000, 2).limit(5).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(10);
      done();
    });
  });

  it('Scan using raw AWS filter', (done) => {
    const Dog = dynamoose.model('Dog');
    const filter = {
      'FilterExpression': 'details.timeWakeUp = :wakeUp',
      'ExpressionAttributeValues': {
        ':wakeUp': '8am'
      }
    };

    Dog.scan(filter, {'useRawAwsFilter': true}).exec()
      .then((dogs) => {
        dogs.length.should.eql(1);
        done();
      })
      .catch((err) => {
        should.not.exist(err);
        done();
      });
  });

  it('Scan using raw AWS filter should work with lastKey', (done) => {
    const Dog = dynamoose.model('Dog');
    const filter = {
      'FilterExpression': 'ownerId > :ownerIdB',
      'ExpressionAttributeValues': {
        ':ownerIdB': 1
      },
      'Limit': 2
    };

    Dog.scan(filter, {'useRawAwsFilter': true}).exec((err, dogs) => {
      should.not.exist(err);
      should.exist(dogs.lastKey);

      done();
    });
  });

  it('Scan using raw AWS filter and select count', (done) => {
    const Dog = dynamoose.model('Dog');
    const filter = {
      'FilterExpression': 'details.timeWakeUp = :wakeUp',
      'ExpressionAttributeValues': {
        ':wakeUp': '8am'
      },
      'Select': 'COUNT'
    };

    Dog.scan(filter, {'useRawAwsFilter': true}).exec()
      .then((counts) => {
        counts.count.should.eql(1);
        done();
      })
      .catch((err) => {
        should.not.exist(err);
        done();
      });
  });

  it('Raw AWS filter should return model instances', (done) => {
    const Dog = dynamoose.model('Dog');
    const filter = {
      'FilterExpression': 'details.timeWakeUp = :wakeUp',
      'ExpressionAttributeValues': {
        ':wakeUp': '8am'
      }
    };

    Dog.scan(filter, {'useRawAwsFilter': true}).exec()
      .then((dogs) => {
        dogs[0].should.be.instanceof(Dog);
        done();
      })
      .catch((err) => {
        should.not.exist(err);
        done();
      });
  });

  it('Scan parallel', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(20);
      done();
    });
  });


  it('Scan with startAt array - implied parallel', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).limit(2).exec()
      .then((dogs) => {
        dogs.length.should.eql(4);
        dogs.lastKey.length.should.eql(2);
        dogs.count.should.eql(4);
        dogs.scannedCount.should.eql(4);
        dogs.timesScanned.should.eql(2);
        return Dog.scan().startAt(dogs.lastKey).exec();
      })
      .then((more) => {
        more.length.should.eql(16);
        more.count.should.eql(16);
        more.scannedCount.should.eql(16);
        more.timesScanned.should.eql(2);
        done();
      })
      .catch(done);
  });

  it('Scan parallel all', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.scan().parallel(2).limit(2).all().exec()
      .then((dogs) => {
        dogs.length.should.eql(20);
        should.not.exist(dogs.lastKey);
        done();
      })
      .catch(done);
  });

  it('Should delay when working with all and limit', function (done) {
    this.timeout(15000);

    const startTime = Date.now();
    const Dog = dynamoose.model('Dog');
    Dog.scan().all(1000, 5).limit(1).exec((err, dogs) => {
      const endTime = Date.now();
      const timeDifference = endTime - startTime;
      dogs.length.should.eql(5);
      timeDifference.should.be.above(4000); // first request executes immediately so we take the (delay * (number of rounds (or requests) - 1)) in MS.
      done();
    });
  });


  it('Should not set timestamps', async function () {
    this.timeout(15000);

    const Lion = dynamoose.model('Lion1', {
      'id': {
        'type': String,
        'hashKey': true,
        'trim': true
      }
    }, {
      'timestamps': {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      }
    });

    for (let i = 0; i < 10; i += 1) {
      const record = {
        'id': `${i}`
      };

      await new Lion(record).save();
    }

    // scan all records
    const allRecords = await Lion.scan().all(0).exec();
    allRecords.length.should.eql(10);

    // filter by created_at
    const tenMinAgo = new Date().getTime() - 10 * 60 * 1000;
    const createdFilter = {
      'created_at': {'gt': tenMinAgo}
    };
    const createdFilterRecords = await Lion.scan(createdFilter).all(0).exec();
    createdFilterRecords.length.should.eql(10);

    // filter by updated_at
    const updatedFilter = {
      'updated_at': {'gt': tenMinAgo}
    };
    const updatedFilterRecords = await Lion.scan(updatedFilter).all(0).exec();
    updatedFilterRecords.length.should.eql(10);
  });

  it('Scan using sparse index', async () => {
    const Lion = dynamoose.model('Lion2', {
      'id': {
        'type': String,
        'hashKey': true,
        'trim': true
      },
      'indexId': {
        'type': String,
        'index': {
          'name': 'sparseIndex',
          'global': true
        }
      }
    });

    for (let i = 0; i < 10; i += 1) {
      const record = {'id': `${i}`};
      if (i % 3 === 0) {
        record.indexId = record.id;
      }

      await new Lion(record).save();
    }

    const allIndexRecords = await Lion.scan().using('sparseIndex').exec();
    allIndexRecords.length.should.eql(4);
  });
});
