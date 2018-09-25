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


describe('Query', function (){
  this.timeout(10000);

  before(function (done) {

    dynamoose.setDefaults({ prefix: '', suffix: '' });

    var dogSchema  = new Schema({
      ownerId: {
        type: Number,
        validate: function(v) { return v > 0; },
        hashKey: true,
        index: [{
          global: true,
          rangeKey: 'color',
          name: 'ColorRangeIndex',
          project: true, // ProjectionType: ALL
        },{
          global: true,
          rangeKey: 'breed',
          name: 'BreedRangeIndex',
          project: true, // ProjectionType: ALL
        }]
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
      color: {
        type: String,
        default: 'Brown',
        index: [{ // name: colorLocalIndex
          project: ['name'] // ProjectionType: INCLUDE
        },{ // name: colorGlobalIndex, no ragne key
          global: true,
          project: ['name'] // ProjectionType: INCLUDE
        }]
      },
      siblings: {
        type: 'list',
        list: [ {
          type: String
        } ]
      },
      age: {
        type: Number
      }
    });

    var Dog = dynamoose.model('Dog', dogSchema);

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

    addDogs([
      {ownerId:1, name: 'Foxy Lady', breed: 'Jack Russell Terrier', color: 'White, Brown and Black', siblings: ['Quincy', 'Princes'], age: 2},
      {ownerId:2, name: 'Quincy', breed: 'Jack Russell Terrier', color: 'White and Brown', siblings: ['Foxy Lady', 'Princes'], age: 3},
      {ownerId:2, name: 'Princes', breed: 'Jack Russell Terrier', color: 'White and Brown', siblings: ['Foxy Lady', 'Quincy'], age: 6},
      {ownerId:3, name: 'Toto', breed: 'Terrier', color: 'Brown', age: 1},
      {ownerId:4, name: 'Oddie', breed: 'beagle', color: 'Tan', age: 2},
      {ownerId:5, name: 'Pluto', breed: 'unknown', color: 'Mustard', age: 4},
      {ownerId:6, name: 'Brian Griffin', breed: 'unknown', color: 'White', age: 5},
      {ownerId:7, name: 'Scooby Doo', breed: 'Great Dane', age: 2},
      {ownerId:8, name: 'Blue', breed: 'unknown', color: 'Blue', age: 1},
      {ownerId:9, name: 'Lady', breed: ' Cocker Spaniel', age: 6},
      {ownerId:10, name: 'Copper', breed: 'Hound', age: 8},
      {ownerId:11, name: 'Old Yeller', breed: 'unknown', color: 'Tan', age: 1},
      {ownerId:12, name: 'Hooch', breed: 'Dogue de Bordeaux', color: 'Brown', age: 3},
      {ownerId:13, name: 'Rin Tin Tin', breed: 'German Shepherd', age: 5},
      {ownerId:14, name: 'Benji', breed: 'unknown', age: 1},
      {ownerId:15, name: 'Wishbone', breed: 'Jack Russell Terrier', color: 'White', age: 2},
      {ownerId:16, name: 'Marley', breed: 'Labrador Retriever', color: 'Yellow', age: 9},
      {ownerId:17, name: 'Beethoven', breed: 'St. Bernard', age: 3},
      {ownerId:18, name: 'Lassie', breed: 'Collie', color: 'tan and white', age: 4},
      {ownerId:19, name: 'Snoopy', breed: 'beagle', color: 'black and white', age: 6},
      {ownerId:20, name: 'Max', breed: 'Westie', age: 7},
      {ownerId:20, name: 'Gigi', breed: 'Spaniel', color: 'Chocolate', age: 1},
      {ownerId:20, name: 'Mimo', breed: 'Boxer', color: 'Chocolate', age: 2},
      {ownerId:20, name: 'Bepo', breed: 'French Bulldog', color: 'Grey', age: 4},
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

  it('Basic Query', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(2).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });


  it('Basic Query One', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.queryOne('ownerId').eq(1).exec(function (err, oneDog) {
      should.not.exist(err);
      should.exist(oneDog);
      oneDog.ownerId.should.eql(1);
      done();
    });
  });

  it('Basic Query on Secondary Global Index', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });

  it('Query on Secondary Global Index with range - no results', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').where('ownerId').eq(4).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(0);
      done();
    });
  });

  it('Query on Secondary Global Index with range', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown').where('ownerId').lt(8).exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Query on Secondary Global Index with same hashKey', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).where('color').beginsWith('Choc').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      dogs[0].name.should.eql('Gigi');
      dogs[1].name.should.eql('Mimo');
      done();
    });
  });

  it('Query on Secondary Global Index with same hashKey and 2nd in index list', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').using('BreedRangeIndex').eq(20).where('breed').beginsWith('Sp').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      dogs[0].name.should.eql('Gigi');
      done();
    });
  });

  it('Query with Local Global Index as range', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(2).where('color').beginsWith('White').exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('where() must follow eq()', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').where("test")
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: where() must follow eq()');
      done();
    });
  });

  it('filter() must follow comparison', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').filter("test")
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: filter() must follow comparison');
      done();
    });
  });

  it('eq must follow query()', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').lt(5)
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: eq must follow query()');
      done();
    });
  });

  it('Should throw first error', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').lt(5)
    .where().filter().compVal().beginsWith().in().between()
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: eq must follow query()');
      done();
    });
  });

  it('Basic Query on SGI descending', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').descending().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(15);
      done();
    });
  });

  it('Basic Query on SGI ascending', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').ascending().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });


  it('Basic Query on SGI limit 1', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').limit(1).exec(function (err, dogs) {
      should.not.exist(err);
      should.exist(dogs.lastKey);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(1);
      done();
    });
  });

  it('Basic Query on SGI startAt key', function (done) {
    var Dog = dynamoose.model('Dog');

    var startKey = { breed: { S: 'Jack Russell Terrier' },
    ownerId: { N: '1' },
    name: { S: 'Foxy Lady' } };

    Dog.query('breed').eq('Jack Russell Terrier').startAt(startKey).limit(1).exec(function (err, dogs) {
      should.not.exist(err);
      should.exist(dogs.lastKey);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(2);
      done();
    });
  });

  it('Basic Query on SGI with attributes', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier').attributes(['name']).exec(function (err, dogs) {
      should.not.exist(err);
      should.not.exist(dogs.lastKey);
      dogs.length.should.eql(4);
      dogs[0].should.not.have.property('ownerId');
      dogs[0].should.have.property('name', 'Foxy Lady');
      done();
    });
  });

  it('Basic Query with consistent read', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(2).consistent().exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(2);
      done();
    });
  });

  it('Basic Query on SGI with filter contains', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .where('ownerId').eq(1)
    .filter('color').contains('Black').exec()
    .then(function (dogs) {
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(1);
      done();
    })
    .catch(done);

  });

  it('Basic Query on SGI with filter contains on list', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .where('ownerId').eq(2)
    .filter('siblings').contains('Quincy').exec()
    .then(function (dogs) {
      //  console.log('The dogs', dogs);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(2);
      done();
    })
    .catch(done);

  });

  it('Basic Query on SGI with filter null', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .filter('color').not().null().exec()
    .then(function (dogs) {
      dogs.length.should.eql(5);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not null', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .filter('color').null().exec()
    .then(function (dogs) {
      dogs.length.should.eql(0);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter le', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').le(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(4);
      dogs[dogs.length - 1].ownerId.should.eql(11);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not le', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').not().le(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(14);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter ge', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').ge(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(2);
      dogs[0].ownerId.should.eql(11);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not ge', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').not().ge(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(3);
      dogs[0].ownerId.should.eql(5);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter gt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').gt(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(14);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not gt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').not().gt(11)
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(4);
      dogs[0].ownerId.should.eql(5);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not eq and not lt', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .where('ownerId').not().lt(10)
    .and()
    .filter('color').not().eq('Brown')
    .exec()
    .then(function (dogs) {
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(11);
      done();
    })
    .catch(done);
  });

  it('Basic Query on SGI with filter not contains or beginsWith', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('color').not().contains('Brown')
    .or()
    .filter('name').beginsWith('Q').exec()
    .then(function (dogs) {
      dogs.length.should.eql(2);
      done();
    })
    .catch(done);

  });

  it('beginsWith() cannot follow not()', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('color').not().contains('Brown')
    .or()
    .filter('name').not().beginsWith('Q')
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: beginsWith() cannot follow not()');
      done();
    });
  });

  it('Basic Query on SGI with filter between', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('age').between(5,7)
    .exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(1);
      dogs[0].ownerId.should.eql(2);
      done();
    });
  });

  it('between() cannot follow not()', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('age').not().between(5,7)
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: between() cannot follow not()');
      done();
    });
  });

  it('Basic Query on SGI with filter in', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('color').in(["White and Brown", "White"])
    .exec(function (err, dogs) {
      should.not.exist(err);
      dogs.length.should.eql(3);
      dogs[0].ownerId.should.eql(2);
      done();
    });
  });

  it('in() cannot follow not()', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('Jack Russell Terrier')
    .filter('color').not().in(["White and Brown", "White"])
    .exec(function (err) {
      should.exist(err.message);
      err.message.should.eql('Invalid Query state: in() cannot follow not()');
      done();
    });
  });

  it('Query.count', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).count().all().exec()
    .then(function (count) {
      count.should.eql(4);
      done();
    })
    .catch(done);
  });

  it('Query.counts', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('breed').eq('unknown')
    .and()
    .filter('color').not().eq('Brown')
    .counts().all().exec()
    .then(function (counts) {
      counts.scannedCount.should.eql(5);
      counts.count.should.eql(4);
      done();
    })
    .catch(done);
  });

  it('Query.all', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).limit(2).all().exec()
    .then(function (dogs) {
      dogs.length.should.eql(4);
      done();
    })
    .catch(done);
  });

  it('Query.all(1, 3)', function (done) {
    var Dog = dynamoose.model('Dog');

    Dog.query('ownerId').eq(20).limit(1).all(1000, 3).exec()
    .then(function (dogs) {
      dogs.length.should.eql(3);
      dogs.timesQueried.should.eql(3);
      done();
    })
    .catch(done);
  });
});

describe('Query updatedAt', function(){
  this.timeout(10000);

  before(function (done) {

    dynamoose.setDefaults({ prefix: '' });

    var recordSchema = new Schema({
      recordID: {
        type: String,
        hashKey: true
      },
      tableID: {
        type: String,
        required: true,
        index: {
          global: true,
          rangeKey: 'updatedAt'
        }
      }
    }, {
      timestamps: true
    });

    var Record = dynamoose.model('Record', recordSchema);

    function adddRecords (records) {
      if (records.length <= 0) {
        return done();
      }

      var record = new Record(records.pop());
      record.save(function (err) {
        if (err) {
          return done(err);
        }
        adddRecords(records);
      });
    }

    adddRecords([
      {recordID: 'ca4cba8c-d7e7-4845-b554-cb8ee6859642', tableID: '78d650c5-9b7f-404e-9873-03068f06b51d'},
      {recordID: '534d980b-3cf5-455d-9a79-b31e68db4bca', tableID: '78d650c5-9b7f-404e-9873-03068f06b51d'},
      {recordID: 'c00a9bfb-3450-4356-b94e-94c02887e649', tableID: '78d650c5-9b7f-404e-9873-03068f06b51d'},
      {recordID: '1a2415c6-d3cc-412d-a945-bb1ef398c7f7', tableID: '78d650c5-9b7f-404e-9873-03068f06b51d'},
      {recordID: 'd2d1512f-627e-4199-9eb2-2ad52ebe07fd', tableID: '78d650c5-9b7f-404e-9873-03068f06b51d'},
    ]);
  });

  after(function (done) {
    var Record = dynamoose.model('Record');

    Record.$__.table.delete(function (err) {
      if (err) {
        done(err);
      }
      delete dynamoose.models.Record;
      done();
    });
  });

  it('Query range key', function (done) {
    var Record = dynamoose.model('Record');

    Record.scan().exec(function (err, records) {
      if (err) {
        return done(err);
      }

      var sorted = records.sort( function(a, b) {
        return a.updatedAt < b.updatedAt;
      });

      var startTime = sorted[3].updatedAt;
      var EndTime = sorted[1].updatedAt;

      Record.query('tableID').eq('78d650c5-9b7f-404e-9873-03068f06b51d')
        .where('updatedAt').between(startTime, EndTime)
        .exec( function(err, records) {
          if (err) {
            return done(err);
          }

          // Should get the middle 3 records
          should.equal(records.count, 3);
          done();
        });
    });
  });

  it('Update updatedAt attribute', function (done) {
    var Record = dynamoose.model('Record');

    Record.scan().limit(1).exec(function(err, records) {
      if (err) {
        return done(err);
      }

      var record = records[0];
      var initialUpdatedAt = record.updatedAt;

      record.tableID = '2777a8b7-58ba-4ad1-8f72-fdba14623277';
      record.save(function (err) {
        if (err) {
          return done(err);
        }

        Record.query('recordID').eq(record.recordID).exec( function(err, newRecords) {
          if (err) {
            return done(err);
          }

          var newRecord = newRecords[0];
          (newRecord.updatedAt > initialUpdatedAt).should.be.true();

          done();
        });
      });
    });
  });

});