'use strict';

const dynamoose = require('../lib/');
dynamoose.AWS.config.update({
  'accessKeyId': 'AKID',
  'secretAccessKey': 'SECRET',
  'region': 'us-east-1'
});

dynamoose.local();

const should = require('should');
const CatsFixture = require('./fixtures/Cats');

let Cats = {};

const ONE_YEAR = 365 * 24 * 60 * 60; // 1 years in seconds
const NINE_YEARS = 9 * ONE_YEAR; // 9 years in seconds

describe('Model', function () {
  this.timeout(15000);
  before(function (done) {
    this.timeout(12000);
    dynamoose.setDefaults({'prefix': 'test-', 'suffix': '-db'});
    Cats = CatsFixture(dynamoose);
    done();
  });

  after((done) => {

    delete dynamoose.models['test-Cat-db'];
    done();
  });

  it('Create simple model', async function () {
    this.timeout(12000);


    Cats.Cat.should.have.property('$__');

    Cats.Cat.should.have.property('name');
    // Older node doesn't support Function.name changes
    if (Object.getOwnPropertyDescriptor(Function, 'name').configurable) {
      Cats.Cat.name.should.eql('Model-test-Cat-db');
    }

    Cats.Cat.$__.name.should.eql('test-Cat-db');
    Cats.Cat.$__.options.should.have.property('create', true);

    const {schema} = Cats.Cat.$__;

    should.exist(schema);

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.not.exist(schema.attributes.id.default);
    should.exist(schema.attributes.id.validator);
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    should(schema.attributes.name.required).not.be.ok;

    schema.hashKey.should.equal(schema.attributes.id); // should be same object
    should.not.exist(schema.rangeKey);

    const kitten = new Cats.Cat(
      {
        'id': 1,
        'name': 'Fluffy',
        'vet': {'name': 'theVet', 'address': '12 somewhere'},
        'ears': [{'name': 'left'}, {'name': 'right'}],
        'legs': ['front right', 'front left', 'back right', 'back left'],
        'more': {'favorites': {'food': 'fish'}},
        'array': [{'one': '1'}],
        'validated': 'valid'
      }
    );

    kitten.id.should.eql(1);
    kitten.name.should.eql('Fluffy');

    const dynamoObj = await schema.toDynamo(kitten);

    dynamoObj.should.eql({
      'ears': {
        'L': [
          {'M': {'name': {'S': 'left'}}},
          {'M': {'name': {'S': 'right'}}}
        ]
      },
      'id': {'N': '1'},
      'name': {'S': 'Fluffy'},
      'vet': {'M': {'address': {'S': '12 somewhere'}, 'name': {'S': 'theVet'}}},
      'legs': {'SS': ['front right', 'front left', 'back right', 'back left']},
      'more': {'S': '{"favorites":{"food":"fish"}}'},
      'array': {'S': '[{"one":"1"}]'},
      'validated': {'S': 'valid'}
    });

    await kitten.save();

  });

  it('Should support async validate', async function () {
    this.timeout(12000);

    const Wolf1 = dynamoose.model('Wolf1', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'validate' (val) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(val.length >= 5), 1000);
          });
        }
      }
    }));

    let error;
    try {
      await Wolf1.create({'id': 1, 'name': 'Rob'});
    } catch (e) {
      error = e;
    }
    should.exist(error);
    error = null;

    try {
      await Wolf1.create({'id': 2, 'name': 'Smith'});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
  });
  it('Should support async validate with async function', async function () {
    this.timeout(12000);

    const Wolf2 = dynamoose.model('Wolf2', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'validate': {
          'isAsync': true,
          'validator' (val, cb) {
            setTimeout(() => cb(val.length >= 5), 1000);
          },
          'disableModelParameter': true
        }
      }
    }));

    let error;
    try {
      await Wolf2.create({'id': 1, 'name': 'Rob'});
    } catch (e) {
      error = e;
    }
    should.exist(error);
    error = null;

    try {
      await Wolf2.create({'id': 2, 'name': 'Smith'});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
  });
  it('Should support async validate with async function as validate.validate', async function () {
    this.timeout(12000);

    const Wolf12 = dynamoose.model('Wolf12', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'validate': {
          'isAsync': true,
          'validate' (val, cb) {
            setTimeout(() => cb(val.length >= 5), 1000);
          },
          'disableModelParameter': true
        }
      }
    }));

    let error;
    try {
      await Wolf12.create({'id': 1, 'name': 'Rob'});
    } catch (e) {
      error = e;
    }
    should.exist(error);
    error = null;

    try {
      await Wolf12.create({'id': 2, 'name': 'Smith'});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
  });
  it('Should support async set', async function () {
    this.timeout(12000);

    const Wolf3 = dynamoose.model('Wolf3', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'set' (val) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(`${val}Hello World`), 1000);
          });
        }
      }
    }));

    let error, res;
    try {
      await Wolf3.create({'id': 1, 'name': 'Rob'});
      res = await Wolf3.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('RobHello World');
  });
  it('Should support async set with async function', async function () {
    this.timeout(12000);

    const Wolf4 = dynamoose.model('Wolf4', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'set': {
          'isAsync': true,
          'set' (val, cb) {
            setTimeout(() => cb(`${val}Hello World`), 1000);
          }
        }
      }
    }));

    let error, res;
    try {
      await Wolf4.create({'id': 1, 'name': 'Rob'});
      res = await Wolf4.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('RobHello World');
  });
  it('Should support async get', async function () {
    this.timeout(12000);

    const Wolf5 = dynamoose.model('Wolf5', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'get' (val) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(`${val}Hello World`), 1000);
          });
        }
      }
    }));

    let error, res;
    try {
      await Wolf5.create({'id': 1, 'name': 'Rob'});
      res = await Wolf5.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('RobHello World');
  });
  it('Should support async get with async function', async function () {
    this.timeout(12000);

    const Wolf6 = dynamoose.model('Wolf6', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'get': {
          'isAsync': true,
          'get' (val, cb) {
            setTimeout(() => cb(`${val}Hello World`), 1000);
          }
        }
      }
    }));

    let error, res;
    try {
      await Wolf6.create({'id': 1, 'name': 'Rob'});
      res = await Wolf6.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('RobHello World');
  });
  it('Should support async default', async function () {
    this.timeout(12000);

    const Wolf7 = dynamoose.model('Wolf7', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'default' () {
          return new Promise((resolve) => {
            setTimeout(() => resolve('Hello World'), 1000);
          });
        }
      }
    }));

    let error, res;
    try {
      await Wolf7.create({'id': 1});
      res = await Wolf7.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('Hello World');
  });
  it('Should support async toDynamo', async function () {
    this.timeout(12000);

    const Wolf8 = dynamoose.model('Wolf8', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'toDynamo' () {
          return new Promise((resolve) => {
            setTimeout(() => resolve({'S': 'Hello World'}), 1000);
          });
        }
      }
    }));

    let error, res;
    try {
      await Wolf8.create({'id': 1, 'name': 'test'});
      res = await Wolf8.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('Hello World');
  });
  it('Should support async fromDynamo with async function', async function () {
    this.timeout(12000);

    const Wolf11 = dynamoose.model('Wolf11', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'toDynamo': {
          'isAsync': true,
          'toDynamo' (val, cb) {
            setTimeout(() => cb({'S': 'Hello World'}), 1000);
          }
        }
      }
    }));

    let error, res;
    try {
      await Wolf11.create({'id': 1, 'name': 'test'});
      res = await Wolf11.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('Hello World');
  });
  it('Should support async fromDynamo', async function () {
    this.timeout(12000);

    const Wolf9 = dynamoose.model('Wolf9', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'fromDynamo' () {
          return new Promise((resolve) => {
            setTimeout(() => resolve('Hello World'), 1000);
          });
        }
      }
    }));

    let error, res;
    try {
      await Wolf9.create({'id': 1, 'name': 'test'});
      res = await Wolf9.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('Hello World');
  });
  it('Should support async fromDynamo with async function', async function () {
    this.timeout(12000);

    const Wolf10 = dynamoose.model('Wolf10', new dynamoose.Schema({
      'id': Number,
      'name': {
        'type': String,
        'fromDynamo': {
          'isAsync': true,
          'fromDynamo' (val, cb) {
            setTimeout(() => cb('Hello World'), 1000);
          }
        }
      }
    }));

    let error, res;
    try {
      await Wolf10.create({'id': 1, 'name': 'test'});
      res = await Wolf10.get(1);
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
    res.name.should.eql('Hello World');
  });

  it('Create simple model with range key', () => {

    Cats.Cat2.should.have.property('name');
    // Older node doesn't support Function.name changes
    if (Object.getOwnPropertyDescriptor(Function, 'name').configurable) {
      Cats.Cat2.name.should.eql('Model-test-Cat2-db');
    }

    Cats.Cat2.should.have.property('$__');

    Cats.Cat2.$__.name.should.eql('test-Cat2-db');
    Cats.Cat2.$__.options.should.have.property('create', true);

    const {schema} = Cats.Cat2.$__;

    should.exist(schema);

    schema.attributes.ownerId.type.name.should.eql('number');
    should(schema.attributes.ownerId.isSet).not.be.ok;
    should.not.exist(schema.attributes.ownerId.default);
    should.not.exist(schema.attributes.ownerId.validator);
    should(schema.attributes.ownerId.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    should(schema.attributes.name.required).not.be.ok;

    schema.hashKey.should.equal(schema.attributes.ownerId); // should be same object
    schema.rangeKey.should.equal(schema.attributes.name);

  });

  it('Create simple model with unnamed attributes', async function () {
    this.timeout(12000);

    Cats.Cat5.should.have.property('name');
    // Older node doesn't support Function.name changes
    if (Object.getOwnPropertyDescriptor(Function, 'name').configurable) {
      Cats.Cat5.name.should.eql('Model-test-Cat5-db');
    }

    Cats.Cat5.should.have.property('$__');

    Cats.Cat5.$__.name.should.eql('test-Cat5-db');
    Cats.Cat5.$__.options.should.have.property('saveUnknown', true);

    const {schema} = Cats.Cat5.$__;

    should.exist(schema);

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.exist(schema.attributes.id.default);
    should.exist(schema.attributes.id.validator);
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    should(schema.attributes.name.required).be.ok;

    schema.hashKey.should.equal(schema.attributes.id); // should be same object
    should.not.exist(schema.rangeKey);

    const kitten = new Cats.Cat5(
      {
        'id': 2,
        'name': 'Fluffy',
        'owner': 'Someone',
        'unnamedInt': 1,
        'unnamedInt0': 0,
        'unnamedBooleanFalse': false,
        'unnamedBooleanTrue': true,
        'unnamedString': 'unnamed',

        // Attributes with empty values. DynamoDB won't store empty values
        // so the return value of toDynamo() should exclude these attributes.
        'unnamedUndefined': undefined,
        'unnamedNull': null,
        'unnamedEmptyString': '',
        'unnamedNumberNaN': NaN
      }
    );

    kitten.id.should.eql(2);
    kitten.name.should.eql('Fluffy');

    const dynamoObj = await schema.toDynamo(kitten);

    dynamoObj.should.eql({
      'id': {'N': '2'},
      'name': {'S': 'Fluffy'},
      'owner': {'S': 'Someone'},
      'unnamedInt': {'N': '1'},
      'unnamedInt0': {'N': '0'},
      'unnamedBooleanFalse': {'BOOL': false},
      'unnamedBooleanTrue': {'BOOL': true},
      'unnamedString': {'S': 'unnamed'}
    });

    await kitten.save();

  });

  it('Create returnRequest option', (done) => {
    Cats.ExpiringCat.create({'name': 'Leo'}, {'returnRequest': true})
      .then((request) => {
        request.should.exist;

        request.TableName.should.eql('test-ExpiringCat-db');
        request.Item.name.should.eql({'S': 'Leo'});
        done();
      })
      .catch(done);
  });

  it('Should support useDocumentTypes and useNativeBooleans being false', function (done) {
    this.timeout(12000);

    const kitten = new Cats.Cat10({
      'id': 2,
      'isHappy': true,
      'parents': ['Max', 'Leah'],
      'details': {
        'playful': true,
        'thirsty': false,
        'tired': false
      }
    });

    kitten.id.should.eql(2);
    kitten.isHappy.should.eql(true);
    kitten.parents.should.eql(['Max', 'Leah']);
    kitten.details.should.eql({
      'playful': true,
      'thirsty': false,
      'tired': false
    });

    kitten.save((firstReturnedError, firstReturnedKitten) => {
      firstReturnedKitten.id.should.eql(2);
      firstReturnedKitten.isHappy.should.eql(true);
      firstReturnedKitten.parents.should.eql(['Max', 'Leah']);
      firstReturnedKitten.details.should.eql({
        'playful': true,
        'thirsty': false,
        'tired': false
      });

      Cats.Cat10.get(2, (secondReturnedError, secondReturnedKitten) => {
        secondReturnedKitten.id.should.eql(2);
        secondReturnedKitten.isHappy.should.eql(true);
        secondReturnedKitten.parents.should.eql(['Max', 'Leah']);
        secondReturnedKitten.details.should.eql({
          'playful': true,
          'thirsty': false,
          'tired': false
        });

        done();
      });
    });
  });

  it('Create complex model with unnamed attributes', async function () {
    this.timeout(12000);

    Cats.Cat1.should.have.property('name');
    // Older node doesn't support Function.name changes
    if (Object.getOwnPropertyDescriptor(Function, 'name').configurable) {
      Cats.Cat1.name.should.eql('Model-test-Cat1-db');
    }

    Cats.Cat1.should.have.property('$__');

    Cats.Cat1.$__.name.should.eql('test-Cat1-db');
    Cats.Cat1.$__.options.should.have.property('saveUnknown', true);

    const {schema} = Cats.Cat1.$__;

    should.exist(schema);

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.exist(schema.attributes.id.default);
    should.exist(schema.attributes.id.validator);
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    should(schema.attributes.name.required).be.ok;

    schema.hashKey.should.equal(schema.attributes.id); // should be same object
    should.not.exist(schema.rangeKey);

    const kitten = new Cats.Cat1(
      {
        'id': 2,
        'name': 'Fluffy',
        'owner': 'Someone',
        'children': {
          'mittens': {
            'name': 'mittens',
            'age': 1
          },
          'puddles': {
            'name': 'puddles',
            'age': 2
          }
        },
        'characteristics': ['cute', 'fuzzy']
      }
    );

    kitten.id.should.eql(2);
    kitten.name.should.eql('Fluffy');

    const dynamoObj = await schema.toDynamo(kitten);

    dynamoObj.should.eql({
      'id': {'N': '2'},
      'name': {'S': 'Fluffy'},
      'owner': {'S': 'Someone'},
      'children': {
        'M': {
          'mittens': {'M': {'name': {'S': 'mittens'}, 'age': {'N': '1'}}},
          'puddles': {'M': {'name': {'S': 'puddles'}, 'age': {'N': '2'}}}
        }
      },
      'characteristics': {'L': [{'S': 'cute'}, {'S': 'fuzzy'}]}
    });

    await kitten.save();

  });

  it('Get item for model with unnamed attributes', (done) => {

    Cats.Cat5.get(2, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.should.have.property('id', 2);
      model.should.have.property('name', 'Fluffy');
      model.should.have.property('owner', 'Someone');
      model.should.have.property('unnamedInt', 1);
      model.should.have.property('unnamedString', 'unnamed');
      model.should.have.property('$__');
      done();
    });
  });

  it('Get item for model', (done) => {

    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.should.have.property('id', 1);
      model.should.have.property('name', 'Fluffy');
      model.should.have.property('vet', {'address': '12 somewhere', 'name': 'theVet'});
      model.should.have.property('$__');
      done();
    });
  });

  it('Get item for model with falsy keys', (done) => {
    Cats.Cat8.create({'id': 0, 'age': 0})
      .then(() => Cats.Cat8.get({'id': 0, 'age': 0}))
      .then((falsyCat) => {
        falsyCat.should.have.property('id', 0);
        falsyCat.should.have.property('age', 0);
        done();
      })
      .catch(done);
  });

  it('Get item with invalid key', (done) => {

    Cats.Cat.get(0, (err, model) => {
      should.exist(err);
      err.name.should.equal('ValidationError');
      should.not.exist(model);
      done();
    });
  });

  it('Get and Update corrupted item', (done) => {

    // create corrupted item
    const req = dynamoose.ddb().putItem({
      'Item': {
        'id': {
          'N': '7'
        },
        'isHappy': {
          // this is the data corruption
          'S': 'tue'
        }
      },
      'ReturnConsumedCapacity': 'TOTAL',
      'TableName': Cats.Cat7.$__.table.name
    });

    req.promise().then(() => Cats.Cat7.get(7)).catch((err) => {
      should.exist(err.message);
    }).then(() => Cats.Cat7.update(7, {'name': 'my favorite cat'})).catch((err) => {
      should.exist(err.message);
      done();
    });
  });

  it('Get returnRequest option', (done) => {
    Cats.Cat.get(1, {'returnRequest': true}, (err, request) => {
      should.not.exist(err);
      should.exist(request);

      request.TableName.should.eql('test-Cat-db');
      request.Key.should.eql({'id': {'N': '1'}});
      done();
    });
  });

  it('Save existing item', (done) => {

    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Fluffy');

      model.name = 'Bad Cat';
      model.vet.name = 'Tough Vet';
      model.ears[0].name = 'right';

      model.save((errB) => {
        should.not.exist(errB);

        Cats.Cat.get({'id': 1}, {'consistent': true}, (errC, badCat) => {
          should.not.exist(errC);
          badCat.name.should.eql('Bad Cat');
          badCat.vet.name.should.eql('Tough Vet');
          badCat.ears[0].name.should.eql('right');
          badCat.ears[1].name.should.eql('right');
          done();
        });
      });
    });
  });

  it('Save existing item without defining updating timestamps', (done) => {
    const myCat = new Cats.Cat9({
      'id': 1,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedCreatedAt = theSavedCat1.createdAt;
      const expectedUpdatedAt = theSavedCat1.updatedAt;

      theSavedCat1.name = 'FluffyB';
      setTimeout(() => {
        theSavedCat1.save(() => {
          Cats.Cat9.get(1, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
            realCat.updatedAt.should.not.eql(expectedUpdatedAt); // updatedAt should be different than before
            done();
          });
        });
      }, 1000);
    });
  });

  it('Save existing item with updating timestamps', (done) => {
    const myCat = new Cats.Cat9({
      'id': 1,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedCreatedAt = theSavedCat1.createdAt;
      const expectedUpdatedAt = theSavedCat1.updatedAt;

      myCat.name = 'FluffyB';
      setTimeout(() => {
        myCat.save({'updateTimestamps': true}, () => {
          Cats.Cat9.get(1, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
            realCat.updatedAt.should.not.eql(expectedUpdatedAt); // updatedAt should be different than before
            done();
          });
        });
      }, 1000);
    });
  });

  it('Save existing item without updating timestamps', (done) => {
    const myCat = new Cats.Cat9({
      'id': 1,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedCreatedAt = theSavedCat1.createdAt;
      const expectedUpdatedAt = theSavedCat1.updatedAt;

      myCat.name = 'FluffyB';
      setTimeout(() => {
        myCat.save({'updateTimestamps': false}, () => {
          Cats.Cat9.get(1, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
            realCat.updatedAt.should.eql(expectedUpdatedAt); // updatedAt should be the same as before
            done();
          });
        });
      }, 1000);
    });
  });

  it('should save without updating timestamps in conditions', (done) => {
    const myCat = new Cats.Cat9({
      'id': 1,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const savedUpdatedAt = theSavedCat1.updatedAt;

      myCat.name = 'FluffyB';
      myCat.save({
        'condition': 'updatedAt = :updatedAt',
        'conditionValues': {
          'updatedAt': savedUpdatedAt
        }
      }, (error) => {
        should(error).eql(null);
        done();
      });
    });
  });


  it('Save existing item with updating expires', (done) => {
    const myCat = new Cats.Cat11({
      'id': 1,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedExpires = theSavedCat1.expires;

      myCat.name = 'FluffyB';
      setTimeout(() => {
        myCat.save({'updateExpires': true}, () => {
          Cats.Cat11.get(1, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.expires.should.not.eql(expectedExpires); // expires should be different than before
            done();
          });
        });
      }, 1000);
    });
  });


  it('Save existing item without updating expires', (done) => {
    const myCat = new Cats.Cat11({
      'id': 2,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedExpires = theSavedCat1.expires;

      myCat.name = 'FluffyB';
      setTimeout(() => {
        myCat.save({'updateExpires': false}, () => {
          Cats.Cat11.get(2, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.expires.should.eql(expectedExpires); // expires should be the same as before
            done();
          });
        });
      }, 1000);
    });
  });


  it('Save existing item without updating expires (default)', (done) => {
    const myCat = new Cats.Cat11({
      'id': 3,
      'name': 'Fluffy',
      'vet': {'name': 'theVet', 'address': '12 somewhere'},
      'ears': [{'name': 'left'}, {'name': 'right'}],
      'legs': ['front right', 'front left', 'back right', 'back left'],
      'more': {'favorites': {'food': 'fish'}},
      'array': [{'one': '1'}],
      'validated': 'valid'
    });

    myCat.save((err, theSavedCat1) => {
      const expectedExpires = theSavedCat1.expires;

      myCat.name = 'FluffyB';
      setTimeout(() => {
        myCat.save(() => {
          Cats.Cat11.get(3, (errB, realCat) => {
            realCat.name.should.eql('FluffyB');
            realCat.expires.should.eql(expectedExpires); // expires should be the same as before
            done();
          });
        });
      }, 1000);
    });
  });

  it('Save existing item with a false condition', (done) => {
    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        'condition': '#name = :name',
        'conditionNames': {'name': 'name'},
        'conditionValues': {'name': 'Muffin'}
      }, (errA) => {
        should.exist(errA);
        errA.code.should.eql('ConditionalCheckFailedException');

        Cats.Cat.get({'id': 1}, {'consistent': true}, (errB, badCat) => {
          should.not.exist(errB);
          badCat.name.should.eql('Bad Cat');
          done();
        });
      });
    });
  });

  it('Save existing item with a true condition', (done) => {
    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        'condition': '#name = :name',
        'conditionNames': {'name': 'name'},
        'conditionValues': {'name': 'Bad Cat'}
      }, (errA) => {
        should.not.exist(errA);

        Cats.Cat.get({'id': 1}, {'consistent': true}, (errB, whiskers) => {
          should.not.exist(errB);
          whiskers.name.should.eql('Whiskers');
          done();
        });
      });
    });
  });

  it('Save with a pre hook', (done) => {
    let flag = false;
    Cats.Cat.pre('save', (next) => {
      flag = true;
      next();
    });

    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Whiskers');

      model.name = 'Fluffy';
      model.vet.name = 'Nice Guy';
      model.save((errA) => {
        should.not.exist(errA);

        Cats.Cat.get({'id': 1}, {'consistent': true}, (errB, badCat) => {
          should.not.exist(errB);
          badCat.name.should.eql('Fluffy');
          badCat.vet.name.should.eql('Nice Guy');
          flag.should.be.true;

          Cats.Cat.removePre('save');
          done();
        });
      });
    });
  });

  it('Save existing item with an invalid attribute', (done) => {
    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.exist(model);

      model.validated = 'bad';
      model.save().catch((errA) => {
        should.exist(errA);
        errA.name.should.equal('ValidationError');
        Cats.Cat.get({'id': 1}, {'consistent': true}, (errB, badCat) => {
          should.not.exist(errB);
          badCat.name.should.eql('Fluffy');
          badCat.vet.name.should.eql('Nice Guy');
          badCat.ears[0].name.should.eql('right');
          badCat.ears[1].name.should.eql('right');
          done();
        });
      });
    });
  });

  it('Deletes item', (done) => {

    const cat = new Cats.Cat({'id': 1});

    cat.delete(done);
  });

  it('Deletes item with invalid key', (done) => {

    const cat = new Cats.Cat({'id': 0});

    cat.delete((err) => {
      should.exist(err);
      err.name.should.equal('ValidationError');
      done();
    });
  });

  it('Delete returnRequest option', (done) => {
    const cat = new Cats.Cat({'id': 1});

    cat.delete({'returnRequest': true}, (err, request) => {
      should.not.exist(err);
      request.should.exist;

      request.TableName.should.eql('test-Cat-db');
      request.Key.should.eql({'id': {'N': '1'}});

      done();
    });
  });

  it('Get missing item', (done) => {


    Cats.Cat.get(1, (err, model) => {
      should.not.exist(err);
      should.not.exist(model);
      done();
    });
  });

  it('Static Creates new item', (done) => {
    Cats.Cat.create({'id': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.not.exist(err);
      should.exist(garfield);
      garfield.id.should.eql(666);
      done();
    });
  });

  it('Static Creates new item with range key', (done) => {
    Cats.Cat2.create({'ownerId': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.not.exist(err);
      should.exist(garfield);
      garfield.ownerId.should.eql(666);
      done();
    });
  });

  it('Prevent duplicate create', (done) => {
    Cats.Cat.create({'id': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.exist(err);
      should.not.exist(garfield);
      done();
    });
  });

  it('Should allow for primary key being `_id` while creating', (done) => {
    Cats.Cat12.create({'_id': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.not.exist(err);
      should.exist(garfield);
      done();
    });
  });

  it('Prevent duplicate create with range key', (done) => {
    Cats.Cat2.create({'ownerId': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.exist(err);
      should.not.exist(garfield);
      done();
    });
  });

  it('Static Creates second item', (done) => {
    Cats.Cat.create({'id': 777, 'name': 'Catbert'}, (err, catbert) => {
      should.not.exist(err);
      should.exist(catbert);
      catbert.id.should.eql(777);
      done();
    });
  });

  it('BatchGet items', (done) => {
    Cats.Cat.batchGet([{'id': 666}, {'id': 777}], (err, cats) => {
      cats.length.should.eql(2);
      done();
    });
  });

  it('BatchGet items for model with falsy keys', (done) => {
    Cats.Cat8.create({'id': 1, 'age': 0})
      .then(() => Cats.Cat8.batchGet([{'id': 1, 'age': 0}]))
      .then((cats) => {
        cats.length.should.eql(1);
        cats[0].should.have.property('id', 1);
        cats[0].should.have.property('age', 0);
        done();
      })
      .catch(done);
  });

  it('Static Delete', (done) => {
    Cats.Cat.delete(666, (err) => {
      should.not.exist(err);
      Cats.Cat.get(666, (errA, delCat) => {
        should.not.exist(errA);
        should.not.exist(delCat);

        Cats.Cat.delete(777, done);
      });
    });
  });

  it('Should support deletions with validators', (done) => {
    const cat = new Cats.CatWithGeneratedID({
      'owner': {
        'name': 'Joe',
        'address': 'Somewhere'
      },
      'name': 'Garfield',
      'id': 'Joe_Garfield'
    });
    cat.delete((err) => {
      should.not.exist(err);
      Cats.CatWithGeneratedID.get(cat, (errA, delCat) => {
        should.not.exist(errA);
        should.not.exist(delCat);
        done();
      });
    });
  });

  it('Static Delete with range key', (done) => {
    Cats.Cat2.delete({'ownerId': 666, 'name': 'Garfield'}, (err) => {
      should.not.exist(err);
      Cats.Cat2.get({'ownerId': 666, 'name': 'Garfield'}, (errA, delCat) => {
        should.not.exist(errA);
        should.not.exist(delCat);
        done();
      });
    });
  });

  it('Static Creates new item', (done) => {
    Cats.Cat.create({'id': 666, 'name': 'Garfield'}, (err, garfield) => {
      should.not.exist(err);
      should.exist(garfield);
      garfield.id.should.eql(666);
      done();
    });
  });

  it('Static Delete with update', (done) => {
    Cats.Cat.delete(666, {'update': true}, (err, data) => {
      should.not.exist(err);
      should.exist(data);
      data.id.should.eql(666);
      data.name.should.eql('Garfield');
      Cats.Cat.get(666, (errA, delCat) => {
        should.not.exist(errA);
        should.not.exist(delCat);
        done();
      });
    });
  });

  it('Static Delete with update failure', (done) => {
    Cats.Cat.delete(666, {'update': true}, (err) => {
      should.exist(err);
      err.statusCode.should.eql(400);
      err.code.should.eql('ConditionalCheckFailedException');
      done();
    });
  });

  it('should delete a model with update set to true', async () => {
    const cat = new Cats.Cat({'id': 1});
    const model = await cat.save();
    let error, res;
    try {
      res = await Cats.Cat.delete(model, {'update': true});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
    res.id.should.eql(1);
  });


  // See comments on PR #306 for details on why the test below is commented out

  it('Should enable server side encryption', () => {
    const Model = dynamoose.model('TestTable', {'id': Number, 'name': String}, {'serverSideEncryption': true});
    Model.getTableReq().SSESpecification.Enabled.should.be.true;
  });

  it('Server side encryption shouldn\'t be enabled unless specified', (done) => {
    const Model = dynamoose.model('TestTableB', {'id': Number, 'name': String});
    setTimeout(() => {
      Model.$__.table.describe((err, data) => {
        const works = !data.Table.SSEDescription || data.Table.SSEDescription.Status === 'DISABLED';
        works.should.be.true;
        done();
      });
    }, 2000);
  });

  it('Makes model class available inside schema methods', () => {
    Object.keys(dynamoose.models).should.containEql('test-CatWithMethods-db');

    const cat = new Cats.CatWithMethods({'id': 1, 'name': 'Sir Pounce'});

    cat.getModel.should.throw(Error);

    const modelClass = cat.getModel('test-CatWithMethods-db');
    modelClass.should.equal(Cats.CatWithMethods);
  });

  describe('Model.update', () => {
    before((done) => {
      const stray = new Cats.Cat({'id': 999, 'name': 'Tom'});
      stray.save(done);
    });

    it('False condition', (done) => {
      Cats.Cat.update({'id': 999}, {'name': 'Oliver'}, {
        'condition': '#name = :name',
        'conditionNames': {'name': 'name'},
        'conditionValues': {'name': 'Muffin'}
      }, (err) => {
        should.exist(err);
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          should.not.exist(tomcat.age);
          done();
        });
      });
    });

    it('True condition', (done) => {
      Cats.Cat.update({'id': 999}, {'name': 'Oliver'}, {
        'condition': '#name = :name',
        'conditionNames': {'name': 'name'},
        'conditionValues': {'name': 'Tom'}
      }, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Oliver');
        Cats.Cat.get(999, (errA, oliver) => {
          should.not.exist(errA);
          should.exist(oliver);
          oliver.id.should.eql(999);
          oliver.name.should.eql('Oliver');
          should.not.exist(oliver.owner);
          should.not.exist(oliver.age);
          done();
        });
      });
    });

    it('If key is null or undefined, will use defaults', (done) => {
      Cats.Cat3.update(null, {'age': 3, 'name': 'Furrgie'}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(888);
        data.name.should.equal('Furrgie');
        data.age.should.equal(3);

        Cats.Cat3.get(888, (errA, furrgie) => {
          should.not.exist(errA);
          should.exist(furrgie);
          furrgie.id.should.eql(888);
          furrgie.name.should.eql('Furrgie');
          data.age.should.equal(3);

          Cats.Cat3.update(undefined, {'age': 4}, (errB, dataB) => {
            should.not.exist(errB);
            should.exist(dataB);
            dataB.id.should.eql(888);
            dataB.name.should.equal('Furrgie');
            dataB.age.should.equal(4);

            Cats.Cat3.get(888, (errC, furrgieB) => {
              should.not.exist(errC);
              should.exist(furrgieB);
              furrgieB.id.should.eql(888);
              furrgieB.name.should.eql('Furrgie');
              should.not.exist(furrgieB.owner);
              dataB.age.should.equal(4);
              done();
            });
          });
        });
      });
    });

    it('If key is null or undefined and default isn\'t provided, will throw an error', (done) => {
      Cats.Cat.update(null, {'name': 'Oliver'}, (err, data) => {
        should.not.exist(data);
        should.exist(err);
        done();
      });
    });

    it('If key is a value, will search by that value', (done) => {
      Cats.Cat3.update(888, {'age': 5}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(888);
        data.name.should.equal('Furrgie');
        data.age.should.equal(5);

        Cats.Cat3.get(888, (errA, furrgie) => {
          should.not.exist(errA);
          should.exist(furrgie);
          furrgie.id.should.eql(888);
          furrgie.name.should.eql('Furrgie');
          data.age.should.equal(5);
          done();
        });
      });
    });

    it('Creates an item with required attributes\' defaults if createRequired is true', (done) => {
      Cats.Cat3.update({'id': 25}, {'age': 3}, {'createRequired': true}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(25);
        data.name.should.equal('Mittens');
        data.age.should.equal(3);
        Cats.Cat3.get(25, (errA, mittens) => {
          should.not.exist(errA);
          should.exist(mittens);
          mittens.id.should.eql(25);
          mittens.name.should.eql('Mittens');
          should.not.exist(mittens.owner);
          data.age.should.equal(3);
          done();
        });
      });
    });

    it('Throws an error when a required attribute has no default and has not been specified in the update if createRequired is true', (done) => {
      Cats.Cat3.update({'id': 25}, {'name': 'Rufflestiltskins'}, {'createRequired': true}, (err, data) => {
        should.not.exist(data);
        should.exist(err);
        Cats.Cat3.get(25, (errA, mittens) => {
          should.not.exist(errA);
          should.exist(mittens);
          mittens.id.should.eql(25);
          mittens.name.should.eql('Mittens');
          done();
        });
      });
    });

    it('Adds required attributes, even when not specified, if createRequired is true', (done) => {
      Cats.Cat3.update({'id': 45}, {'age': 4}, {'createRequired': true}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(45);
        data.name.should.equal('Mittens');
        data.age.should.equal(4);
        Cats.Cat3.get(45, (errA, mittens) => {
          should.not.exist(errA);
          should.exist(mittens);
          mittens.id.should.eql(45);
          mittens.name.should.eql('Mittens');
          should.not.exist(mittens.owner);
          data.age.should.equal(4);
          done();
        });
      });
    });

    it('Does not add required attributes if createRequired is false', (done) => {
      Cats.Cat3.update({'id': 24}, {'name': 'Cat-rina'}, {'createRequired': false}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(24);
        data.name.should.equal('Cat-rina');
        should.not.exist(data.age);
        Cats.Cat3.get(24, (errA, mittens) => {
          should.not.exist(errA);
          should.exist(mittens);
          mittens.id.should.eql(24);
          data.name.should.equal('Cat-rina');
          should.not.exist(data.age);
          should.not.exist(mittens.owner);
          done();
        });
      });
    });

    it('If item did not exist and timestamps are desired, createdAt and updatedAt will both be filled in', (done) => {
      // try a delete beforehand in case the test is run more than once
      Cats.Cat4.delete({'id': 22}, () => {
        Cats.Cat4.update({'id': 22}, {'name': 'Twinkles'}, (err, data) => {
          should.not.exist(err);
          should.exist(data);
          should.exist(data.myLittleCreatedAt);
          should.exist(data.myLittleUpdatedAt);
          data.id.should.eql(22);
          data.name.should.equal('Twinkles');

          Cats.Cat4.get(22, (errA, twinkles) => {
            should.not.exist(errA);
            should.exist(twinkles);
            twinkles.id.should.eql(22);
            twinkles.name.should.equal('Twinkles');
            should.exist(twinkles.myLittleCreatedAt);
            should.exist(twinkles.myLittleUpdatedAt);
            done();
          });
        });
      });
    });

    it('UpdatedAt will be updated ', (done) => {
      // try a delete beforehand in case the test is run more than once
      Cats.Cat4.delete({'id': 22}, () => {
        Cats.Cat4.update({'id': 22}, {'name': 'Twinkles'}, (err, data) => {
          should.not.exist(err);
          should.exist(data);
          data.id.should.eql(22);
          data.name.should.equal('Twinkles');
          should.exist(data.myLittleCreatedAt);
          should.exist(data.myLittleUpdatedAt);

          // now do another update
          Cats.Cat4.update({'id': 22}, {'name': 'Furr-nando'}, (errA, dataA) => {
            should.not.exist(errA);
            should.exist(dataA);
            dataA.id.should.eql(22);
            dataA.name.should.equal('Furr-nando');
            dataA.myLittleUpdatedAt.getTime().should.be.above(data.myLittleCreatedAt.getTime());
            Cats.Cat4.get(22, (errB, furrnando) => {
              should.not.exist(errB);
              should.exist(furrnando);
              furrnando.id.should.eql(22);
              furrnando.name.should.equal('Furr-nando');
              furrnando.myLittleUpdatedAt.getTime().should.be.above(furrnando.myLittleCreatedAt.getTime());
              done();
            });
          });
        });
      });
    });

    it('Expires will be updated ', (done) => {
      Cats.ExpiringCat.create({'name': 'Fluffy2'})
        .then((fluffy) => {
          const max = Math.floor(Date.now() / 1000) + NINE_YEARS;
          const min = max - 1;
          should.exist(fluffy);
          should.exist(fluffy.expires);
          should.exist(fluffy.expires.getTime);

          const expiresInSec = Math.floor(fluffy.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);


          setTimeout(() => {
            Cats.ExpiringCat.update({'name': 'Fluffy2'}, {'name': 'Twinkles'}, {'updateExpires': true}, (err, fluffyA) => {
              should.not.exist(err);
              should.exist(fluffyA);
              should.exist(fluffyA.expires);
              should.exist(fluffyA.expires.getTime);

              const expiresInSec2 = Math.floor(fluffyA.expires.getTime() / 1000);
              expiresInSec2.should.be.above(expiresInSec);

              done();
            });
          }, 1000);
        })
        .catch(done);
    });

    it('Set expires attribute on save', (done) => {
      Cats.ExpiringCat.create({'name': 'Fluffy'})
        .then((fluffy) => {
          const max = Math.floor(Date.now() / 1000) + NINE_YEARS;
          const min = max - 1;
          should.exist(fluffy);
          should.exist(fluffy.expires);
          should.exist(fluffy.expires.getTime);

          const expiresInSec = Math.floor(fluffy.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);
          done();
        })
        .catch(done);

    });

    it('Does not set expires attribute on save if exists', (done) => {
      Cats.ExpiringCat.create({
        'name': 'Tigger',
        'expires': new Date(Date.now() + ONE_YEAR * 1000)
      })
        .then((tigger) => {
          const max = Math.floor(Date.now() / 1000) + ONE_YEAR;
          const min = max - 1;
          should.exist(tigger);
          should.exist(tigger.expires);
          should.exist(tigger.expires.getTime);

          const expiresInSec = Math.floor(tigger.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);
          done();
        })
        .catch(done);

    });

    it('Update expires attribute on save', (done) => {
      Cats.ExpiringCat.create({
        'name': 'Leo'
      })
        .then((leo) => {
          const max = Math.floor(Date.now() / 1000) + NINE_YEARS;
          const min = max - 1;
          const expiresInSec = Math.floor(leo.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);

          leo.expires = new Date(Date.now() + ONE_YEAR * 1000);
          return leo.save();
        })
        .then((leo) => {
          const max = Math.floor(Date.now() / 1000) + ONE_YEAR;
          const min = max - 1;
          const expiresInSec = Math.floor(leo.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);
          done();
        })
        .catch(done);

    });

    it('Save returnRequest option', (done) => {
      Cats.ExpiringCat.create({
        'name': 'Leo5'
      })
        .then((leo) => {
          const max = Math.floor(Date.now() / 1000) + NINE_YEARS;
          const min = max - 1;
          const expiresInSec = Math.floor(leo.expires.getTime() / 1000);
          expiresInSec.should.be.within(min, max);

          leo.expires = new Date(Date.now() + ONE_YEAR * 1000);
          return leo.save({'returnRequest': true});
        })
        .then((request) => {
          request.should.exist;

          request.TableName.should.eql('test-ExpiringCat-db');
          request.Item.name.should.eql({'S': 'Leo5'});
          done();
        })
        .catch(done);
    });

    it('Should not have an expires property if TTL is set to null', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo12'
      })
        .then(() => {
          Cats.ExpiringCatNull.get('Leo12').then((leo) => {
            should.exist(leo);
            should.not.exist(leo.expires);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should not return expired items if returnExpiredItems is false (get)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo1',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.get('Leo1').then((leo) => {
            should.not.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is false and expires is null (get)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo11',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.get('Leo11').then((leo) => {
            should.not.exist(leo.expires);
            should.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined (get)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo1',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.get('Leo1').then((leo) => {
            should.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined and expires is null (get)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo11',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.get('Leo11').then((leo) => {
            should.not.exist(leo.expires);
            should.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true (get)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo1',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.get('Leo1').then((leo) => {
            should.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true and expires is null (get)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo11',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.get('Leo11').then((leo) => {
            should.not.exist(leo.expires);
            should.exist(leo);
            done();
          }).catch(done);
        })
        .catch(done);
    });


    it('Should not return expired items if returnExpiredItems is false (batchGet)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo2',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.batchGet(['Leo2']).then((leo) => {
            leo.length.should.eql(0);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is false and expires is null (batchGet)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo22',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.batchGet(['Leo22']).then((leo) => {
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined (batchGet)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo2',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.batchGet(['Leo2']).then((leo) => {
            leo.length.should.eql(1);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined and expires is null (batchGet)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo22',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.batchGet(['Leo22']).then((leo) => {
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true (batchGet)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo2',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.batchGet(['Leo2']).then((leo) => {
            leo.length.should.eql(1);
            done();
          }).catch(done);
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true and expires is null (batchGet)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo22',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.batchGet(['Leo22']).then((leo) => {
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          }).catch(done);
        })
        .catch(done);
    });


    it('Should not return expired items if returnExpiredItems is false (scan)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo3',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.scan({'name': 'Leo3'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(0);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is false and expires is null (scan)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo33',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.scan({'name': 'Leo33'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined (scan)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo3',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.scan({'name': 'Leo3'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined and expires is null (scan)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo33',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.scan({'name': 'Leo33'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true (scan)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo3',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.scan({'name': 'Leo3'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true and expires is null (scan)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo33',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.scan({'name': 'Leo33'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });

    it('Should not return expired items if returnExpiredItems is false (query)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo4',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.query({'name': 'Leo4'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(0);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is false and expires is null (query)', (done) => {
      Cats.ExpiringCatNoReturn.create({
        'name': 'Leo44',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNoReturn.query({'name': 'Leo44'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined (query)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo4',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.query({'name': 'Leo4'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is undefined and expires is null (query)', (done) => {
      Cats.ExpiringCatNull.create({
        'name': 'Leo44',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatNull.query({'name': 'Leo44'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true (query)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo4',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = new Date(Date.now() - 5000);
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.query({'name': 'Leo4'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            done();
          });
        })
        .catch(done);
    });

    it('Should return expired items if returnExpiredItems is true and expires is null (query)', (done) => {
      Cats.ExpiringCatReturnTrue.create({
        'name': 'Leo44',
        'expires': new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365)
      })
        .then((leo) => {
          leo.expires = null;
          return leo.save();
        })
        .then(() => {
          Cats.ExpiringCatReturnTrue.query({'name': 'Leo44'}, (err, leo) => {
            if (err) {
              done(err);
            }
            leo.length.should.eql(1);
            should.not.exist(leo[0].expires);
            done();
          });
        })
        .catch(done);
    });


    // it('Add expires attribute on update if missing', function (done) {
    //
    // });
    //
    // it('Does not add expires attribute on update if exists', function (done) {
    //
    // });


    it('Updated key and update together ', (done) => {
      Cats.Cat.update({'id': 999, 'name': 'Felix'}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Felix');
        Cats.Cat.get(999, (errA, felix) => {
          should.not.exist(errA);
          should.exist(felix);
          felix.id.should.eql(999);
          felix.name.should.eql('Felix');
          should.not.exist(felix.owner);
          should.not.exist(felix.age);
          done();
        });
      });
    });

    it('Updated key with range and update together ', (done) => {
      Cats.Owner.create({'name': 'OwnerToUpdate', 'address': '123 A Street', 'phoneNumber': '2345551212'})
        .then((owner) => {
          owner.name.should.eql('OwnerToUpdate');
          owner.phoneNumber.should.eql('2345551212');
          return Cats.Owner.update({'name': 'OwnerToUpdate', 'address': '123 A Street', 'phoneNumber': 'newnumber'});
        })
        .then((updatedOwner) => {
          updatedOwner.name.should.eql('OwnerToUpdate');
          updatedOwner.phoneNumber.should.eql('newnumber');
          return Cats.Owner.get({'name': 'OwnerToUpdate', 'address': '123 A Street'});
        })
        .then((updatedOwner) => {
          updatedOwner.name.should.eql('OwnerToUpdate');
          updatedOwner.phoneNumber.should.eql('newnumber');
          done();
        })
        .catch(done);
    });

    it('Default puts attribute', (done) => {
      Cats.Cat.update({'id': 999}, {'name': 'Tom'}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Tom');
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          should.not.exist(tomcat.age);
          done();
        });
      });
    });

    it('Manual puts attribute with removal', (done) => {
      Cats.Cat.update({'id': 999}, {'$PUT': {'name': null}}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        should.not.exist(data.name);
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          should.not.exist(tomcat.name);
          done();
        });
      });
    });

    it('Manual puts attribute', (done) => {
      Cats.Cat.update({'id': 999}, {'$PUT': {'name': 'Tom', 'owner': 'Jerry', 'age': 3}}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.owner.should.equal('Jerry');
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          tomcat.owner.should.eql('Jerry');
          tomcat.age.should.eql(3);
          done();
        });
      });
    });

    it('Add attribute', (done) => {
      Cats.Cat.update({'id': 999}, {'$ADD': {'age': 1}}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.age.should.equal(4);
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          tomcat.owner.should.eql('Jerry');
          tomcat.age.should.eql(4);
          done();
        });
      });
    });

    it('Add attribute to list', (done) => {
      Cats.Cat13.create({'id': 1000, 'items': [{'name': 'item 2', 'amount': 25}]}, () => {
        Cats.Cat13.update({'id': 1000}, {'$ADD': {'items': [{'name': 'item 1', 'amount': 50}]}}, (err, data) => {
          should.not.exist(err);
          should.exist(data);
          data.id.should.eql(1000);
          data.items.should.eql([{'name': 'item 2', 'amount': 25}, {'name': 'item 1', 'amount': 50}]);
          Cats.Cat13.get(1000, (errA, cat) => {
            should.not.exist(errA);
            should.exist(cat);
            cat.id.should.eql(1000);
            cat.items.should.eql([{'name': 'item 2', 'amount': 25}, {'name': 'item 1', 'amount': 50}]);
            done();
          });
        });
      });
    });
    it('Delete attribute', (done) => {
      Cats.Cat.update({'id': 999}, {'$DELETE': {'owner': null}}, (err, data) => {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        should.not.exist(data.owner);
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          tomcat.age.should.eql(4);
          done();
        });
      });
    });

    it('With invalid attribute', (done) => {
      Cats.Cat.update({'id': 999}, {'name': 'Oliver', 'validated': 'bad'}, (err, data) => {
        should.exist(err);
        should.not.exist(data);
        err.name.should.equal('ValidationError');
        Cats.Cat.get(999, (errA, tomcat) => {
          should.not.exist(errA);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          done();
        });
      });
    });

    it('Update returns all new values using default returnValues option', () => Cats.Cat.create({'id': '678', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}).then((data) => {
      should.exist(data);
      data.name.should.equal('Tom');
      data.should.have.property('id');
    })));

    it('Update respects global defaultReturnValues option', () => Cats.ReturnValuesNoneCat.create({'id': '678', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.ReturnValuesNoneCat.update({'id': old.id}, {'name': 'Tom'}).then((data) => {
      should.not.exist(data);
    })));

    it('Update returns updated new values using \'UPDATED_NEW\'', () => Cats.Cat.create({'id': '678', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}, {'returnValues': 'UPDATED_NEW'}).then((data) => {
      should.exist(data);
      data.name.should.equal('Tom');
      data.should.not.have.property('id');
    })));

    it('Update returns all new values using \'ALL_NEW\'', () => Cats.Cat.create({'id': '678', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}, {'returnValues': 'ALL_NEW'}).then((data) => {
      should.exist(data);
      data.name.should.equal('Tom');
      data.should.have.property('id');
    })));

    it('Update returns old updated values using \'UPDATED_OLD\'', () => Cats.Cat.create({'id': '679', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}, {'returnValues': 'UPDATED_OLD'}).then((data) => {
      should.exist(data);
      data.name.should.equal('Oliver');
      data.should.not.have.property('id');
    })));

    it('Update returns old values using \'ALL_OLD\'', () => Cats.Cat.create({'id': '679', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}, {'returnValues': 'ALL_OLD'}).then((data) => {
      should.exist(data);
      data.name.should.equal('Oliver');
      data.should.have.property('id');
    })));

    it('Update with saveUnknown enabled', (done) => {
      Cats.Cat1.create({'id': 982, 'name': 'Oliver'}, (err, old) => {
        should.not.exist(err);
        Cats.Cat1.update({'id': old.id}, {'otherProperty': 'Testing123'}, (errA, data) => {
          should.not.exist(errA);
          should.exist(data);
          data.should.have.property('otherProperty');
          data.otherProperty.should.eql('Testing123');
          done();
        });
      });
    });

    it('Update $ADD with saveUnknown enabled', (done) => {
      Cats.Cat1.create({'id': 986, 'name': 'Oliver', 'mathy': 1}, (err, old) => {
        should.not.exist(err);
        old.should.have.property('mathy');
        old.mathy.should.eql(1);
        Cats.Cat1.update({'id': old.id}, {'$ADD': {'mathy': 4}}, (errA, data) => {
          should.not.exist(errA);
          should.exist(data);
          data.should.have.property('mathy');
          data.mathy.should.eql(5);
          done();
        });
      });
    });

    it('Update $DELETE with saveUnknown enabled', (done) => {
      Cats.Cat1.create({'id': 984, 'name': 'Oliver'}, (err, old) => {
        should.not.exist(err);
        Cats.Cat1.update({'id': old.id}, {'otherProperty': 'Testing123'}, (errA, data) => {
          should.not.exist(errA);
          should.exist(data);
          data.should.have.property('otherProperty');
          data.otherProperty.should.eql('Testing123');
          Cats.Cat1.update({'id': old.id}, {'$DELETE': {'otherProperty': 'Testing123'}}, (errB, dataB) => {
            should.not.exist(errB);
            should.exist(dataB);
            dataB.should.not.have.property('otherProperty');
            done();
          });
        });
      });
    });

    it('Update returns should not return any values using \'none\' option', () => Cats.Cat.create({'id': '680', 'name': 'Oliver'}, {'overwrite': true}).then((old) => Cats.Cat.update({'id': old.id}, {'name': 'Tom'}, {'returnValues': 'NONE'}).then((data) => {
      should.not.exist(data);
    })));

    it('Update returnRequest option', (done) => {
      Cats.Cat.update({'id': 999}, {'name': 'Oliver'}, {'returnRequest': true}, (err, request) => {
        should.not.exist(err);
        should.exist(request);

        request.TableName.should.eql('test-Cat-db');
        request.Key.should.eql({'id': {'N': '999'}});
        done();
      });
    });

    it('Allows simple string for array attribute in contains condition', (done) => {
      const kitten = new Cats.Cat(
        {
          'id': 1,
          'name': 'Fluffy',
          'legs': ['front right', 'front left', 'back right', 'back left']
        }
      );

      kitten.save(() => {
        const updateOptions = {
          'condition': 'contains(legs, :legs)',
          'conditionValues': {'legs': 'front right'}
        };

        Cats.Cat.update({'id': 1}, {'name': 'Puffy'}, updateOptions, (err, data) => {
          should.not.exist(err);
          should.exist(data);
          data.id.should.eql(1);
          data.name.should.equal('Puffy');
          Cats.Cat.get(1, (errA, puffy) => {
            should.not.exist(errA);
            should.exist(puffy);
            puffy.id.should.eql(1);
            puffy.name.should.eql('Puffy');
            done();
          });
        });
      });

    });

  });

  describe('Model.populate', () => {
    before((done) => {
      const kittenWithParentsA = new Cats.Cat6({'id': 1, 'name': 'One'});
      const owner = new Cats.Owner({'name': 'Owner', 'address': '123 A Street', 'phoneNumber': '2345551212'});
      const kittenWithOwner = new Cats.CatWithOwner({
        'id': 100,
        'name': 'Owned',
        'owner': {'name': owner.name, 'address': owner.address}
      });
      kittenWithParentsA.save()
        .then((kitten) => {
          const kittenWithParents = new Cats.Cat6({'id': 2, 'name': 'Two', 'parent': kitten.id});
          return kittenWithParents.save();
        })
        .then((kitten) => {
          const kittenWithParents = new Cats.Cat6({'id': 3, 'name': 'Three', 'parent': kitten.id});
          return kittenWithParents.save();
        })
        .then((kitten) => {
          const kittenWithParents = new Cats.Cat6({'id': 4, 'name': 'Four', 'parent': kitten.id});
          return kittenWithParents.save();
        })
        .then(() => {
          const kittenWithParents = new Cats.Cat6({'id': 5, 'name': 'Five', 'parent': 999});
          return kittenWithParents.save();
        })
        .then(() => {
          const kittenWithParents = new Cats.Cat7({'id': 1, 'name': 'One'});
          return kittenWithParents.save();
        })
        .then((kitten) => {
          const kittenWithParents = new Cats.Cat7({'id': 2, 'name': 'Two', 'parent': kitten.id});
          return kittenWithParents.save();
        })
        .then(() => owner.save())
        .then(() => {
          kittenWithOwner.save(done);
        });
    });

    it('Should populate with one parent', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'Cat6'
        }))
        .then((cat) => {
          should.exist(cat.parent);
          cat.parent.id.should.eql(3);
          cat.parent.name.should.eql('Three');
          done();
        });
    });

    it('Should deep populate with mutiple parent', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'Cat6',
          'populate': {
            'path': 'parent',
            'model': 'Cat6',
            'populate': {
              'path': 'parent',
              'model': 'Cat6'
            }
          }
        }))
        .then((cat) => {
          should.exist(cat.parent);
          let {parent} = cat;
          parent.id.should.eql(3);
          parent.name.should.eql('Three');
          ({parent} = parent);
          parent.id.should.eql(2);
          parent.name.should.eql('Two');
          ({parent} = parent);
          parent.id.should.eql(1);
          parent.name.should.eql('One');
          done();
        });
    });


    it('Should populate with range & hash key', (done) => {
      Cats.CatWithOwner.get(100)
        .then((cat) => {
          should.not.exist(cat.owner.phoneNumber);
          return cat.populate({
            'path': 'owner',
            'model': 'test-Owner'
          });
        })
        .then((cat) => {
          should.exist(cat.owner);
          cat.owner.name.should.eql('Owner');
          cat.owner.phoneNumber.should.eql('2345551212');
          done();
        });
    });

    it('Populating without the model definition and without ref', (done) => {
      Cats.Cat7.get(2)
        .then((cat) => cat.populate({
          'path': 'parent'
        }))
        .catch((err) => {
          should.exist(err.message);
          done();
        });
    });

    it('Populating with model and without the path definition', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate({
          'model': 'Cat6'
        }))
        .catch((err) => {
          should.exist(err.message);
          done();
        });
    });

    it('Populating with the wrong reference id', (done) => {
      Cats.Cat6.get(5)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'Cat6'
        }))
        .catch((err) => {
          should.exist(err.message);
          done();
        });
    });

    it('Populate works with hashkey', (done) => {
      Cats.Cat7.get(2)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'Cat7'
        }))
        .then((cat) => {
          should.exist(cat.parent);
          cat.parent.id.should.eql(1);
          cat.parent.name.should.eql('One');
          done();
        });
    });

    it('Populate works with prefix', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'test-Cat6-db'
        }))
        .then((cat) => {
          should.exist(cat.parent);
          cat.parent.id.should.eql(3);
          cat.parent.name.should.eql('Three');
          done();
        });
    });

    it('Populating with the wrong model name won\'t work', (done) => {
      Cats.Cat6.get(5)
        .then((cat) => cat.populate({
          'path': 'parent',
          'model': 'Cats6'
        }))
        .catch((err) => {
          should.exist(err.message);
          done();
        });
    });

    it('Populating with path and ref at the schema', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate({
          'path': 'parent'
        }))
        .then((cat) => {
          should.exist(cat.parent);
          const {parent} = cat;
          parent.id.should.eql(3);
          parent.name.should.eql('Three');
          done();
        });
    });

    it('Populating with string and ref at the schema', (done) => {
      Cats.Cat6.get(4)
        .then((cat) => cat.populate('parent'))
        .then((cat) => {
          should.exist(cat.parent);
          const {parent} = cat;
          parent.id.should.eql(3);
          parent.name.should.eql('Three');
          done();
        });
    });

  });

  describe('Model.batchPut', () => {

    it('Put new', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat({'id': 10 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (let i = 0; i < 10; i += 1) {

          delete cats[i].name;
        }

        Cats.Cat.batchGet(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put lots of new items', (done) => {
      const cats = [];

      for (let i = 0; i < 100; i += 1) {
        cats.push(new Cats.Cat({'id': 100 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (let i = 0; i < 100; i += 1) {
          delete cats[i].name;
        }

        Cats.Cat.batchGet(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put new with range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 10 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        Cats.Cat2.batchGet(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put new without range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 10 + i}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.exist(err);
        should.not.exist(result);
        done();
      });
    });

    it('Update items', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat({'id': 20 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        for (let i = 0; i < 10; i += 1) {
          const cat = cats[i];
          cat.name = `John_${cat.id + 100}`;
        }

        Cats.Cat.batchPut(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          for (let i = 0; i < 10; i += 1) {
            delete cats[i].name;
          }

          Cats.Cat.batchGet(cats, (err3, result3) => {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(cats.length);
            done();
          });
        });
      });
    });

    it('Update with range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 20 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        for (let i = 0; i < 10; i += 1) {
          const cat = cats[i];
          cat.name = `John_${cat.ownerId + 100}`;
        }

        Cats.Cat2.batchPut(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cats.Cat2.batchGet(cats, (err3, result3) => {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(cats.length);
            done();
          });
        });
      });
    });

    it('Update without range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 20 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        for (let i = 0; i < 10; i += 1) {
          cats[i].name = null;
        }

        Cats.Cat2.batchPut(cats, (err2, result2) => {
          should.exist(err2);
          should.not.exist(result2);
          done();
        });
      });
    });

    it('Update without updateTimestamps (default)', async () => {
      const cats = [...Array(10)]
        .map((_, i) => new Cats.Cat4({'id': i + 1, 'name': `Tom_${i}`}));

      const result = await Cats.Cat4.batchPut(cats);
      should.exist(result);

      const timestamps = {};
      cats.forEach((cat, i) => {
        const {id, myLittleUpdatedAt} = cat;
        cat.name = `John_${i}`;
        timestamps[id] = new Date(myLittleUpdatedAt);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat4.batchPut(cats);
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat4.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.myLittleUpdatedAt.should.eql(timestamps[cat.id]);
      });
    });

    it('Update with updateTimestamps set to false', async () => {
      const cats = [...Array(10)]
        .map((_, i) => new Cats.Cat4({'id': i + 1, 'name': `Tom_${i}`}));

      const result = await Cats.Cat4.batchPut(cats);
      should.exist(result);

      const timestamps = {};
      cats.forEach((cat, i) => {
        const {id, myLittleUpdatedAt} = cat;
        cat.name = `John_${i}`;
        timestamps[id] = new Date(myLittleUpdatedAt);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat4.batchPut(cats, {'updateTimestamps': false});
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat4.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.myLittleUpdatedAt.should.eql(timestamps[cat.id]);
      });
    });

    it('Update with updateTimestamps set to true', async () => {
      const cats = [...Array(10)]
        .map((_, i) => new Cats.Cat4({'id': i + 1, 'name': `Tom_${i}`}));

      const result = await Cats.Cat4.batchPut(cats);
      should.exist(result);

      const timestamps = {};
      cats.forEach((cat, i) => {
        const {id, myLittleUpdatedAt} = cat;
        cat.name = `John_${i}`;
        timestamps[id] = new Date(myLittleUpdatedAt);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat4.batchPut(cats, {'updateTimestamps': true});
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat4.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.myLittleUpdatedAt.should.be.greaterThan(timestamps[cat.id]);
      });
    });

    it('Update without updateExpires (default)', async () => {
      const cats = [
        new Cats.Cat11({
          'id': 1,
          'name': 'Crookshanks',
          'vet': {'name': 'theVet', 'address': 'Diagon Alley'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'food': 'fish'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        }),
        new Cats.Cat11({
          'id': 2,
          'name': 'Behemoth',
          'vet': {'name': 'Mikhail Bulgakov', 'address': 'Moscow'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'drink': 'pure alcohol'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        })
      ];

      const result = await Cats.Cat11.batchPut(cats);
      should.exist(result);

      const savedCats = await Cats.Cat11.batchGet(cats);
      should.exist(savedCats);
      savedCats.length.should.eql(cats.length);

      const originalExpires = {};
      savedCats.forEach((cat) => {
        cat.array.push({'two': '2'});
        originalExpires[cat.id] = cat.expires;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat11.batchPut(savedCats);
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat11.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.array.length.should.eql(2);
        cat.expires.should.eql(originalExpires[cat.id]);
      });
    });

    it('Update with updateExpires set to false', async () => {
      const cats = [
        new Cats.Cat11({
          'id': 1,
          'name': 'Crookshanks',
          'vet': {'name': 'theVet', 'address': 'Diagon Alley'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'food': 'fish'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        }),
        new Cats.Cat11({
          'id': 2,
          'name': 'Behemoth',
          'vet': {'name': 'Mikhail Bulgakov', 'address': 'Moscow'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'drink': 'pure alcohol'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        })
      ];

      const result = await Cats.Cat11.batchPut(cats);
      should.exist(result);

      const savedCats = await Cats.Cat11.batchGet(cats);
      should.exist(savedCats);
      savedCats.length.should.eql(cats.length);

      const originalExpires = {};
      savedCats.forEach((cat) => {
        cat.array.push({'two': '2'});
        originalExpires[cat.id] = cat.expires;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat11.batchPut(savedCats, {'updateExpires': false});
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat11.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.array.length.should.eql(2);
        cat.expires.should.eql(originalExpires[cat.id]);
      });
    });

    it('Update with updateExpires set to true', async () => {
      const cats = [
        new Cats.Cat11({
          'id': 1,
          'name': 'Crookshanks',
          'vet': {'name': 'theVet', 'address': 'Diagon Alley'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'food': 'fish'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        }),
        new Cats.Cat11({
          'id': 2,
          'name': 'Behemoth',
          'vet': {'name': 'Mikhail Bulgakov', 'address': 'Moscow'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'drink': 'pure alcohol'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        })
      ];

      const result = await Cats.Cat11.batchPut(cats);
      should.exist(result);

      const savedCats = await Cats.Cat11.batchGet(cats);
      should.exist(savedCats);
      savedCats.length.should.eql(cats.length);

      const originalExpires = {};
      savedCats.forEach((cat) => {
        cat.array.push({'two': '2'});
        originalExpires[cat.id] = cat.expires;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result2 = await Cats.Cat11.batchPut(savedCats, {'updateExpires': true});
      should.exist(result2);
      Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

      const updatedCats = await Cats.Cat11.batchGet(cats);
      should.exist(updatedCats);
      updatedCats.length.should.eql(cats.length);
      updatedCats.forEach((cat) => {
        cat.array.length.should.eql(2);
        cat.expires.should.be.greaterThan(originalExpires[cat.id]);
      });
    });

    it('Works with multiple Array globals', async () => {
      const catsUsingOriginalArrayGlobal = [
        new Cats.Cat11({
          'id': 1,
          'name': 'Crookshanks',
          'vet': {'name': 'theVet', 'address': 'Diagon Alley'},
          'ears': [{'name': 'left'}, {'name': 'right'}],
          'legs': ['front right', 'front left', 'back right', 'back left'],
          'more': {'favorites': {'food': 'fish'}},
          'array': [{'one': '1'}],
          'validated': 'valid'
        })
      ];
      const arrayPrototypeClone = {};
      for (const method of Object.getOwnPropertyNames(Array.prototype)) {
        arrayPrototypeClone[method] = Array.prototype[method];
      }
      Object.setPrototypeOf(catsUsingOriginalArrayGlobal, arrayPrototypeClone);

      await Cats.Cat11.batchPut(catsUsingOriginalArrayGlobal);
    });
  });

  describe('Model.batchDelete', () => {
    it('Simple delete', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat({'id': 30 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        Cats.Cat.batchDelete(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cats.Cat.batchGet(cats, (err3, result3) => {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(0);
            done();
          });
        });
      });
    });

    it('Delete with range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 30 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        Cats.Cat2.batchDelete(cats, (err2, result2) => {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cats.Cat2.batchGet(cats, (err3, result3) => {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(0);
            done();
          });
        });
      });
    });

    it('Delete without range key', (done) => {
      const cats = [];

      for (let i = 0; i < 10; i += 1) {
        cats.push(new Cats.Cat2({'ownerId': 30 + i, 'name': `Tom_${i}`}));
      }

      Cats.Cat2.batchPut(cats, (err, result) => {
        should.not.exist(err);
        should.exist(result);

        for (let i = 0; i < 10; i += 1) {
          delete cats[i].name;
        }

        Cats.Cat2.batchDelete(cats, (err2, result2) => {
          should.exist(err2);
          should.not.exist(result2);
          done();
        });
      });
    });


  });

  describe('Model.default', () => {
    it('Default is set properly', () => {
      const cat = new Cats.CatModel({
        'id': 1111,
        'name': 'NAME_VALUE',
        'owner': 'OWNER_VALUE',
        'shouldRemainUnchanged': 'AAA',
        'shouldBeChanged': undefined,
        'shouldAlwaysBeChanged': 'BBB'
      });

      return cat
        .save()
        .then(() => {
          should(cat.shouldRemainUnchanged).eql('AAA');
          should(cat.shouldBeChanged).eql('shouldBeChanged_NAME_VALUE_OWNER_VALUE');
          should(cat.shouldAlwaysBeChanged).eql('shouldAlwaysBeChanged_NAME_VALUE_OWNER_VALUE');
          should(cat.unsetShouldBeChanged).eql('unsetShouldBeChanged_NAME_VALUE_OWNER_VALUE');
          should(cat.unsetShouldAlwaysBeChanged).eql('unsetShouldAlwaysBeChanged_NAME_VALUE_OWNER_VALUE');
        });
    });
  });

  it('Model.getTableReq', () => {
    Cats.Cat.getTableReq().AttributeDefinitions.should.exist;
    Cats.Cat.getTableReq().TableName.should.exist;
    Cats.Cat.getTableReq().TableName.should.equal('test-Cat-db');
    Cats.Cat.getTableReq().KeySchema.should.exist;
    Cats.Cat.getTableReq().ProvisionedThroughput.should.exist;
  });

  it('Should have BillingMode set to PROVISIONED when creating table, and no throughput defined', () => {
    const BillModeSchema1 = new dynamoose.Schema({
      'id': Number,
      'name': String
    });
    const BillModeModel1 = dynamoose.model('BillModeModel1', BillModeSchema1);

    BillModeModel1.getTableReq().BillingMode.should.eql('PROVISIONED');
  });
  it('Should have BillingMode set to PROVISIONED when creating table, and throughput defined', () => {
    const BillModeSchema2 = new dynamoose.Schema({
      'id': Number,
      'name': String
    }, {'throughput': {
      'write': 10,
      'read': 10
    }});
    const BillModeModel2 = dynamoose.model('BillModeModel2', BillModeSchema2);

    BillModeModel2.getTableReq().BillingMode.should.eql('PROVISIONED');
  });

  it('Should have BillingMode set to PAY_PER_REQUEST when creating table, and throughput is ON_DEMAND', () => {
    const BillModeSchema3 = new dynamoose.Schema({
      'id': Number,
      'name': String
    }, {'throughput': 'ON_DEMAND'});
    const BillModeModel3 = dynamoose.model('BillModeModel3', BillModeSchema3, {'create': false});

    BillModeModel3.getTableReq().BillingMode.should.eql('PAY_PER_REQUEST');
  });

  it('Should have correct throughput set when set', () => {
    const BillModeSchema4 = new dynamoose.Schema({
      'id': Number,
      'name': String
    }, {'throughput': {
      'write': 10,
      'read': 10
    }});
    const BillModeModel4 = dynamoose.model('BillModeModel4', BillModeSchema4, {'create': false});

    BillModeModel4.getTableReq().ProvisionedThroughput.ReadCapacityUnits.should.eql(10);
    BillModeModel4.getTableReq().ProvisionedThroughput.WriteCapacityUnits.should.eql(10);
  });

  it('Should not have throughput on Global Secondary Index if Model throughput is ON_DEMAND', () => {
    const BillModeSchema5 = new dynamoose.Schema({
      'id': Number,
      'name': {'type': String, 'index': {'global': true}}
    }, {'throughput': 'ON_DEMAND'});
    const BillModeModel5 = dynamoose.model('BillModeModel5', BillModeSchema5, {'create': false});

    should.not.exist(BillModeModel5.getTableReq().GlobalSecondaryIndexes[0].ProvisionedThroughput);
  });

  it('Should have correct throughput on Global Secondary Index if Model throughput is set', () => {
    const BillModeSchema6 = new dynamoose.Schema({
      'id': Number,
      'name': {'type': String, 'index': {'global': true, 'throughput': {'write': 5, 'read': 5}}}
    }, {'throughput': {
      'write': 10,
      'read': 10
    }});
    const BillModeModel6 = dynamoose.model('BillModeModel6', BillModeSchema6, {'create': false});

    BillModeModel6.getTableReq().GlobalSecondaryIndexes[0].ProvisionedThroughput.ReadCapacityUnits.should.eql(5);
    BillModeModel6.getTableReq().GlobalSecondaryIndexes[0].ProvisionedThroughput.WriteCapacityUnits.should.eql(5);
  });

  it('Should allow for originalItem function on models', (done) => {
    const item = {
      'id': 2222,
      'name': 'NAME_VALUE',
      'owner': 'OWNER_VALUE'
    };

    const cat = new Cats.Cat(item);
    cat.originalItem().should.eql(item);
    cat.save((err, newCat) => {
      newCat.originalItem().should.eql(item);
      newCat.name = 'NAME_VALUE_2';
      newCat.originalItem().should.eql(item);
      newCat.name.should.eql('NAME_VALUE_2');
      Cats.Cat.get(2222, (errB, newCatB) => {
        newCatB.originalItem().should.eql(item);
        newCatB.name = 'NAME_VALUE_2';
        newCatB.originalItem().should.eql(item);
        newCatB.name.should.eql('NAME_VALUE_2');
        done();
      });
    });
  });

  it('Should allow for originalItem on multiple models', (done) => {
    const item1 = {
      'id': 1111,
      'name': 'NAME_VALUE_1',
      'owner': 'OWNER_VALUE_1'
    };

    const item2 = {
      'id': 2222,
      'name': 'NAME_VALUE_2',
      'owner': 'OWNER_VALUE_2'
    };

    const cat1 = new Cats.Cat(item1);
    const cat2 = new Cats.Cat(item2);


    cat1.originalItem().should.eql(item1);
    cat2.originalItem().should.eql(item2);
    cat1.save((err, cat1Read) => {
      cat1Read.originalItem().should.eql(item1);
      cat2.save((err2, cat2Read) => {
        cat2Read.originalItem().should.eql(item2);
        cat1Read.originalItem().should.eql(item1);
        done();
      });
    });
  });

  it('Should store/load binary data safely', (done) => {
    const imageData = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x13, 0xd3, 0x61, 0x60, 0x60]);

    imageData.should.not.eql(Buffer.from(imageData.toString())); // The binary value should not be UTF-8 string for test.


    const item = {
      'id': 3333,
      'name': 'NAME_VALUE',
      'owner': 'OWNER_VALUE',
      'profileImage': imageData
    };

    const cat = new Cats.Cat(item);
    cat.save((err) => {
      should.not.exist(err);
      Cats.Cat.get(3333, (errB, newCatB) => {
        should.not.exist(errB);
        should.exist(newCatB);
        newCatB.should.have.property('profileImage', imageData);
        done();
      });
    });
  });

  describe('Model.transaction', () => {
    it('Model.transaction should exist and be an object', () => {
      should.exist(Cats.Cat.transaction);
      Cats.Cat.transaction.should.be.instanceof(Object);
    });

    describe('Model.transaction.get', () => {
      it('Model.transaction.get should work', (done) => {
        Cats.Cat.transaction.get('1').then((result) => {
          should.exist(result);
          should.exist(result.Get);

          done();
        }).catch(done);
      });
      it('Model.transaction.get should work with options', (done) => {
        Cats.Cat.transaction.get('1', {'consistent': true}).then((result) => {
          should.exist(result);
          should.exist(result.Get);

          result.Get.ConsistentRead.should.be.true;
          done();
        }).catch(done);
      });
    });
    describe('Model.transaction.delete', () => {
      it('Model.transaction.delete should work', (done) => {
        Cats.Cat.transaction.delete('1').then((result) => {
          should.exist(result);
          should.exist(result.Delete);

          done();
        }).catch(done);
      });
      it('Model.transaction.delete should work with options', (done) => {
        Cats.Cat.transaction.delete('1', {'update': true}).then((result) => {
          should.exist(result);
          should.exist(result.Delete);

          result.Delete.ReturnValues.should.eql('ALL_OLD');
          done();
        }).catch(done);
      });
    });
    describe('Model.transaction.create', () => {
      it('Model.transaction.create should work', (done) => {
        Cats.Cat.transaction.create({'id': 1}).then((result) => {
          should.exist(result);
          should.exist(result.Put);

          done();
        }).catch(done);
      });
      it('Model.transaction.create should work with options', (done) => {
        Cats.Cat.transaction.create({'id': 1}, {'overwrite': true}).then((result) => {
          should.exist(result);
          should.exist(result.Put);

          should.not.exist(result.Put.ConditionExpression);
          done();
        }).catch(done);
      });
    });
    describe('Model.transaction.update', () => {
      it('Model.transaction.update should work if combined', (done) => {
        Cats.Cat.transaction.update({'id': 1, 'name': 'Bob'}).then((result) => {
          should.exist(result);
          should.exist(result.Update);
          should.exist(result.Update.TableName);

          done();
        }).catch(done);
      });
      it('Model.transaction.update should work if seperate', (done) => {
        Cats.Cat.transaction.update({'id': 1}, {'name': 'Bob'}).then((result) => {
          should.exist(result);
          should.exist(result.Update);
          should.exist(result.Update.TableName);

          done();
        }).catch(done);
      });
      it('Model.transaction.update should work with options seperate', (done) => {
        Cats.Cat.transaction.update({'id': 1}, {'name': 'Bob'}, {'condition': 'attribute_not_exists(name)'}).then((result) => {
          should.exist(result);
          should.exist(result.Update);
          should.exist(result.Update.TableName);

          result.Update.ConditionExpression.should.equal('attribute_not_exists(name)');
          done();
        }).catch(done);
      });
    });
  });

  describe('Transactions', () => {
    it('Should return correct request object', (done) => {
      dynamoose.transaction([
        Cats.Cat.transaction.create({'id': 10000}),
        Cats.Cat2.transaction.update({'ownerId': 1, 'name': 'Sara'})
      ], {'returnRequest': true}).then((request) => {
        should.exist(request);
        should.exist(request.TransactItems);

        request.should.eql({'TransactItems': [{'Put': {'TableName': 'test-Cat-db', 'Item': {'id': {'N': '10000'}}, 'ConditionExpression': 'attribute_not_exists(id)'}}, {'Update': {'TableName': 'test-Cat2-db', 'Key': {'ownerId': {'N': '1'}, 'name': {'S': 'Sara'}}}}]});

        done();
      }).catch(done);
    });

    it('Should return correct request object when all items are get', (done) => {
      dynamoose.transaction([
        Cats.Cat.transaction.get(10000),
        Cats.Cat4.transaction.get(10000)
      ], {'returnRequest': true}).then((request) => {
        should.exist(request);
        should.exist(request.TransactItems);

        request.should.eql({'TransactItems': [{'Get': {'TableName': 'test-Cat-db', 'Key': {'id': {'N': '10000'}}}}, {'Get': {'TableName': 'test-Cat4-db', 'Key': {'id': {'N': '10000'}}}}]});

        done();
      }).catch(done);
    });

    it('Should return correct request object when setting type to write', (done) => {
      dynamoose.transaction([
        Cats.Cat.transaction.create({'id': 10000}),
        Cats.Cat2.transaction.update({'ownerId': 1, 'name': 'Sara'})
      ], {'returnRequest': true, 'type': 'write'}).then((request) => {
        should.exist(request);
        should.exist(request.TransactItems);

        request.should.eql({'TransactItems': [{'Put': {'TableName': 'test-Cat-db', 'Item': {'id': {'N': '10000'}}, 'ConditionExpression': 'attribute_not_exists(id)'}}, {'Update': {'TableName': 'test-Cat2-db', 'Key': {'ownerId': {'N': '1'}, 'name': {'S': 'Sara'}}}}]});

        done();
      }).catch(done);
    });

    it('Should return correct request object when setting type to get', (done) => {
      dynamoose.transaction([
        Cats.Cat.transaction.create({'id': 10000}),
        Cats.Cat2.transaction.update({'ownerId': 1, 'name': 'Sara'})
      ], {'returnRequest': true, 'type': 'get'}).then((request) => {
        should.exist(request);
        should.exist(request.TransactItems);

        request.should.eql({'TransactItems': [{'Put': {'TableName': 'test-Cat-db', 'Item': {'id': {'N': '10000'}}, 'ConditionExpression': 'attribute_not_exists(id)'}}, {'Update': {'TableName': 'test-Cat2-db', 'Key': {'ownerId': {'N': '1'}, 'name': {'S': 'Sara'}}}}]});

        done();
      }).catch(done);
    });

    it('Should throw if invalid type passed in', (done) => {
      dynamoose.transaction([
        Cats.Cat.transaction.get(10000),
        Cats.Cat4.transaction.get(10000)
      ], {'returnRequest': true, 'type': 'other'}).then(() => {

      }).catch((error) => {
        should.exist(error);
        done();
      });
    });

    it('Should Properly work with read transactions', (done) => {
      Cats.Cat.batchPut([
        new Cats.Cat({'id': '680', 'name': 'Oliver'}),
        new Cats.Cat({'id': '780', 'name': 'Whiskers'})
      ], () => dynamoose.transaction([
        Cats.Cat.transaction.get(680),
        Cats.Cat.transaction.get(780)
      ]).then((result) => {
        should.exist(result);
        result.length.should.equal(2);
        result[0].should.be.instanceof(Cats.Cat);
        result[1].should.be.instanceof(Cats.Cat);
        result[0].id.should.equal(680);
        result[1].id.should.equal(780);

        done();
      }).catch(done));
    });

    it('Should respond with no data', async () => {
      let result;

      try {
        result = await dynamoose.transaction([
          Cats.Cat.transaction.create({'id': 10000}),
          Cats.Cat3.transaction.update({'id': 1, 'name': 'Sara'}),
          Cats.Cat.transaction.delete({'id': 10000})
        ]);
      } catch (e) {
        console.error(e);
      }

      should.not.exist(result);
    });

    it('Should throw if RAW item object passed in, and table doesn\'t exist in Dynamoose', async () => {
      let error;

      try {
        await dynamoose.transaction([
          Cats.Cat.transaction.create({'id': 30000}),
          Cats.Cat3.transaction.update({'id': 1, 'name': 'Sara'}),
          Cats.Cat.transaction.delete({'id': 30000}),
          {
            'Delete': {
              'Key': {
                'id': {
                  'S': 'helloworld'
                }
              },
              'TableName': 'MyOtherTable'
            }
          }
        ]);
      } catch (e) {
        error = e;
      }

      should.exist(error);
      error.message.should.eql('MyOtherTable is not a registered model. You can only use registered Dynamoose models when using a RAW transaction object.');
    });

    it('Should work with conditionCheck', async () => {
      let result;

      try {
        result = await dynamoose.transaction([
          Cats.Cat.transaction.create({'id': 20000}),
          Cats.Cat3.transaction.update({'id': 1, 'name': 'Sara'}),
          Cats.Cat5.transaction.conditionCheck(5, {
            'condition': 'attribute_not_exists(owner)'
          }),
          Cats.Cat.transaction.delete({'id': 20000})
        ]);
      } catch (e) {
        console.error(e);
      }

      should.not.exist(result);
    });
  });
});
