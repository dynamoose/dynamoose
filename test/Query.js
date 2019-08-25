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


describe('Query', function () {
  this.timeout(10000);

  before((done) => {

    dynamoose.setDefaults({'prefix': '', 'suffix': ''});

    const dogSchema = new Schema({
      'ownerId': {
        'type': Number,
        'validate' (v) { return v > 0; },
        'hashKey': true,
        'index': [
          {
            'global': true,
            'rangeKey': 'color',
            'name': 'ColorRangeIndex',
            'project': true // ProjectionType: ALL
          }, {
            'global': true,
            'rangeKey': 'breed',
            'name': 'BreedRangeIndex',
            'project': true // ProjectionType: ALL
          }
        ]
      },
      'breed': {
        'type': String,
        'required': true,
        'index': {
          'global': true,
          'rangeKey': 'ownerId',
          'name': 'BreedIndex',
          'project': true, // ProjectionType: ALL
          'throughput': 5 // read and write are both 5
        }
      },
      'origin': {
        'type': String,
        'index': true // name: originLocalIndex, ProjectionType: ALL
      },
      'name': {
        'type': String,
        'rangeKey': true,
        'index': true // name: nameLocalIndex, ProjectionType: ALL
      },
      'color': {
        'type': String,
        'default': 'Brown',
        'index': [
          { // name: colorLocalIndex
            'project': ['name'] // ProjectionType: INCLUDE
          }, { // name: colorGlobalIndex, no ragne key
            'global': true,
            'project': ['name'] // ProjectionType: INCLUDE
          }
        ]
      },
      'siblings': {
        'type': 'list',
        'list': [
          {
            'type': String
          }
        ]
      },
      'age': {
        'type': Number
      }
    });

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
      {'ownerId': 1, 'name': 'Foxy Lady', 'breed': 'Jack Russell Terrier', 'color': 'White, Brown and Black', 'siblings': ['Quincy', 'Princes'], 'age': 2},
      {'ownerId': 2, 'name': 'Quincy', 'breed': 'Jack Russell Terrier', 'color': 'White and Brown', 'siblings': ['Foxy Lady', 'Princes'], 'age': 3},
      {'ownerId': 2, 'name': 'Princes', 'breed': 'Jack Russell Terrier', 'color': 'White and Brown', 'siblings': ['Foxy Lady', 'Quincy'], 'age': 6},
      {'ownerId': 3, 'name': 'Toto', 'breed': 'Terrier', 'color': 'Brown', 'age': 1},
      {'ownerId': 4, 'name': 'Oddie', 'breed': 'beagle', 'color': 'Tan', 'age': 2},
      {'ownerId': 5, 'name': 'Pluto', 'breed': 'unknown', 'color': 'Mustard', 'age': 4},
      {'ownerId': 6, 'name': 'Brian Griffin', 'breed': 'unknown', 'color': 'White', 'age': 5},
      {'ownerId': 7, 'name': 'Scooby Doo', 'breed': 'Great Dane', 'age': 2},
      {'ownerId': 8, 'name': 'Blue', 'breed': 'unknown', 'color': 'Blue', 'age': 1},
      {'ownerId': 9, 'name': 'Lady', 'breed': ' Cocker Spaniel', 'age': 6},
      {'ownerId': 10, 'name': 'Copper', 'breed': 'Hound', 'age': 8},
      {'ownerId': 11, 'name': 'Old Yeller', 'breed': 'unknown', 'color': 'Tan', 'age': 1},
      {'ownerId': 12, 'name': 'Hooch', 'breed': 'Dogue de Bordeaux', 'color': 'Brown', 'age': 3},
      {'ownerId': 13, 'name': 'Rin Tin Tin', 'breed': 'German Shepherd', 'age': 5},
      {'ownerId': 14, 'name': 'Benji', 'breed': 'unknown', 'age': 1},
      {'ownerId': 15, 'name': 'Wishbone', 'breed': 'Jack Russell Terrier', 'color': 'White', 'age': 2},
      {'ownerId': 16, 'name': 'Marley', 'breed': 'Labrador Retriever', 'color': 'Yellow', 'age': 9},
      {'ownerId': 17, 'name': 'Beethoven', 'breed': 'St. Bernard', 'age': 3},
      {'ownerId': 18, 'name': 'Lassie', 'breed': 'Collie', 'color': 'tan and white', 'age': 4},
      {'ownerId': 19, 'name': 'Snoopy', 'breed': 'beagle', 'color': 'black and white', 'age': 6},
      {'ownerId': 20, 'name': 'Max', 'breed': 'Westie', 'age': 7, 'origin': 'Scotland'},
      {'ownerId': 20, 'name': 'Gigi', 'breed': 'Spaniel', 'color': 'Chocolate', 'age': 1, 'origin': 'Great Britain'},
      {'ownerId': 20, 'name': 'Mimo', 'breed': 'Boxer', 'color': 'Chocolate', 'age': 2, 'origin': 'Germany'},
      {'ownerId': 20, 'name': 'Bepo', 'breed': 'French Bulldog', 'color': 'Grey', 'age': 4, 'origin': 'France'}
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

  it('Basic Query', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(2).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });


  it('Basic Query One', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.queryOne('ownerId').eq(1).exec((err, oneDog) => {
      should.not.exist(err);
      should.exist(oneDog);
      oneDog.ownerId.should.eql(1);
      done();
    });
  });

  it('Basic Query on Secondary Global Index', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });

  it('Query on Secondary Global Index with range - no results', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').where('ownerId').eq(4).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(0);
      done();
    });
  });

  it('Query on Secondary Global Index with range', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown').where('ownerId').lt(8).exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Query on Secondary Global Index with same hashKey', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).where('color').beginsWith('Choc').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      dogs[0].name.should.eql('Gigi');
      dogs[1].name.should.eql('Mimo');
      done();
    });
  });

  it('Query on Secondary Global Index with same hashKey and 2nd in index list', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').using('BreedRangeIndex').eq(20).where('breed').beginsWith('Sp').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(1);
      dogs[0].name.should.eql('Gigi');
      done();
    });
  });

  it('Query with Secondary Local Index as range', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).where('origin').beginsWith('G').exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('where() must follow eq()', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').where('test').exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: where() must follow eq()');
  });

  it('filter() must follow comparison', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').filter('test').exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: filter() must follow comparison');
  });

  it('eq must follow query()', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').lt(5).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: eq must follow query()');
  });

  it('Should throw first error', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').lt(5).where().filter().compVal().beginsWith().in().between().exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: eq must follow query()');
  });

  it('Basic Query on SGI descending', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').descending().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(15);
      done();
    });
  });

  it('Basic Query on SGI ascending', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').ascending().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });


  it('Basic Query on SGI limit 1', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').limit(1).exec((err, dogs) => {
      should.not.exist(err);
      should.exist(dogs.lastKey);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });

  it('Basic Query on SGI startAt key', (done) => {
    const Dog = dynamoose.model('Dog');

    const startKey = {'breed': {'S': 'Jack Russell Terrier'},
      'ownerId': {'N': '1'},
      'name': {'S': 'Foxy Lady'}};

    Dog.query('breed').eq('Jack Russell Terrier').startAt(startKey).limit(1).exec((err, dogs) => {
      should.not.exist(err);
      should.exist(dogs.lastKey);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(2);
      done();
    });
  });

  it('Basic Query on SGI with attributes', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').attributes(['name']).exec((err, dogs) => {
      should.not.exist(err);
      should.not.exist(dogs.lastKey);
      dogs.length.should.eql(4);
      dogs[0].should.not.have.property('ownerId');
      dogs[0].should.have.property('name', 'Foxy Lady');
      done();
    });
  });

  it('Basic Query with consistent read', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(2).consistent().exec((err, dogs) => {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Basic Query on SGI with filter contains', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
      .where('ownerId').eq(1)
      .filter('color').contains('Black').exec()
      .then((dogs) => {
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(1);
        done();
      })
      .catch(done);

  });

  it('Basic Query on SGI with filter contains on list', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
      .where('ownerId').eq(2)
      .filter('siblings').contains('Quincy').exec()
      .then((dogs) => {
      //  console.log('The dogs', dogs);
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(2);
        done();
      })
      .catch(done);

  });

  it('Basic Query on SGI with filter null', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .filter('color').not().null().exec()
      .then((dogs) => {
        dogs.length.should.eql(5);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not null', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .filter('color').null().exec()
      .then((dogs) => {
        dogs.length.should.eql(0);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter le', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').le(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(4);
        dogs[dogs.length - 1].ownerId.should.eql(11);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not le', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').not().le(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(14);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter ge', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').ge(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(2);
        dogs[0].ownerId.should.eql(11);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not ge', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').not().ge(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(3);
        dogs[0].ownerId.should.eql(5);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter gt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').gt(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(14);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not gt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').not().gt(11)
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(4);
        dogs[0].ownerId.should.eql(5);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not eq and not lt', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .where('ownerId').not().lt(10)
      .and()
      .filter('color').not().eq('Brown')
      .exec()
      .then((dogs) => {
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(11);
        done();
      })
      .catch(done);
  });

  it('Basic Query on SGI with filter not contains or beginsWith', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
      .filter('color').not().contains('Brown')
      .or()
      .filter('name').beginsWith('Q').exec()
      .then((dogs) => {
        dogs.length.should.eql(2);
        done();
      })
      .catch(done);

  });

  it('beginsWith() cannot follow not()', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').eq('Jack Russell Terrier').filter('color').not().contains('Brown').or().filter('name').not().beginsWith('Q').exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: beginsWith() cannot follow not()');
  });

  it('Basic Query on SGI with filter between', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
      .filter('age').between(5, 7)
      .exec((err, dogs) => {
        should.not.exist(err);
        dogs.length.should.eql(1);
        dogs[0].ownerId.should.eql(2);
        done();
      });
  });

  it('between() cannot follow not()', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').eq('Jack Russell Terrier').filter('age').not().between(5, 7).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: between() cannot follow not()');
  });

  it('Basic Query on SGI with filter in', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
      .filter('color').in(['White and Brown', 'White'])
      .exec((err, dogs) => {
        should.not.exist(err);
        dogs.length.should.eql(3);
        dogs[0].ownerId.should.eql(2);
        done();
      });
  });

  it('in() cannot follow not()', async () => {
    const Dog = dynamoose.model('Dog');

    let error;
    try {
      await Dog.query('breed').eq('Jack Russell Terrier').filter('color').not().in(['White and Brown', 'White']).exec();
    } catch (e) {
      error = e;
    }

    should.exist(error);
    should.exist(error.message);
    error.message.should.eql('Invalid Query state: in() cannot follow not()');
  });

  it('Query.count', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).count().all().exec()
      .then((count) => {
        count.should.eql(4);
        done();
      })
      .catch(done);
  });

  it('Query.counts', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
      .and()
      .filter('color').not().eq('Brown')
      .counts().all().exec()
      .then((counts) => {
        counts.scannedCount.should.eql(5);
        counts.count.should.eql(4);
        done();
      })
      .catch(done);
  });

  it('Query.all', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).limit(2).all().exec()
      .then((dogs) => {
        dogs.length.should.eql(4);
        done();
      })
      .catch(done);
  });

  it('Query.all(1, 3)', (done) => {
    const Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).limit(1).all(1000, 3).exec()
      .then((dogs) => {
        dogs.length.should.eql(3);
        dogs.timesQueried.should.eql(3);
        done();
      })
      .catch(done);
  });

  it('Should allow multiple indexes and query correctly', (done) => {
    const schema = new dynamoose.Schema({
      'id': {
        'type': String,
        'hashKey': true,
        'required': true
      },
      'orgId': {
        'type': String,
        'index': [
          {
            'global': true,
            'name': 'OrganizationCreateAtIndex',
            'rangeKey': 'createdAt',
            'throughput': 1
          }, {
            'global': true,
            'name': 'OrganizationExpectedArriveAtIndex',
            'rangeKey': 'expectedArriveAt',
            'throughput': 1
          }
        ],
        'required': true
      },
      'expectedArriveAt': Date
    }, {
      'throughput': 1,
      'timestamps': true
    });
    const Log = dynamoose.model('Log-1', schema);

    const log1 = new Log({'id': 'test1', 'orgId': 'org1', 'expectedArriveAt': Date.now()});
    log1.save(() => {
      Log.query('orgId').eq('org1')
        .where('expectedArriveAt').lt(new Date())
        .exec()
        .then((res) => {
          res.length.should.eql(1);
          Log.query('orgId').eq('org1')
            .where('createdAt').lt(new Date())
            .exec()
            .then((resB) => {
              resB.length.should.eql(1);
              done();
            })
            .catch((e) => {
              done(e);
            });
        })
        .catch((e) => {
          done(e);
        });
    });
  });

  it('Should allow multiple local indexes and query correctly', async () => {
    const schema = new dynamoose.Schema({
      'id': {
        'type': String,
        'hashKey': true
      },
      'orgId': {
        'type': String,
        'rangeKey': true
      },
      'updatedAt': {
        'type': Date,
        'index': {
          'global': false,
          'name': 'OrganizationUpdatedAtIndex'
        }
      },
      'expectedArriveAt': {
        'type': Date,
        'index': {
          'global': false,
          'name': 'OrganizationExpectedArriveAtIndex'
        }
      }
    }, {
      'throughput': 1,
      'timestamps': true
    });
    const Log = dynamoose.model('Log-2', schema);

    const log1 = new Log({'id': 'test1', 'orgId': 'org1', 'expectedArriveAt': Date.now()});
    const log2 = new Log({'id': 'test1', 'orgId': 'org2', 'expectedArriveAt': Date.now()});

    await log1.save();
    await log2.save();

    const res = await Log.query('id').eq('test1')
      .where('expectedArriveAt').lt(new Date())
      .exec();
    res.length.should.eql(2);

    const res2 = await Log.query('id').eq('test1')
      .where('updatedAt').le(log1.createdAt.getTime())
      .exec();
    res2.length.should.eql(1);
  });
});
