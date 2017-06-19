'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var should = require('should');

var Cat, Cat2, Cat3, Cat4, Cat5, Cat6, Cat7, CatWithOwner, Owner, ExpiringCat;

var ONE_YEAR = 365*24*60*60; // 1 years in seconds
var NINE_YEARS = 9*ONE_YEAR; // 9 years in seconds

describe('Model', function (){
  this.timeout(15000);


  before(function(done) {
    this.timeout(12000);

    dynamoose.setDefaults({ prefix: 'test-' });


    Cat = dynamoose.model('Cat',
    {
      id: {
        type:  Number,
        validate: function (v) { return v > 0; }
      },
      name: String,
      owner: String,
      age: { type: Number },
      vet:{
        name: String,
        address: String
      },
      ears:[{
        name: String
      }],
      legs: [String],
      more: Object,
      array: Array,
      validated: {
        type: String,
        validate: function (v) { return v === 'valid'; }
      }
    },
    {useDocumentTypes: true});

    // Create a model with a range key
    Cat2 = dynamoose.model('Cat2',
    {
      ownerId: {
        type: Number,
        hashKey: true
      },
      name: {
        type: String,
        rangeKey: true
      }
    });

    // Create a model with required attributes
    Cat3 = dynamoose.model('Cat3',
    {
      id: {
        type:  Number,
        validate: function (v) { return v > 0; },
        default: 888
      },
      name: {
        type: String,
        required: true,
        default: 'Mittens'
      },
      owner: String,
      age: {
        type: Number,
        required: true
      }
    });

    // Create a model with timestamps
    Cat4 = dynamoose.model('Cat4',
    {
      id: {
        type:  Number,
        validate: function (v) { return v > 0; }
      },
      name: {
        type: String,
        default: 'Bobo'
      }
    },
    {
      timestamps: {
        createdAt: 'myLittleCreatedAt',
        updatedAt: 'myLittleUpdatedAt'
      }
    });

    // Create a model with unnamed attributes
    Cat5 = dynamoose.model('Cat5',
      {
        id: {
          type:  Number,
          validate: function (v) { return v > 0; },
          default: 888
        },
        name: {
          type: String,
          required: true,
          default: 'Mittens'
        },
        owner: String,
      },
      {
        saveUnknown: true
      });

    Cat6 = dynamoose.model('Cat6',
      {
        id: {
          type:  Number
        },
        name: {
          type: String
        },
        parent: Number
      }
    );

    Cat7 = dynamoose.model('Cat7',
      {
        id: {
          type:  Number,
          hashKey: true
        },
        name: {
          type: String
        },
        parent: Number
      }
    );

    CatWithOwner = dynamoose.model('CatWithOwner',
      {
        id: {
          type:  Number
        },
        name: {
          type: String
        },
        owner: {
          name: String,
          address: String
        }
      }
    );

    Owner = dynamoose.model('Owner',
      {
        name: {
          type: String,
          hashKey: true
        },
        address: {
          type: String,
          rangeKey: true
        },
        phoneNumber: String
      }
    );

    ExpiringCat = dynamoose.model('ExpiringCat',
      {
        name: String
      },
      {
        expires: NINE_YEARS
      }
    );
    done();
  });

  after(function (done) {

    delete dynamoose.models['test-Cat'];
    done();
  });

  it('Create simple model', function (done) {
    this.timeout(12000);


    Cat.should.have.property('$__');

    Cat.$__.name.should.eql('test-Cat');
    Cat.$__.options.should.have.property('create', true);

    var schema = Cat.$__.schema;

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

    var kitten = new Cat(
      {
        id: 1,
        name: 'Fluffy',
        vet:{name:'theVet', address:'12 somewhere'},
        ears:[{name:'left'}, {name:'right'}],
        legs: ['front right', 'front left', 'back right', 'back left'],
        more: {fovorites: {food: 'fish'}},
        array: [{one: '1'}],
        validated: 'valid'
      }
    );

    kitten.id.should.eql(1);
    kitten.name.should.eql('Fluffy');

    var dynamoObj = schema.toDynamo(kitten);

    dynamoObj.should.eql(
      {
        ears: {
          L: [
            { M: { name: { S: 'left' } } },
            { M: { name: { S: 'right' } } }
          ]
        },
        id: { N: '1' },
        name: { S: 'Fluffy' },
        vet: { M: { address: { S: '12 somewhere' }, name: { S: 'theVet' } } },
        legs: { SS: ['front right', 'front left', 'back right', 'back left']},
        more: { S: '{"fovorites":{"food":"fish"}}' },
        array: { S: '[{"one":"1"}]' },
        validated: { S: 'valid' }
      });

    kitten.save(done);


  });

  it('Create simple model with range key', function () {


    Cat2.should.have.property('$__');

    Cat2.$__.name.should.eql('test-Cat2');
    Cat2.$__.options.should.have.property('create', true);

    var schema = Cat2.$__.schema;

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

  it('Create simple model with unnamed attributes', function (done) {


    this.timeout(12000);


    Cat5.should.have.property('$__');

    Cat5.$__.name.should.eql('test-Cat5');
    Cat5.$__.options.should.have.property('saveUnknown', true);

    var schema = Cat5.$__.schema;

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

    var kitten = new Cat5(
      {
        id: 2,
        name: 'Fluffy',
        owner: 'Someone',
        unnamedInt: 1,
        unnamedString: 'unnamed',
      }
    );

    kitten.id.should.eql(2);
    kitten.name.should.eql('Fluffy');

    var dynamoObj = schema.toDynamo(kitten);

    dynamoObj.should.eql(
      {
        id: { N: '2' },
        name: { S: 'Fluffy' },
        owner: { S: 'Someone' },
        unnamedInt: { N: '1' },
        unnamedString: { S: 'unnamed' },
      });

    kitten.save(done);

  });

  it('Get item for model with unnamed attributes', function (done) {

    Cat5.get(2, function(err, model) {
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

  it('Get item for model', function (done) {

    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.should.have.property('id', 1);
      model.should.have.property('name', 'Fluffy');
      model.should.have.property('vet', { address: '12 somewhere', name: 'theVet' });
      model.should.have.property('$__');
      done();
    });
  });

  it('Get item with invalid key', function (done) {

    Cat.get(0, function(err, model) {
      should.exist(err);
      err.name.should.equal('ValidationError');
      should.not.exist(model);
      done();
    });
  });

  it('Save existing item', function (done) {

    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Fluffy');

      model.name = 'Bad Cat';
      model.vet.name = 'Tough Vet';
      model.ears[0].name = 'right';

      model.save(function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Bad Cat');
          badCat.vet.name.should.eql('Tough Vet');
          badCat.ears[0].name.should.eql('right');
          badCat.ears[1].name.should.eql('right');
          done();
        });
      });
    });
  });

  it('Save existing item with a false condition', function (done) {
    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        condition: '#name = :name',
        conditionNames: { name: 'name' },
        conditionValues: { name: 'Muffin' }
      }, function (err) {
        should.exist(err);
        err.code.should.eql('ConditionalCheckFailedException');

        Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Bad Cat');
          done();
        });
      });
    });
  });

  it('Save existing item with a true condition', function (done) {
    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        condition: '#name = :name',
        conditionNames: { name: 'name' },
        conditionValues: { name: 'Bad Cat' }
      }, function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function(err, whiskers) {
          should.not.exist(err);
          whiskers.name.should.eql('Whiskers');
          done();
        });
      });
    });
  });

  it('Save with a pre hook', function (done) {
    var flag = false;
    Cat.pre('save', function (next) {
      flag = true;
      next();
    });

    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Whiskers');

      model.name = 'Fluffy';
      model.vet.name = 'Nice Guy';
      model.save(function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Fluffy');
          badCat.vet.name.should.eql('Nice Guy');
          flag.should.be.true;

          Cat.removePre('save');
          done();
        });
      });
    });
  });

  it('Save existing item with an invalid attribute', function (done) {
    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.validated = 'bad';
      model.save().catch(function(err) {
        should.exist(err);
        err.name.should.equal('ValidationError');
        Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Fluffy');
          badCat.vet.name.should.eql('Nice Guy');
          badCat.ears[0].name.should.eql('right');
          badCat.ears[1].name.should.eql('right');
          done();
        });
      });
    });
  });

  it('Deletes item', function (done) {

    var cat = new Cat({id: 1});

    cat.delete(done);
  });

  it('Deletes item with invalid key', function (done) {

    var cat = new Cat({id: 0});

    cat.delete(function(err) {
      should.exist(err);
      err.name.should.equal('ValidationError');
      done();
    });
  });

  it('Get missing item', function (done) {


    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.not.exist(model);
      done();
    });
  });

  it('Static Creates new item', function (done) {
    Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
      should.not.exist(err);
      should.exist(garfield);
      garfield.id.should.eql(666);
      done();
    });
  });

  it('Static Creates new item with range key', function (done) {
    Cat2.create({ownerId: 666, name: 'Garfield'}, function (err, garfield) {
      should.not.exist(err);
      should.exist(garfield);
      garfield.ownerId.should.eql(666);
      done();
    });
  });

  it('Prevent duplicate create', function (done) {
    Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
      should.exist(err);
      should.not.exist(garfield);
      done();
    });
  });

  it('Prevent duplicate create with range key', function (done) {
    Cat2.create({ownerId: 666, name: 'Garfield'}, function (err, garfield) {
      should.exist(err);
      should.not.exist(garfield);
      done();
    });
  });

  it('Static Creates second item', function (done) {
    Cat.create({id: 777, name: 'Catbert'}, function (err, catbert) {
      should.not.exist(err);
      should.exist(catbert);
      catbert.id.should.eql(777);
      done();
    });
  });

  it('BatchGet items', function (done) {
    Cat.batchGet([{id: 666}, {id: 777}], function (err, cats) {
      cats.length.should.eql(2);
      done();
    });
  });

  it('Static Delete', function (done) {
    Cat.delete(666, function (err) {
      should.not.exist(err);
      Cat.get(666, function (err, delCat) {
        should.not.exist(err);
        should.not.exist(delCat);

        Cat.delete(777, done);
      });
    });
  });

  it('Static Delete with range key', function (done) {
    Cat2.delete({ ownerId: 666, name: 'Garfield' }, function (err) {
      should.not.exist(err);
      Cat2.get({ ownerId: 666, name: 'Garfield' }, function (err, delCat) {
        should.not.exist(err);
        should.not.exist(delCat);
        done();
      });
    });
  });

  it('Static Creates new item', function (done) {
    Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
      should.not.exist(err);
      should.exist(garfield);
      garfield.id.should.eql(666);
      done();
    });
  });

  it('Static Delete with update', function (done) {
    Cat.delete(666, { update: true }, function (err, data) {
      should.not.exist(err);
      should.exist(data);
      data.id.should.eql(666);
      data.name.should.eql('Garfield');
      Cat.get(666, function (err, delCat) {
        should.not.exist(err);
        should.not.exist(delCat);
        done();
      });
    });
  });

  it('Static Delete with update failure', function (done) {
    Cat.delete(666, { update: true }, function (err) {
      should.exist(err);
      err.statusCode.should.eql(400);
      err.code.should.eql('ConditionalCheckFailedException');
      done();
    });
  });


  describe('Model.update', function (){
    before(function (done) {
      var stray = new Cat({id: 999, name: 'Tom'});
      stray.save(done);
    });

    it('False condition', function (done) {
      Cat.update({id: 999}, {name: 'Oliver'}, {
        condition: '#name = :name',
        conditionNames: { name: 'name' },
        conditionValues: { name: 'Muffin' }
      }, function (err) {
        should.exist(err);
        Cat.get(999, function (err, tomcat) {
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          should.not.exist(tomcat.age);
          done();
        });
      });
    });

    it('True condition', function (done) {
      Cat.update({id: 999}, {name: 'Oliver'}, {
        condition: '#name = :name',
        conditionNames: { name: 'name' },
        conditionValues: { name: 'Tom' }
      }, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Oliver');
        Cat.get(999, function (err, oliver) {
          should.not.exist(err);
          should.exist(oliver);
          oliver.id.should.eql(999);
          oliver.name.should.eql('Oliver');
          should.not.exist(oliver.owner);
          should.not.exist(oliver.age);
          done();
        });
      });
    });

    it("If key is null or undefined, will use defaults", function (done) {
      Cat3.update(null, {age: 3, name: 'Furrgie'}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(888);
        data.name.should.equal('Furrgie');
        data.age.should.equal(3);

        Cat3.get(888, function (err, furrgie) {
          should.not.exist(err);
          should.exist(furrgie);
          furrgie.id.should.eql(888);
          furrgie.name.should.eql('Furrgie');
          data.age.should.equal(3);

          Cat3.update(undefined, {age: 4}, function (err, data) {
            should.not.exist(err);
            should.exist(data);
            data.id.should.eql(888);
            data.name.should.equal('Furrgie');
            data.age.should.equal(4);

            Cat3.get(888, function (err, furrgie) {
              should.not.exist(err);
              should.exist(furrgie);
              furrgie.id.should.eql(888);
              furrgie.name.should.eql('Furrgie');
              should.not.exist(furrgie.owner);
              data.age.should.equal(4);
              done();
            });
          });
        });
      });
    });

    it("If key is null or undefined and default isn't provided, will throw an error", function (done) {
      Cat.update(null, {name: 'Oliver'}, function (err, data) {
        should.not.exist(data);
        should.exist(err);
        done();
      });
    });

    it("If key is a value, will search by that value", function (done) {
      Cat3.update(888, {age: 5}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(888);
        data.name.should.equal('Furrgie');
        data.age.should.equal(5);

        Cat3.get(888, function (err, furrgie) {
          should.not.exist(err);
          should.exist(furrgie);
          furrgie.id.should.eql(888);
          furrgie.name.should.eql('Furrgie');
          data.age.should.equal(5);
          done();
        });
      });
    });

    it("Creates an item with required attributes' defaults if createRequired is true", function (done) {
      Cat3.update({id: 25}, {age: 3}, {createRequired: true}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(25);
        data.name.should.equal('Mittens');
        data.age.should.equal(3);
        Cat3.get(25, function (err, mittens) {
          should.not.exist(err);
          should.exist(mittens);
          mittens.id.should.eql(25);
          mittens.name.should.eql('Mittens');
          should.not.exist(mittens.owner);
          data.age.should.equal(3);
          done();
        });
      });
    });

    it("Throws an error when a required attribute has no default and has not been specified in the update if createRequired is true", function (done) {
      Cat3.update({id: 25}, {name: 'Rufflestiltskins'}, {createRequired: true}, function (err, data) {
        should.not.exist(data);
        should.exist(err);
        Cat3.get(25, function (err, mittens) {
          should.not.exist(err);
          should.exist(mittens);
          mittens.id.should.eql(25);
          mittens.name.should.eql('Mittens');
          done();
        });
      });
    });

    it('Adds required attributes, even when not specified, if createRequired is true', function (done) {
      Cat3.update({id: 45}, {age: 4}, {createRequired: true}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(45);
        data.name.should.equal('Mittens');
        data.age.should.equal(4);
        Cat3.get(45, function (err, mittens) {
          should.not.exist(err);
          should.exist(mittens);
          mittens.id.should.eql(45);
          mittens.name.should.eql('Mittens');
          should.not.exist(mittens.owner);
          data.age.should.equal(4);
          done();
        });
      });
    });

    it('Does not add required attributes if createRequired is false', function (done) {
      Cat3.update({id: 24}, {name: 'Cat-rina'}, {createRequired: false}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(24);
        data.name.should.equal('Cat-rina');
        should.not.exist(data.age);
        Cat3.get(24, function (err, mittens) {
          should.not.exist(err);
          should.exist(mittens);
          mittens.id.should.eql(24);
          data.name.should.equal('Cat-rina');
          should.not.exist(data.age);
          should.not.exist(mittens.owner);
          done();
        });
      });
    });

    it('If item did not exist and timestamps are desired, createdAt and updatedAt will both be filled in', function (done) {
      // try a delete beforehand in case the test is run more than once
      Cat4.delete({id: 22}, function () {
        Cat4.update({id: 22}, {name: 'Twinkles'}, function (err, data) {
          should.not.exist(err);
          should.exist(data);
          should.exist(data.myLittleCreatedAt);
          should.exist(data.myLittleUpdatedAt);
          data.id.should.eql(22);
          data.name.should.equal('Twinkles');

          Cat4.get(22, function (err, twinkles) {
            should.not.exist(err);
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

    it('UpdatedAt will be updated ', function (done) {
      // try a delete beforehand in case the test is run more than once
      Cat4.delete({id: 22}, function () {
        Cat4.update({id: 22}, {name: 'Twinkles'}, function (err, data) {
          should.not.exist(err);
          should.exist(data);
          data.id.should.eql(22);
          data.name.should.equal('Twinkles');
          should.exist(data.myLittleCreatedAt);
          should.exist(data.myLittleUpdatedAt);

          // now do another update
          Cat4.update({id: 22}, {name: 'Furr-nando'}, function (err, data) {
            should.not.exist(err);
            should.exist(data);
            data.id.should.eql(22);
            data.name.should.equal('Furr-nando');
            data.myLittleUpdatedAt.getTime().should.be.above(data.myLittleCreatedAt.getTime());
            Cat4.get(22, function (err, furrnando) {
              should.not.exist(err);
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

    it('Set expires attribute on save', function (done) {
      ExpiringCat.create({name: 'Fluffy'})
      .then(function (fluffy) {
        var max = Math.floor(Date.now() / 1000) + NINE_YEARS;
        var min = max - 1;
        should.exist(fluffy);
        should.exist(fluffy.expires);
        should.exist(fluffy.expires.getTime);

        var expiresInSec = Math.floor(fluffy.expires.getTime() / 1000);
        expiresInSec.should.be.within(min, max);
        done();
      })
      .catch(done);

    });

    it('Does not set expires attribute on save if exists', function (done) {
      ExpiringCat.create({
        name: 'Tigger',
        expires: new Date(Date.now() + (ONE_YEAR*1000))
      })
      .then(function (tigger) {
        var max = Math.floor(Date.now() / 1000) + ONE_YEAR;
        var min = max - 1;
        should.exist(tigger);
        should.exist(tigger.expires);
        should.exist(tigger.expires.getTime);

        var expiresInSec = Math.floor(tigger.expires.getTime() / 1000);
        expiresInSec.should.be.within(min, max);
        done();
      })
      .catch(done);

    });

    it('Update expires attribute on save', function (done) {
      ExpiringCat.create({
        name: 'Leo'
      })
      .then(function (leo) {
        var max = Math.floor(Date.now() / 1000) + NINE_YEARS;
        var min = max - 1;
        var expiresInSec = Math.floor(leo.expires.getTime() / 1000);
        expiresInSec.should.be.within(min, max);

        leo.expires = new Date(Date.now() + (ONE_YEAR* 1000));
        return leo.save();
      })
      .then(function (leo) {
        var max = Math.floor(Date.now() / 1000) + ONE_YEAR;
        var min = max - 1;
        var expiresInSec = Math.floor(leo.expires.getTime() / 1000);
        expiresInSec.should.be.within(min, max);
        done();
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

    it('Default puts attribute', function (done) {
      Cat.update({id: 999}, {name: 'Tom'}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Tom');
        Cat.get(999, function (err, tomcat){
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          should.not.exist(tomcat.age);
          done();
        });
      });
    });

    it('Manual puts attribute with removal', function (done) {
      Cat.update({id: 999}, {$PUT: {name: null}}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        should.not.exist(data.name);
        Cat.get(999, function (err, tomcat){
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          should.not.exist(tomcat.name);
          done();
        });
      });
    });

    it('Manual puts attribute', function (done) {
      Cat.update({id: 999}, {$PUT: {name: 'Tom', owner: 'Jerry', age: 3}}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.owner.should.equal('Jerry');
        Cat.get(999, function (err, tomcat){
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          tomcat.owner.should.eql('Jerry');
          tomcat.age.should.eql(3);
          done();
        });
      });
    });

    it('Add attribute', function (done) {
      Cat.update({id: 999}, {$ADD: {age: 1}}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.age.should.equal(4);
        Cat.get(999, function (err, tomcat){
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          tomcat.owner.should.eql('Jerry');
          tomcat.age.should.eql(4);
          done();
        });
      });
    });

    it('Delete attribute', function (done) {
      Cat.update({id: 999}, {$DELETE: {owner: null}}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        should.not.exist(data.owner);
        Cat.get(999, function (err, tomcat){
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          should.not.exist(tomcat.owner);
          tomcat.age.should.eql(4);
          done();
        });
      });
    });

    it('With invalid attribute', function (done) {
      Cat.update({id: 999}, {name: 'Oliver', validated: 'bad'}, function (err, data) {
        should.exist(err);
        should.not.exist(data);
        err.name.should.equal('ValidationError');
        Cat.get(999, function (err, tomcat) {
          should.not.exist(err);
          should.exist(tomcat);
          tomcat.id.should.eql(999);
          tomcat.name.should.eql('Tom');
          done();
        });
      });
    });
  });

  describe('Model.populate', function (){
    before(function (done) {
      var kittenWithParents = new Cat6({id: 1, name: 'One'});
      var owner = new Owner({name: 'Owner', address: '123 A Street', phoneNumber: '2345551212'});
      var kittenWithOwner = new CatWithOwner({
        id: 100,
        name: 'Owned',
        owner: {name: owner.name, address: owner.address}
      });
      kittenWithParents.save()
        .then(function(kitten) {
          var kittenWithParents = new Cat6({id: 2, name: 'Two', parent: kitten.id});
          return kittenWithParents.save();
        })
        .then(function(kitten) {
          var kittenWithParents = new Cat6({id: 3, name: 'Three', parent: kitten.id});
          return kittenWithParents.save();
        })
        .then(function(kitten) {
          var kittenWithParents = new Cat6({id: 4, name: 'Four', parent: kitten.id});
          return kittenWithParents.save();
        })
        .then(function() {
          var kittenWithParents = new Cat6({id: 5, name: 'Five', parent: 999});
          return kittenWithParents.save();
        })
        .then(function() {
          var kittenWithParents = new Cat7({id: 1, name: 'One'});
          return kittenWithParents.save();
        })
        .then(function(kitten) {
          var kittenWithParents = new Cat7({id: 2, name: 'Two', parent: kitten.id});
          return kittenWithParents.save();
        })
        .then(function() {
          return owner.save();
        })
        .then(function() {
          kittenWithOwner.save(done);
        });
    });

    it('Should populate with one parent', function (done) {
      Cat6.get(4)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'Cat6'
          });
        })
        .then(function(cat) {
          should.exist(cat.parent);
          cat.parent.id.should.eql(3);
          cat.parent.name.should.eql('Three');
          done();
        });
    });

    it('Should deep populate with mutiple parent', function (done) {
      Cat6.get(4)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'Cat6',
            populate: {
              path: 'parent',
              model: 'Cat6',
              populate: {
                path: 'parent',
                model: 'Cat6'
              }
            }
          });
        })
        .then(function(cat) {
          should.exist(cat.parent);
          var parent = cat.parent;
          parent.id.should.eql(3);
          parent.name.should.eql('Three');
          parent = parent.parent;
          parent.id.should.eql(2);
          parent.name.should.eql('Two');
          parent = parent.parent;
          parent.id.should.eql(1);
          parent.name.should.eql('One');
          done();
        });
    });


    it('Should populate with range & hash key', function (done) {
      CatWithOwner.get(100)
        .then(function(cat) {
          should.not.exist(cat.owner.phoneNumber);
          return cat.populate({
            path: 'owner',
            model: 'test-Owner'
          });
        })
        .then(function(cat) {
          should.exist(cat.owner);
          cat.owner.name.should.eql('Owner');
          cat.owner.phoneNumber.should.eql('2345551212');
          done();
        });
    });

    it('Populating without the model definition', function (done) {
      Cat6.get(4)
        .then(function(cat) {
          return cat.populate({
            path: 'parent'
          });
        })
        .catch(function(err){
          should.exist(err.message);
          done();
        });
    });

    it('Populating without the path definition', function (done) {
      Cat6.get(4)
        .then(function(cat) {
          return cat.populate({
            model: 'Cat6'
          });
        })
        .catch(function(err){
          should.exist(err.message);
          done();
        });
    });

    it('Populating with the wrong reference id', function (done) {
      Cat6.get(5)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'Cat6'
          });
        })
        .catch(function(err){
          should.exist(err.message);
          done();
        });
    });

    it('Populate works with hashkey', function (done) {
      Cat7.get(2)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'Cat7'
          });
        })
        .then(function(cat) {
          should.exist(cat.parent);
          cat.parent.id.should.eql(1);
          cat.parent.name.should.eql('One');
          done();
        });
    });

    it('Populate works with prefix', function (done) {
      Cat6.get(4)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'test-Cat6'
          });
        })
        .then(function(cat) {
          should.exist(cat.parent);
          cat.parent.id.should.eql(3);
          cat.parent.name.should.eql('Three');
          done();
        });
    });

    it('Populating with the wrong model name won\'t work', function (done) {
      Cat6.get(5)
        .then(function(cat) {
          return cat.populate({
            path: 'parent',
            model: 'Cats6'
          });
        })
        .then(function(teste, err) {
          console.log(teste, err);
        })
        .catch(function(err){
          should.exist(err.message);
          done();
        });
    });

  });

  describe('Model.batchPut', function (){

    it('Put new', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat({id: 10+i, name: 'Tom_'+i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (var i=0 ; i<10 ; ++i) {

          delete cats[i].name;
        }

        Cat.batchGet(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put lots of new items', function (done) {
      var cats = [];

      for (var i=0 ; i<100 ; ++i) {
        cats.push(new Cat({id: 100+i, name: 'Tom_'+i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (var i=0 ; i<100 ; ++i) {
          delete cats[i].name;
        }

        Cat.batchGet(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put new with range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 10+i, name: 'Tom_'+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        Cat2.batchGet(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          result2.length.should.eql(cats.length);
          done();
        });
      });
    });

    it('Put new without range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 10+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.exist(err);
        should.not.exist(result);
        done();
      });
    });

    it('Update items', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat({id: 20+i, name: 'Tom_'+i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i=0 ; i<10 ; ++i) {
          var cat = cats[i];
          cat.name = 'John_' + (cat.id + 100);
        }

        Cat.batchPut(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          for (var i=0 ; i<10 ; ++i) {
            delete cats[i].name;
          }

          Cat.batchGet(cats, function (err3, result3) {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(cats.length);
            done();
          });
        });
      });
    });

    it('Update with range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 20+i, name: 'Tom_'+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i=0 ; i<10 ; ++i) {
          var cat = cats[i];
          cat.name = 'John_' + (cat.ownerId + 100);
        }

        Cat2.batchPut(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cat2.batchGet(cats, function (err3, result3) {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(cats.length);
            done();
          });
        });
      });
    });

    it('Update without range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 20+i, name: 'Tom_'+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i=0 ; i<10 ; ++i) {
          cats[i].name = null;
        }

        Cat2.batchPut(cats, function (err2, result2) {
          should.exist(err2);
          should.not.exist(result2);
          done();
        });
      });
    });
  });

  describe('Model.batchDelete', function (){
    it('Simple delete', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat({id: 30+i, name: 'Tom_'+i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        Cat.batchDelete(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cat.batchGet(cats, function (err3, result3) {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(0);
            done();
          });
        });
      });
    });

    it('Delete with range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 30+i, name: 'Tom_'+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        Cat2.batchDelete(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          Cat2.batchGet(cats, function (err3, result3) {
            should.not.exist(err3);
            should.exist(result3);
            result3.length.should.eql(0);
            done();
          });
        });
      });
    });

    it('Delete without range key', function (done) {
      var cats = [];

      for (var i=0 ; i<10 ; ++i) {
        cats.push(new Cat2({ownerId: 30+i, name: 'Tom_'+i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i=0 ; i<10 ; ++i) {
          delete cats[i].name;
        }

        Cat2.batchDelete(cats, function (err2, result2) {
          should.exist(err2);
          should.not.exist(result2);
          done();
        });
      });
    });

  });

  describe('Model.default', function() {
    it('Default is set properly', function() {
      var CatModel = dynamoose.model('CatDefault',
          {
              id: {
                  type:  Number,
                  validate: function (v) { return v > 0; }
              },
              name: String,
              owner: String,
              shouldRemainUnchanged: {
                  type: String,
                  default: function(model) {
                      return 'shouldRemainUnchanged_'+ model.name +'_'+ model.owner;
                  }
              },
              shouldBeChanged: {
                  type: String,
                  default: function(model) {
                      return 'shouldBeChanged_'+ model.name +'_'+ model.owner;
                  }
              },
              shouldAlwaysBeChanged: {
                  type: String,
                  default: function(model) {
                      return 'shouldAlwaysBeChanged_'+ model.name +'_'+ model.owner;
                  },
                  forceDefault: true
              },
              unsetShouldBeChanged: {
                  type: String,
                  default: function(model) {
                      return 'unsetShouldBeChanged_'+ model.name +'_'+ model.owner;
                  }
              },
              unsetShouldAlwaysBeChanged: {
                  type: String,
                  default: function(model) {
                      return 'unsetShouldAlwaysBeChanged_'+ model.name +'_'+ model.owner;
                  }
              }
          }
      );

      var cat = new CatModel({
          id: 1111,
          name: 'NAME_VALUE',
          owner: 'OWNER_VALUE',
          shouldRemainUnchanged: 'AAA',
          shouldBeChanged: undefined,
          shouldAlwaysBeChanged: 'BBB'
      });

      return cat
        .save()
        .then(function() {
            should(cat.shouldRemainUnchanged).eql('AAA');
            should(cat.shouldBeChanged).eql('shouldBeChanged_NAME_VALUE_OWNER_VALUE');
            should(cat.shouldAlwaysBeChanged).eql('shouldAlwaysBeChanged_NAME_VALUE_OWNER_VALUE');
            should(cat.unsetShouldBeChanged).eql('unsetShouldBeChanged_NAME_VALUE_OWNER_VALUE');
            should(cat.unsetShouldAlwaysBeChanged).eql('unsetShouldAlwaysBeChanged_NAME_VALUE_OWNER_VALUE');
        });
    });
  });
});
