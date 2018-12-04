'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var should = require('should');
var CatsFixture = require('./fixtures/Cats');

var Cats = {};

var ONE_YEAR = 365*24*60*60; // 1 years in seconds
var NINE_YEARS = 9*ONE_YEAR; // 9 years in seconds

describe('Model', function (){
  this.timeout(15000);
  before(function(done) {
    this.timeout(12000);
    dynamoose.setDefaults({ prefix: 'test-', suffix: '-db' });
    Cats = CatsFixture(dynamoose);
    done();
  });

  after(function (done) {

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

    var schema = Cats.Cat.$__.schema;

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

    var kitten = new Cats.Cat(
      {
        id: 1,
        name: 'Fluffy',
        vet:{name:'theVet', address:'12 somewhere'},
        ears:[{name:'left'}, {name:'right'}],
        legs: ['front right', 'front left', 'back right', 'back left'],
        more: {favorites: {food: 'fish'}},
        array: [{one: '1'}],
        validated: 'valid'
      }
    );

    kitten.id.should.eql(1);
    kitten.name.should.eql('Fluffy');

    var dynamoObj = await schema.toDynamo(kitten);

    dynamoObj.should.eql({
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
      more: { S: '{"favorites":{"food":"fish"}}' },
      array: { S: '[{"one":"1"}]' },
      validated: { S: 'valid' }
    });

    await kitten.save();

  });

  it('Should support async validate', async function () {
    this.timeout(12000);

    const Wolf1 = dynamoose.model('Wolf1', new dynamoose.Schema({
      id: Number,
      name: {
        type: String,
        validate: function (val) {
          return new Promise(function(resolve, reject) {
            setTimeout(() => resolve(val.length >= 5), 1000);
          });
        }
      }
    }));

    let error;
    try {
      await Wolf1.create({id: 1, name: "Rob"});
    } catch (e) {
      error = e;
    }
    should.exist(error);
    error = null;

    try {
      await Wolf1.create({id: 2, name: "Smith"});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
  });

  it('Should support async validate with async function', async function () {
    this.timeout(12000);

    const Wolf2 = dynamoose.model('Wolf2', new dynamoose.Schema({
      id: Number,
      name: {
        type: String,
        validate: {
          isAsync: true,
          validator: function (val, model, cb) {
            setTimeout(() => cb(val.length >= 5), 1000);
          }
        }
      }
    }));

    let error;
    try {
      await Wolf2.create({id: 1, name: "Rob"});
    } catch (e) {
      error = e;
    }
    should.exist(error);
    error = null;

    try {
      await Wolf2.create({id: 2, name: "Smith"});
    } catch (e) {
      error = e;
    }
    should.not.exist(error);
  });

    it('Create simple model with range key', function () {

      Cats.Cat2.should.have.property('name');
      // Older node doesn't support Function.name changes
      if (Object.getOwnPropertyDescriptor(Function, 'name').configurable) {
        Cats.Cat2.name.should.eql('Model-test-Cat2-db');
      }

      Cats.Cat2.should.have.property('$__');

      Cats.Cat2.$__.name.should.eql('test-Cat2-db');
      Cats.Cat2.$__.options.should.have.property('create', true);

      var schema = Cats.Cat2.$__.schema;

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

      var schema = Cats.Cat5.$__.schema;

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

      var kitten = new Cats.Cat5(
        {
          id: 2,
          name: 'Fluffy',
          owner: 'Someone',
          unnamedInt: 1,
          unnamedInt0: 0,
          unnamedBooleanFalse: false,
          unnamedBooleanTrue: true,
          unnamedString: 'unnamed',

          // Attributes with empty values. DynamoDB won't store empty values
          // so the return value of toDynamo() should exclude these attributes.
          unnamedUndefined: undefined,
          unnamedNull: null,
          unnamedEmptyString: '',
          unnamedNumberNaN: NaN,
        }
      );

      kitten.id.should.eql(2);
      kitten.name.should.eql('Fluffy');

      var dynamoObj = await schema.toDynamo(kitten);

      dynamoObj.should.eql({
        id: { N: '2' },
        name: { S: 'Fluffy' },
        owner: { S: 'Someone' },
        unnamedInt: { N: '1' },
        unnamedInt0: { N: '0' },
        unnamedBooleanFalse: { BOOL: false },
        unnamedBooleanTrue: { BOOL: true },
        unnamedString: { S: 'unnamed' },
      });

      await kitten.save();

    });

    it('Create returnRequest option', function (done) {
      Cats.ExpiringCat.create({
        name: 'Leo'
      }, {returnRequest: true})
      .then(function (request) {
        request.should.exist;

        request.TableName.should.eql("test-ExpiringCat-db");
        request.Item.name.should.eql({S: "Leo"});
        done();
      })
      .catch(done);
    });

      it('Should support useDocumentTypes and useNativeBooleans being false', function(done) {
      	this.timeout(12000);

      	var kitten = new Cats.Cat10({
      		id: 2,
      		isHappy: true,
      		parents: ["Max", "Leah"],
      		details: {
      			playful: true,
      			thirsty: false,
      			tired: false
      		}
      	});

      	kitten.id.should.eql(2);
      	kitten.isHappy.should.eql(true);
      	kitten.parents.should.eql(["Max", "Leah"]);
      	kitten.details.should.eql({
      		playful: true,
      		thirsty: false,
      		tired: false
      	});

      	kitten.save(function(err, kitten) {
      		kitten.id.should.eql(2);
      		kitten.isHappy.should.eql(true);
      		kitten.parents.should.eql(["Max", "Leah"]);
      		kitten.details.should.eql({
      			playful: true,
      			thirsty: false,
      			tired: false
      		});

      		Cats.Cat10.get(2, function(err, kitten) {
      			kitten.id.should.eql(2);
      			kitten.isHappy.should.eql(true);
      			kitten.parents.should.eql(["Max", "Leah"]);
      			kitten.details.should.eql({
      				playful: true,
      				thirsty: false,
      				tired: false
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

        var schema = Cats.Cat1.$__.schema;

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

        var kitten = new Cats.Cat1(
          {
            id: 2,
            name: 'Fluffy',
            owner: 'Someone',
            children: {
              "mittens" : {
                name : "mittens",
                age: 1
              },
              "puddles" : {
                name : "puddles",
                age: 2
              }
            },
            characteristics: ['cute', 'fuzzy']
          }
        );

        kitten.id.should.eql(2);
        kitten.name.should.eql('Fluffy');

        var dynamoObj = await schema.toDynamo(kitten);

        dynamoObj.should.eql({
          id: {N: '2'},
          name: {S: 'Fluffy'},
          owner: {S: 'Someone'},
          children: {
            M: {
              "mittens": {M: {"name": {S: "mittens"}, "age": {N: '1'}}},
              "puddles": {M: {"name": {S: "puddles"}, "age": {N: '2'}}}
            }
          },
          characteristics: {L: [{S: 'cute'}, {S: 'fuzzy'}]}
        });

        await kitten.save();

      });

        it('Get item for model with unnamed attributes', function (done) {

          Cats.Cat5.get(2, function(err, model) {
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

          Cats.Cat.get(1, function(err, model) {
            should.not.exist(err);
            should.exist(model);

            model.should.have.property('id', 1);
            model.should.have.property('name', 'Fluffy');
            model.should.have.property('vet', { address: '12 somewhere', name: 'theVet' });
            model.should.have.property('$__');
            done();
          });
        });

        it('Get item for model with falsy keys', function (done) {
          Cats.Cat8.create({id: 0, age: 0})
          .then(function () {
            return Cats.Cat8.get({id: 0, age: 0});
          })
          .then(function (falsyCat) {
            falsyCat.should.have.property('id', 0);
            falsyCat.should.have.property('age', 0);
            done();
          })
          .catch(done);
        });

        it('Get item with invalid key', function (done) {

          Cats.Cat.get(0, function(err, model) {
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.not.exist(model);
            done();
          });
        });

        it('Get and Update corrupted item', function (done) {

          // create corrupted item
          var req = dynamoose.ddb().putItem({
            Item: {
              "id": {
                N: "7"
              },
              "isHappy": {
                // this is the data corruption
                S: "tue"
              }
            },
            ReturnConsumedCapacity: "TOTAL",
            TableName: Cats.Cat7.$__.table.name
          });

          req.promise().then(function(){
            return Cats.Cat7.get(7);
          }).catch(function(err){
            should.exist(err.message);
          }).then(function(){
            return Cats.Cat7.update(7, { name : 'my favorite cat'});
          }).catch(function(err){
            should.exist(err.message);
            done();
          });
        });

        it('Get returnRequest option', function (done) {
          Cats.Cat.get(1, {returnRequest: true}, function(err, request) {
            should.not.exist(err);
            should.exist(request);

            request.TableName.should.eql("test-Cat-db");
            request.Key.should.eql({id: {N: '1'}});
            done();
          });
        });

        it('Save existing item', function (done) {

          Cats.Cat.get(1, function(err, model) {
            should.not.exist(err);
            should.exist(model);

            model.name.should.eql('Fluffy');

            model.name = 'Bad Cat';
            model.vet.name = 'Tough Vet';
            model.ears[0].name = 'right';

            model.save(function (err) {
              should.not.exist(err);

              Cats.Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
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

        it('Save existing item without defining updating timestamps', function (done) {
          var myCat = new Cats.Cat9({
            id: 1,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedCreatedAt = theSavedCat1.createdAt;
            var expectedUpdatedAt = theSavedCat1.updatedAt;

            theSavedCat1.name = "FluffyB";
            setTimeout(function() {
              theSavedCat1.save(function () {
                Cats.Cat9.get(1, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
                  realCat.updatedAt.should.not.eql(expectedUpdatedAt); // updatedAt should be different than before
                  done();
                });
              });
            }, 1000);
          });
        });

        it('Save existing item with updating timestamps', function (done) {
          var myCat = new Cats.Cat9({
            id: 1,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedCreatedAt = theSavedCat1.createdAt;
            var expectedUpdatedAt = theSavedCat1.updatedAt;

            myCat.name = "FluffyB";
            setTimeout(function() {
              myCat.save({updateTimestamps: true}, function () {
                Cats.Cat9.get(1, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
                  realCat.updatedAt.should.not.eql(expectedUpdatedAt); // updatedAt should be different than before
                  done();
                });
              });
            }, 1000);
          });
        });

        it('Save existing item without updating timestamps', function (done) {
          var myCat = new Cats.Cat9({
            id: 1,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedCreatedAt = theSavedCat1.createdAt;
            var expectedUpdatedAt = theSavedCat1.updatedAt;

            myCat.name = "FluffyB";
            setTimeout(function() {
              myCat.save({updateTimestamps: false}, function () {
                Cats.Cat9.get(1, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.createdAt.should.eql(expectedCreatedAt); // createdAt should be the same as before
                  realCat.updatedAt.should.eql(expectedUpdatedAt); // updatedAt should be the same as before
                  done();
                });
              });
            }, 1000);
          });
        });


        it('Save existing item with updating expires', function (done) {
          var myCat = new Cats.Cat11({
            id: 1,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedExpires = theSavedCat1.expires;

            myCat.name = "FluffyB";
            setTimeout(function() {
              myCat.save({updateExpires: true}, function () {
                Cats.Cat11.get(1, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.expires.should.not.eql(expectedExpires); // expires should be different than before
                  done();
                });
              });
            }, 1000);
          });
        });


        it('Save existing item without updating expires', function (done) {
          var myCat = new Cats.Cat11({
            id: 2,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedExpires = theSavedCat1.expires;

            myCat.name = "FluffyB";
            setTimeout(function() {
              myCat.save({updateExpires: false}, function () {
                Cats.Cat11.get(2, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.expires.should.eql(expectedExpires); // expires should be the same as before
                  done();
                });
              });
            }, 1000);
          });
        });


        it('Save existing item without updating expires (default)', function (done) {
          var myCat = new Cats.Cat11({
            id: 3,
            name: 'Fluffy',
            vet:{name:'theVet', address:'12 somewhere'},
            ears:[{name:'left'}, {name:'right'}],
            legs: ['front right', 'front left', 'back right', 'back left'],
            more: {favorites: {food: 'fish'}},
            array: [{one: '1'}],
            validated: 'valid'
          });

          myCat.save(function(err, theSavedCat1) {
            var expectedExpires = theSavedCat1.expires;

            myCat.name = "FluffyB";
            setTimeout(function() {
              myCat.save(function () {
                Cats.Cat11.get(3, function(err, realCat) {
                  realCat.name.should.eql("FluffyB");
                  realCat.expires.should.eql(expectedExpires); // expires should be the same as before
                  done();
                });
              });
            }, 1000);
          });
        });

        it('Save existing item with a false condition', function (done) {
          Cats.Cat.get(1, function(err, model) {
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

              Cats.Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
                should.not.exist(err);
                badCat.name.should.eql('Bad Cat');
                done();
              });
            });
          });
        });

        it('Save existing item with a true condition', function (done) {
          Cats.Cat.get(1, function(err, model) {
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

              Cats.Cat.get({id: 1}, {consistent: true}, function(err, whiskers) {
                should.not.exist(err);
                whiskers.name.should.eql('Whiskers');
                done();
              });
            });
          });
        });

        it('Save with a pre hook', function (done) {
          var flag = false;
          Cats.Cat.pre('save', function (next) {
            flag = true;
            next();
          });

          Cats.Cat.get(1, function(err, model) {
            should.not.exist(err);
            should.exist(model);

            model.name.should.eql('Whiskers');

            model.name = 'Fluffy';
            model.vet.name = 'Nice Guy';
            model.save(function (err) {
              should.not.exist(err);

              Cats.Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
                should.not.exist(err);
                badCat.name.should.eql('Fluffy');
                badCat.vet.name.should.eql('Nice Guy');
                flag.should.be.true;

                Cats.Cat.removePre('save');
                done();
              });
            });
          });
        });

        it('Save existing item with an invalid attribute', function (done) {
          Cats.Cat.get(1, function(err, model) {
            should.not.exist(err);
            should.exist(model);

            model.validated = 'bad';
            model.save().catch(function(err) {
              should.exist(err);
              err.name.should.equal('ValidationError');
              Cats.Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
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

          var cat = new Cats.Cat({id: 1});

          cat.delete(done);
        });

        it('Deletes item with invalid key', function (done) {

          var cat = new Cats.Cat({id: 0});

          cat.delete(function(err) {
            should.exist(err);
            err.name.should.equal('ValidationError');
            done();
          });
        });

        it('Delete returnRequest option', function (done) {
          var cat = new Cats.Cat({id: 1});

          cat.delete({returnRequest: true}, function (err, request) {
            should.not.exist(err);
            request.should.exist;

            request.TableName.should.eql("test-Cat-db");
            request.Key.should.eql({id: {N: '1'}});

            done();
          });
        });

        it('Get missing item', function (done) {


          Cats.Cat.get(1, function(err, model) {
            should.not.exist(err);
            should.not.exist(model);
            done();
          });
        });

        it('Static Creates new item', function (done) {
          Cats.Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
            should.not.exist(err);
            should.exist(garfield);
            garfield.id.should.eql(666);
            done();
          });
        });

        it('Static Creates new item with range key', function (done) {
          Cats.Cat2.create({ownerId: 666, name: 'Garfield'}, function (err, garfield) {
            should.not.exist(err);
            should.exist(garfield);
            garfield.ownerId.should.eql(666);
            done();
          });
        });

        it('Prevent duplicate create', function (done) {
          Cats.Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
            should.exist(err);
            should.not.exist(garfield);
            done();
          });
        });

        it('Prevent duplicate create with range key', function (done) {
          Cats.Cat2.create({ownerId: 666, name: 'Garfield'}, function (err, garfield) {
            should.exist(err);
            should.not.exist(garfield);
            done();
          });
        });

        it('Static Creates second item', function (done) {
          Cats.Cat.create({id: 777, name: 'Catbert'}, function (err, catbert) {
            should.not.exist(err);
            should.exist(catbert);
            catbert.id.should.eql(777);
            done();
          });
        });

        it('BatchGet items', function (done) {
          Cats.Cat.batchGet([{id: 666}, {id: 777}], function (err, cats) {
            cats.length.should.eql(2);
            done();
          });
        });

        it('BatchGet items for model with falsy keys', function (done) {
          Cats.Cat8.create({id: 1, age: 0})
          .then(function () {
            return Cats.Cat8.batchGet([{id: 1, age: 0}]);
          })
          .then(function (cats) {
            cats.length.should.eql(1);
            cats[0].should.have.property('id', 1);
            cats[0].should.have.property('age', 0);
            done();
          })
          .catch(done);
        });

        it('Static Delete', function (done) {
          Cats.Cat.delete(666, function (err) {
            should.not.exist(err);
            Cats.Cat.get(666, function (err, delCat) {
              should.not.exist(err);
              should.not.exist(delCat);

              Cats.Cat.delete(777, done);
            });
          });
        });

        it('Should support deletions with validators', function (done) {
          var cat = new Cats.CatWithGeneratedID({
            owner: {
              name: 'Joe',
              address: 'Somewhere'
            },
            name: 'Garfield',
            id: 'Joe_Garfield'
          });
          cat.delete(function (err) {
            should.not.exist(err);
            Cats.CatWithGeneratedID.get(cat, function (err, delCat) {
              should.not.exist(err);
              should.not.exist(delCat);
              done();
            });
          });
        });

        it('Static Delete with range key', function (done) {
          Cats.Cat2.delete({ ownerId: 666, name: 'Garfield' }, function (err) {
            should.not.exist(err);
            Cats.Cat2.get({ ownerId: 666, name: 'Garfield' }, function (err, delCat) {
              should.not.exist(err);
              should.not.exist(delCat);
              done();
            });
          });
        });

        it('Static Creates new item', function (done) {
          Cats.Cat.create({id: 666, name: 'Garfield'}, function (err, garfield) {
            should.not.exist(err);
            should.exist(garfield);
            garfield.id.should.eql(666);
            done();
          });
        });

        it('Static Delete with update', function (done) {
          Cats.Cat.delete(666, { update: true }, function (err, data) {
            should.not.exist(err);
            should.exist(data);
            data.id.should.eql(666);
            data.name.should.eql('Garfield');
            Cats.Cat.get(666, function (err, delCat) {
              should.not.exist(err);
              should.not.exist(delCat);
              done();
            });
          });
        });

        it('Static Delete with update failure', function (done) {
          Cats.Cat.delete(666, { update: true }, function (err) {
            should.exist(err);
            err.statusCode.should.eql(400);
            err.code.should.eql('ConditionalCheckFailedException');
            done();
          });
        });


        // See comments on PR #306 for details on why the test below is commented out

        it('Should enable server side encryption', function() {
          var Model = dynamoose.model('TestTable', { id: Number, name: String }, { serverSideEncryption: true });
          Model.getTableReq().SSESpecification.Enabled.should.be.true;
        });

        it('Server side encryption shouldn\'t be enabled unless specified', function(done) {
          var Model = dynamoose.model('TestTableB', { id: Number, name: String });
          setTimeout(function () {
            Model.$__.table.describe(function(err, data) {
              var works = !data.Table.SSEDescription || data.Table.SSEDescription.Status === "DISABLED";
              works.should.be.true;
              done();
            });
          }, 2000);
        });

        it('Makes model class available inside schema methods', function() {
          Object.keys(dynamoose.models).should.containEql('test-CatWithMethods-db');

          var cat = new Cats.CatWithMethods({id: 1, name: 'Sir Pounce'});

          cat.getModel.should.throw(Error);

          var modelClass = cat.getModel('test-CatWithMethods-db');
          modelClass.should.equal(Cats.CatWithMethods);
        });

        describe('Model.update', function (){
          before(function (done) {
            var stray = new Cats.Cat({id: 999, name: 'Tom'});
            stray.save(done);
          });

          it('False condition', function (done) {
            Cats.Cat.update({id: 999}, {name: 'Oliver'}, {
              condition: '#name = :name',
              conditionNames: { name: 'name' },
              conditionValues: { name: 'Muffin' }
            }, function (err) {
              should.exist(err);
              Cats.Cat.get(999, function (err, tomcat) {
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
            Cats.Cat.update({id: 999}, {name: 'Oliver'}, {
              condition: '#name = :name',
              conditionNames: { name: 'name' },
              conditionValues: { name: 'Tom' }
            }, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              data.name.should.equal('Oliver');
              Cats.Cat.get(999, function (err, oliver) {
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
            Cats.Cat3.update(null, {age: 3, name: 'Furrgie'}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(888);
              data.name.should.equal('Furrgie');
              data.age.should.equal(3);

              Cats.Cat3.get(888, function (err, furrgie) {
                should.not.exist(err);
                should.exist(furrgie);
                furrgie.id.should.eql(888);
                furrgie.name.should.eql('Furrgie');
                data.age.should.equal(3);

                Cats.Cat3.update(undefined, {age: 4}, function (err, data) {
                  should.not.exist(err);
                  should.exist(data);
                  data.id.should.eql(888);
                  data.name.should.equal('Furrgie');
                  data.age.should.equal(4);

                  Cats.Cat3.get(888, function (err, furrgie) {
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
            Cats.Cat.update(null, {name: 'Oliver'}, function (err, data) {
              should.not.exist(data);
              should.exist(err);
              done();
            });
          });

          it("If key is a value, will search by that value", function (done) {
            Cats.Cat3.update(888, {age: 5}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(888);
              data.name.should.equal('Furrgie');
              data.age.should.equal(5);

              Cats.Cat3.get(888, function (err, furrgie) {
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
            Cats.Cat3.update({id: 25}, {age: 3}, {createRequired: true}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(25);
              data.name.should.equal('Mittens');
              data.age.should.equal(3);
              Cats.Cat3.get(25, function (err, mittens) {
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
            Cats.Cat3.update({id: 25}, {name: 'Rufflestiltskins'}, {createRequired: true}, function (err, data) {
              should.not.exist(data);
              should.exist(err);
              Cats.Cat3.get(25, function (err, mittens) {
                should.not.exist(err);
                should.exist(mittens);
                mittens.id.should.eql(25);
                mittens.name.should.eql('Mittens');
                done();
              });
            });
          });

          it('Adds required attributes, even when not specified, if createRequired is true', function (done) {
            Cats.Cat3.update({id: 45}, {age: 4}, {createRequired: true}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(45);
              data.name.should.equal('Mittens');
              data.age.should.equal(4);
              Cats.Cat3.get(45, function (err, mittens) {
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
            Cats.Cat3.update({id: 24}, {name: 'Cat-rina'}, {createRequired: false}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(24);
              data.name.should.equal('Cat-rina');
              should.not.exist(data.age);
              Cats.Cat3.get(24, function (err, mittens) {
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
            Cats.Cat4.delete({id: 22}, function () {
              Cats.Cat4.update({id: 22}, {name: 'Twinkles'}, function (err, data) {
                should.not.exist(err);
                should.exist(data);
                should.exist(data.myLittleCreatedAt);
                should.exist(data.myLittleUpdatedAt);
                data.id.should.eql(22);
                data.name.should.equal('Twinkles');

                Cats.Cat4.get(22, function (err, twinkles) {
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
            Cats.Cat4.delete({id: 22}, function () {
              Cats.Cat4.update({id: 22}, {name: 'Twinkles'}, function (err, data) {
                should.not.exist(err);
                should.exist(data);
                data.id.should.eql(22);
                data.name.should.equal('Twinkles');
                should.exist(data.myLittleCreatedAt);
                should.exist(data.myLittleUpdatedAt);

                // now do another update
                Cats.Cat4.update({id: 22}, {name: 'Furr-nando'}, function (err, data) {
                  should.not.exist(err);
                  should.exist(data);
                  data.id.should.eql(22);
                  data.name.should.equal('Furr-nando');
                  data.myLittleUpdatedAt.getTime().should.be.above(data.myLittleCreatedAt.getTime());
                  Cats.Cat4.get(22, function (err, furrnando) {
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

          it('Expires will be updated ', function (done) {
            Cats.ExpiringCat.create({name: 'Fluffy2'})
            .then(function (fluffy) {
              var max = Math.floor(Date.now() / 1000) + NINE_YEARS;
              var min = max - 1;
              should.exist(fluffy);
              should.exist(fluffy.expires);
              should.exist(fluffy.expires.getTime);

              var expiresInSec = Math.floor(fluffy.expires.getTime() / 1000);
              expiresInSec.should.be.within(min, max);


              setTimeout(function() {
                Cats.ExpiringCat.update({name: 'Fluffy2'}, {name: 'Twinkles'}, { updateExpires: true }, function (err, fluffy) {
                  should.not.exist(err);
                  should.exist(fluffy);
                  should.exist(fluffy.expires);
                  should.exist(fluffy.expires.getTime);

                  var expiresInSec2 = Math.floor(fluffy.expires.getTime() / 1000);
                  expiresInSec2.should.be.above(expiresInSec);

                  done();
                });
              }, 1000);
            })
            .catch(done);
          });

          it('Set expires attribute on save', function (done) {
            Cats.ExpiringCat.create({name: 'Fluffy'})
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
            Cats.ExpiringCat.create({
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
            Cats.ExpiringCat.create({
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

          it('Save returnRequest option', function (done) {
            Cats.ExpiringCat.create({
              name: 'Leo5'
            })
            .then(function (leo) {
              var max = Math.floor(Date.now() / 1000) + NINE_YEARS;
              var min = max - 1;
              var expiresInSec = Math.floor(leo.expires.getTime() / 1000);
              expiresInSec.should.be.within(min, max);

              leo.expires = new Date(Date.now() + (ONE_YEAR* 1000));
              return leo.save({returnRequest: true});
            })
            .then(function (request) {
              request.should.exist;

              request.TableName.should.eql("test-ExpiringCat-db");
              request.Item.name.should.eql({S: "Leo5"});
              done();
            })
            .catch(done);
          });

          it('Should not have an expires property if TTL is set to null', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo12'
            })
            .then(function () {
              Cats.ExpiringCatNull.get("Leo12").then(function (leo) {
                should.exist(leo);
                should.not.exist(leo.expires);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should not return expired items if returnExpiredItems is false (get)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo1',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.get("Leo1").then(function (leo) {
                should.not.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is false and expires is null (get)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo11',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.get("Leo11").then(function (leo) {
                should.not.exist(leo.expires);
                should.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined (get)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo1',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.get("Leo1").then(function (leo) {
                should.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined and expires is null (get)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo11',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.get("Leo11").then(function (leo) {
                should.not.exist(leo.expires);
                should.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true (get)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo1',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.get("Leo1").then(function (leo) {
                should.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true and expires is null (get)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo11',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.get("Leo11").then(function (leo) {
                should.not.exist(leo.expires);
                should.exist(leo);
                done();
              }).catch(done);
            })
            .catch(done);
          });


          it('Should not return expired items if returnExpiredItems is false (batchGet)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo2',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.batchGet(["Leo2"]).then(function (leo) {
                leo.length.should.eql(0);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is false and expires is null (batchGet)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo22',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.batchGet(["Leo22"]).then(function (leo) {
                leo.length.should.eql(1);
                should.not.exist(leo[0].expires);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined (batchGet)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo2',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.batchGet(["Leo2"]).then(function (leo) {
                leo.length.should.eql(1);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined and expires is null (batchGet)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo22',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.batchGet(["Leo22"]).then(function (leo) {
                leo.length.should.eql(1);
                should.not.exist(leo[0].expires);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true (batchGet)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo2',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.batchGet(["Leo2"]).then(function (leo) {
                leo.length.should.eql(1);
                done();
              }).catch(done);
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true and expires is null (batchGet)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo22',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.batchGet(["Leo22"]).then(function (leo) {
                leo.length.should.eql(1);
                should.not.exist(leo[0].expires);
                done();
              }).catch(done);
            })
            .catch(done);
          });



          it('Should not return expired items if returnExpiredItems is false (scan)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo3',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.scan({name: 'Leo3'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(0);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is false and expires is null (scan)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo33',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.scan({name: 'Leo33'}, function (err, leo) {
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

          it('Should return expired items if returnExpiredItems is undefined (scan)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo3',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.scan({name: 'Leo3'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(1);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined and expires is null (scan)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo33',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.scan({name: 'Leo33'}, function (err, leo) {
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

          it('Should return expired items if returnExpiredItems is true (scan)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo3',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.scan({name: 'Leo3'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(1);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true and expires is null (scan)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo33',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.scan({name: 'Leo33'}, function (err, leo) {
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

          it('Should not return expired items if returnExpiredItems is false (query)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo4',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.query({name: 'Leo4'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(0);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is false and expires is null (query)', function (done) {
            Cats.ExpiringCatNoReturn.create({
              name: 'Leo44',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNoReturn.query({name: 'Leo44'}, function (err, leo) {
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

          it('Should return expired items if returnExpiredItems is undefined (query)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo4',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.query({name: 'Leo4'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(1);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is undefined and expires is null (query)', function (done) {
            Cats.ExpiringCatNull.create({
              name: 'Leo44',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatNull.query({name: 'Leo44'}, function (err, leo) {
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

          it('Should return expired items if returnExpiredItems is true (query)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo4',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = new Date(Date.now() - 5000);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.query({name: 'Leo4'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(1);
                done();
              });
            })
            .catch(done);
          });

          it('Should return expired items if returnExpiredItems is true and expires is null (query)', function (done) {
            Cats.ExpiringCatReturnTrue.create({
              name: 'Leo44',
              expires: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365))
            })
            .then(function (leo) {
              leo.expires = null;
              console.log(leo);
              return leo.save();
            })
            .then(function () {
              Cats.ExpiringCatReturnTrue.query({name: 'Leo44'}, function (err, leo) {
                if (err) {
                  done(err);
                }
                leo.length.should.eql(1);
                console.log(leo);
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




          it('Updated key and update together ', function (done) {
            Cats.Cat.update({id: 999, name: 'Felix'}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              data.name.should.equal('Felix');
              Cats.Cat.get(999, function (err, felix){
                should.not.exist(err);
                should.exist(felix);
                felix.id.should.eql(999);
                felix.name.should.eql('Felix');
                should.not.exist(felix.owner);
                should.not.exist(felix.age);
                done();
              });
            });
          });

          it('Updated key with range and update together ', function (done) {
            Cats.Owner.create({name: 'OwnerToUpdate', address: '123 A Street', phoneNumber: '2345551212'})
            .then(function (owner) {
              owner.name.should.eql('OwnerToUpdate');
              owner.phoneNumber.should.eql('2345551212');
              return Cats.Owner.update({name: 'OwnerToUpdate', address: '123 A Street', phoneNumber: 'newnumber'});
            })
            .then(function (updatedOwner) {
              updatedOwner.name.should.eql('OwnerToUpdate');
              updatedOwner.phoneNumber.should.eql('newnumber');
              return Cats.Owner.get({name: 'OwnerToUpdate', address: '123 A Street'});
            })
            .then(function (updatedOwner) {
              updatedOwner.name.should.eql('OwnerToUpdate');
              updatedOwner.phoneNumber.should.eql('newnumber');
              done();
            })
            .catch(done);
          });

          it('Default puts attribute', function (done) {
            Cats.Cat.update({id: 999}, {name: 'Tom'}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              data.name.should.equal('Tom');
              Cats.Cat.get(999, function (err, tomcat){
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
            Cats.Cat.update({id: 999}, {$PUT: {name: null}}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              should.not.exist(data.name);
              Cats.Cat.get(999, function (err, tomcat){
                should.not.exist(err);
                should.exist(tomcat);
                tomcat.id.should.eql(999);
                should.not.exist(tomcat.name);
                done();
              });
            });
          });

          it('Manual puts attribute', function (done) {
            Cats.Cat.update({id: 999}, {$PUT: {name: 'Tom', owner: 'Jerry', age: 3}}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              data.owner.should.equal('Jerry');
              Cats.Cat.get(999, function (err, tomcat){
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
            Cats.Cat.update({id: 999}, {$ADD: {age: 1}}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              data.age.should.equal(4);
              Cats.Cat.get(999, function (err, tomcat){
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
            Cats.Cat.update({id: 999}, {$DELETE: {owner: null}}, function (err, data) {
              should.not.exist(err);
              should.exist(data);
              data.id.should.eql(999);
              should.not.exist(data.owner);
              Cats.Cat.get(999, function (err, tomcat){
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
            Cats.Cat.update({id: 999}, {name: 'Oliver', validated: 'bad'}, function (err, data) {
              should.exist(err);
              should.not.exist(data);
              err.name.should.equal('ValidationError');
              Cats.Cat.get(999, function (err, tomcat) {
                should.not.exist(err);
                should.exist(tomcat);
                tomcat.id.should.eql(999);
                tomcat.name.should.eql('Tom');
                done();
              });
            });
          });

          it("Update returns all new values using default returnValues option", function () {
            return Cats.Cat.create({id: '678', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}).then(function(data){
                should.exist(data);
                data.name.should.equal('Tom');
                data.should.have.property('id');
              });
            });
          });

          it("Update returns updated new values using 'UPDATED_NEW'", function () {
            return Cats.Cat.create({id: '678', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}, {returnValues: 'UPDATED_NEW'}).then(function(data){
                should.exist(data);
                data.name.should.equal('Tom');
                data.should.not.have.property('id');
              });
            });
          });

          it("Update returns all new values using 'ALL_NEW'", function () {
            return Cats.Cat.create({id: '678', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}, {returnValues: 'ALL_NEW'}).then(function(data){
                should.exist(data);
                data.name.should.equal('Tom');
                data.should.have.property('id');
              });
            });
          });

          it("Update returns old updated values using 'UPDATED_OLD'", function () {
            return Cats.Cat.create({id: '679', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}, {returnValues: 'UPDATED_OLD'}).then(function(data){
                should.exist(data);
                data.name.should.equal('Oliver');
                data.should.not.have.property('id');
              });
            });
          });

          it("Update returns old values using 'ALL_OLD'", function () {
            return Cats.Cat.create({id: '679', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}, {returnValues: 'ALL_OLD'}).then(function(data){
                should.exist(data);
                data.name.should.equal('Oliver');
                data.should.have.property('id');
              });
            });
          });

          it('Update with saveUnknown enabled', function (done) {
            Cats.Cat1.create({id: 982, name: 'Oliver'}, function(err, old){
              should.not.exist(err);
              Cats.Cat1.update({id: old.id}, {otherProperty: 'Testing123'}, function(err, data){
                should.not.exist(err);
                should.exist(data);
                data.should.have.property('otherProperty');
                data.otherProperty.should.eql('Testing123');
                done();
              });
            });
          });

          it('Update $ADD with saveUnknown enabled', function (done) {
            Cats.Cat1.create({id: 986, name: 'Oliver', mathy: 1}, function(err, old){
              should.not.exist(err);
              old.should.have.property('mathy');
              old.mathy.should.eql(1);
              Cats.Cat1.update({id: old.id}, {$ADD: {mathy: 4}}, function(err, data){
                should.not.exist(err);
                should.exist(data);
                data.should.have.property('mathy');
                data.mathy.should.eql(5);
                done();
              });
            });
          });

          it('Update $DELETE with saveUnknown enabled', function (done) {
            Cats.Cat1.create({id: 984, name: 'Oliver'}, function(err, old){
              should.not.exist(err);
              Cats.Cat1.update({id: old.id}, {otherProperty: 'Testing123'}, function(err, data){
                should.not.exist(err);
                should.exist(data);
                data.should.have.property('otherProperty');
                data.otherProperty.should.eql('Testing123');
                Cats.Cat1.update({id: old.id}, { $DELETE: {otherProperty: 'Testing123'} }, function(err, data) {
                  should.not.exist(err);
                  should.exist(data);
                  data.should.not.have.property('otherProperty');
                  done();
                });
              });
            });
            });

          it("Update returns should not return any values using 'none' option", function () {
            return Cats.Cat.create({id: '680', name: 'Oliver'}, {overwrite: true}).then(function(old){
              return Cats.Cat.update({id: old.id}, {name: 'Tom'}, {returnValues: 'NONE'}).then(function(data){
                should.not.exist(data);
              });
            });
          });

          it('Update returnRequest option', function (done) {
            Cats.Cat.update({id: 999}, {name: 'Oliver'}, {returnRequest: true}, function(err, request) {
              should.not.exist(err);
              should.exist(request);

              request.TableName.should.eql("test-Cat-db");
              request.Key.should.eql({id: {N: '999'}});
              done();
            });
          });
        });

        describe('Model.populate', function (){
          before(function (done) {
            var kittenWithParents = new Cats.Cat6({id: 1, name: 'One'});
            var owner = new Cats.Owner({name: 'Owner', address: '123 A Street', phoneNumber: '2345551212'});
            var kittenWithOwner = new Cats.CatWithOwner({
              id: 100,
              name: 'Owned',
              owner: {name: owner.name, address: owner.address}
            });
            kittenWithParents.save()
            .then(function(kitten) {
              var kittenWithParents = new Cats.Cat6({id: 2, name: 'Two', parent: kitten.id});
              return kittenWithParents.save();
            })
            .then(function(kitten) {
              var kittenWithParents = new Cats.Cat6({id: 3, name: 'Three', parent: kitten.id});
              return kittenWithParents.save();
            })
            .then(function(kitten) {
              var kittenWithParents = new Cats.Cat6({id: 4, name: 'Four', parent: kitten.id});
              return kittenWithParents.save();
            })
            .then(function() {
              var kittenWithParents = new Cats.Cat6({id: 5, name: 'Five', parent: 999});
              return kittenWithParents.save();
            })
            .then(function() {
              var kittenWithParents = new Cats.Cat7({id: 1, name: 'One'});
              return kittenWithParents.save();
            })
            .then(function(kitten) {
              var kittenWithParents = new Cats.Cat7({id: 2, name: 'Two', parent: kitten.id});
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
            Cats.Cat6.get(4)
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
            Cats.Cat6.get(4)
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
            Cats.CatWithOwner.get(100)
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

          it('Populating without the model definition and without ref', function (done) {
            Cats.Cat7.get(2)
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

          it('Populating with model and without the path definition', function (done) {
            Cats.Cat6.get(4)
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
            Cats.Cat6.get(5)
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
            Cats.Cat7.get(2)
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
            Cats.Cat6.get(4)
            .then(function(cat) {
              return cat.populate({
                path: 'parent',
                model: 'test-Cat6-db'
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
            Cats.Cat6.get(5)
            .then(function(cat) {
              return cat.populate({
                path: 'parent',
                model: 'Cats6'
              });
            })
            .catch(function(err){
              should.exist(err.message);
              done();
            });
          });

          it('Populating with path and ref at the schema', function (done) {
            Cats.Cat6.get(4)
            .then(function(cat) {
              return cat.populate({
                path: 'parent'
              });
            })
            .then(function(cat) {
              should.exist(cat.parent);
              var parent = cat.parent;
              parent.id.should.eql(3);
              parent.name.should.eql('Three');
              done();
            });
          });

          it('Populating with string and ref at the schema', function (done) {
            Cats.Cat6.get(4)
            .then(function(cat) {
              return cat.populate('parent');
            })
            .then(function(cat) {
              should.exist(cat.parent);
              var parent = cat.parent;
              parent.id.should.eql(3);
              parent.name.should.eql('Three');
              done();
            });
          });

        });

        describe('Model.batchPut', function (){

          it('Put new', function (done) {
            var cats = [];

            for (var i=0 ; i<10 ; ++i) {
              cats.push(new Cats.Cat({id: 10+i, name: 'Tom_'+i}));
            }

            Cats.Cat.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);
              Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

              for (var i=0 ; i<10 ; ++i) {

                delete cats[i].name;
              }

              Cats.Cat.batchGet(cats, function (err2, result2) {
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
              cats.push(new Cats.Cat({id: 100+i, name: 'Tom_'+i}));
            }

            Cats.Cat.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);
              Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

              for (var i=0 ; i<100 ; ++i) {
                delete cats[i].name;
              }

              Cats.Cat.batchGet(cats, function (err2, result2) {
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
              cats.push(new Cats.Cat2({ownerId: 10+i, name: 'Tom_'+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);
              Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

              Cats.Cat2.batchGet(cats, function (err2, result2) {
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
              cats.push(new Cats.Cat2({ownerId: 10+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.exist(err);
              should.not.exist(result);
              done();
            });
          });

          it('Update items', function (done) {
            var cats = [];

            for (var i=0 ; i<10 ; ++i) {
              cats.push(new Cats.Cat({id: 20+i, name: 'Tom_'+i}));
            }

            Cats.Cat.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              for (var i=0 ; i<10 ; ++i) {
                var cat = cats[i];
                cat.name = 'John_' + (cat.id + 100);
              }

              Cats.Cat.batchPut(cats, function (err2, result2) {
                should.not.exist(err2);
                should.exist(result2);
                Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

                for (var i=0 ; i<10 ; ++i) {
                  delete cats[i].name;
                }

                Cats.Cat.batchGet(cats, function (err3, result3) {
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
              cats.push(new Cats.Cat2({ownerId: 20+i, name: 'Tom_'+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              for (var i=0 ; i<10 ; ++i) {
                var cat = cats[i];
                cat.name = 'John_' + (cat.ownerId + 100);
              }

              Cats.Cat2.batchPut(cats, function (err2, result2) {
                should.not.exist(err2);
                should.exist(result2);
                Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

                Cats.Cat2.batchGet(cats, function (err3, result3) {
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
              cats.push(new Cats.Cat2({ownerId: 20+i, name: 'Tom_'+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              for (var i=0 ; i<10 ; ++i) {
                cats[i].name = null;
              }

              Cats.Cat2.batchPut(cats, function (err2, result2) {
                should.exist(err2);
                should.not.exist(result2);
                done();
              });
            });
          });

          it('Update without updateTimestamps (default)', async function () {
            const cats = [...Array(10)]
              .map((_, i) => new Cats.Cat4({ id: i + 1, name: 'Tom_' + i }));

            const result = await Cats.Cat4.batchPut(cats);
            should.exist(result);

            const timestamps = {};
            cats.forEach((cat, i) => {
              const { id, myLittleUpdatedAt } = cat;
              cat.name = 'John_' + i;
              timestamps[id] = new Date(myLittleUpdatedAt);
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await Cats.Cat4.batchPut(cats);
            should.exist(result2);
            Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

            const updatedCats = await Cats.Cat4.batchGet(cats);
            should.exist(updatedCats);
            updatedCats.length.should.eql(cats.length);
            updatedCats.forEach(cat => {
              cat.myLittleUpdatedAt.should.eql(timestamps[cat.id]);
            });
          });

          it('Update with updateTimestamps set to false', async function () {
            const cats = [...Array(10)]
              .map((_, i) => new Cats.Cat4({ id: i + 1, name: 'Tom_' + i }));

            const result = await Cats.Cat4.batchPut(cats);
            should.exist(result);

            const timestamps = {};
            cats.forEach((cat, i) => {
              const { id, myLittleUpdatedAt } = cat;
              cat.name = 'John_' + i;
              timestamps[id] = new Date(myLittleUpdatedAt);
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await Cats.Cat4.batchPut(cats, { updateTimestamps: false });
            should.exist(result2);
            Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

            const updatedCats = await Cats.Cat4.batchGet(cats);
            should.exist(updatedCats);
            updatedCats.length.should.eql(cats.length);
            updatedCats.forEach(cat => {
              cat.myLittleUpdatedAt.should.eql(timestamps[cat.id]);
            });
          });

          it('Update with updateTimestamps set to true', async function () {
            const cats = [...Array(10)]
              .map((_, i) => new Cats.Cat4({ id: i + 1, name: 'Tom_' + i }));

            const result = await Cats.Cat4.batchPut(cats);
            should.exist(result);

            const timestamps = {};
            cats.forEach((cat, i) => {
              const { id, myLittleUpdatedAt } = cat;
              cat.name = 'John_' + i;
              timestamps[id] = new Date(myLittleUpdatedAt);
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await Cats.Cat4.batchPut(cats, { updateTimestamps: true });
            should.exist(result2);
            Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

            const updatedCats = await Cats.Cat4.batchGet(cats);
            should.exist(updatedCats);
            updatedCats.length.should.eql(cats.length);
            updatedCats.forEach(cat => {
              cat.myLittleUpdatedAt.should.be.greaterThan(timestamps[cat.id]);
            });
          });

          it('Update without updateExpires (default)', async function () {
            const cats = [
              new Cats.Cat11({
                id: 1,
                name: 'Crookshanks',
                vet: { name: 'theVet', address: 'Diagon Alley' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { food: 'fish' } },
                array: [{ one: '1' }],
                validated: 'valid'
              }),
              new Cats.Cat11({
                id: 2,
                name: 'Behemoth',
                vet: { name:'Mikhail Bulgakov', address:'Moscow' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { drink: 'pure alcohol' } },
                array: [{ one: '1' }],
                validated: 'valid'
              })
            ];

            const result = await Cats.Cat11.batchPut(cats);
            should.exist(result);

            const savedCats = await Cats.Cat11.batchGet(cats);
            should.exist(savedCats);
            savedCats.length.should.eql(cats.length);

            const originalExpires = {};
            savedCats.forEach(cat => {
              cat.array.push({ two: '2' });
              originalExpires[cat.id] = cat.expires;
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
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

          it('Update with updateExpires set to false', async function () {
            const cats = [
              new Cats.Cat11({
                id: 1,
                name: 'Crookshanks',
                vet: { name: 'theVet', address: 'Diagon Alley' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { food: 'fish' } },
                array: [{ one: '1' }],
                validated: 'valid'
              }),
              new Cats.Cat11({
                id: 2,
                name: 'Behemoth',
                vet: { name:'Mikhail Bulgakov', address:'Moscow' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { drink: 'pure alcohol' } },
                array: [{ one: '1' }],
                validated: 'valid'
              })
            ];

            const result = await Cats.Cat11.batchPut(cats);
            should.exist(result);

            const savedCats = await Cats.Cat11.batchGet(cats);
            should.exist(savedCats);
            savedCats.length.should.eql(cats.length);

            const originalExpires = {};
            savedCats.forEach(cat => {
              cat.array.push({ two: '2' });
              originalExpires[cat.id] = cat.expires;
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await Cats.Cat11.batchPut(savedCats, { updateExpires: false });
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

          it('Update with updateExpires set to true', async function () {
            const cats = [
              new Cats.Cat11({
                id: 1,
                name: 'Crookshanks',
                vet: { name: 'theVet', address: 'Diagon Alley' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { food: 'fish' } },
                array: [{ one: '1' }],
                validated: 'valid'
              }),
              new Cats.Cat11({
                id: 2,
                name: 'Behemoth',
                vet: { name:'Mikhail Bulgakov', address:'Moscow' },
                ears: [{ name: 'left' }, { name: 'right' }],
                legs: ['front right', 'front left', 'back right', 'back left'],
                more: { favorites: { drink: 'pure alcohol' } },
                array: [{ one: '1' }],
                validated: 'valid'
              })
            ];

            const result = await Cats.Cat11.batchPut(cats);
            should.exist(result);

            const savedCats = await Cats.Cat11.batchGet(cats);
            should.exist(savedCats);
            savedCats.length.should.eql(cats.length);

            const originalExpires = {};
            savedCats.forEach(cat => {
              cat.array.push({ two: '2' });
              originalExpires[cat.id] = cat.expires;
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await Cats.Cat11.batchPut(savedCats, { updateExpires: true });
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
        });

        describe('Model.batchDelete', function (){
          it('Simple delete', function (done) {
            var cats = [];

            for (var i=0 ; i<10 ; ++i) {
              cats.push(new Cats.Cat({id: 30+i, name: 'Tom_'+i}));
            }

            Cats.Cat.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              Cats.Cat.batchDelete(cats, function (err2, result2) {
                should.not.exist(err2);
                should.exist(result2);
                Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

                Cats.Cat.batchGet(cats, function (err3, result3) {
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
              cats.push(new Cats.Cat2({ownerId: 30+i, name: 'Tom_'+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              Cats.Cat2.batchDelete(cats, function (err2, result2) {
                should.not.exist(err2);
                should.exist(result2);
                Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

                Cats.Cat2.batchGet(cats, function (err3, result3) {
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
              cats.push(new Cats.Cat2({ownerId: 30+i, name: 'Tom_'+i}));
            }

            Cats.Cat2.batchPut(cats, function (err, result) {
              should.not.exist(err);
              should.exist(result);

              for (var i=0 ; i<10 ; ++i) {
                delete cats[i].name;
              }

              Cats.Cat2.batchDelete(cats, function (err2, result2) {
                should.exist(err2);
                should.not.exist(result2);
                done();
              });
            });
          });


        });

        describe('Model.default', function() {
          it('Default is set properly', function() {
            var cat = new Cats.CatModel({
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

        it('Model.getTableReq', function() {
          Cats.Cat.getTableReq().AttributeDefinitions.should.exist;
          Cats.Cat.getTableReq().TableName.should.exist;
          Cats.Cat.getTableReq().TableName.should.equal('test-Cat-db');
          Cats.Cat.getTableReq().KeySchema.should.exist;
          Cats.Cat.getTableReq().ProvisionedThroughput.should.exist;
        });

        it('Should have BillingMode set to PROVISIONED when creating table, and no throughput defined', function() {
          var BillModeSchema1 = new dynamoose.Schema({
            id: Number,
            name: String
          });
          var BillModeModel1 = dynamoose.model('BillModeModel1', BillModeSchema1);

          BillModeModel1.getTableReq().BillingMode.should.eql("PROVISIONED");
        });
        it('Should have BillingMode set to PROVISIONED when creating table, and throughput defined', function() {
          var BillModeSchema2 = new dynamoose.Schema({
            id: Number,
            name: String
          }, {throughput: {
            write: 10,
            read: 10
          }});
          var BillModeModel2 = dynamoose.model('BillModeModel2', BillModeSchema2);

          BillModeModel2.getTableReq().BillingMode.should.eql("PROVISIONED");
        });

        it('Should have BillingMode set to PAY_PER_REQUEST when creating table, and throughput is ON_DEMAND', function() {
          var BillModeSchema3 = new dynamoose.Schema({
            id: Number,
            name: String
          }, {throughput: "ON_DEMAND"});
          var BillModeModel3 = dynamoose.model('BillModeModel3', BillModeSchema3, {create: false});

          BillModeModel3.getTableReq().BillingMode.should.eql("PAY_PER_REQUEST");
        });

        it('Should have correct throughput set when set', function() {
          var BillModeSchema4 = new dynamoose.Schema({
            id: Number,
            name: String
          }, {throughput: {
            write: 10,
            read: 10
          }});
          var BillModeModel4 = dynamoose.model('BillModeModel4', BillModeSchema4, {create: false});

          BillModeModel4.getTableReq().ProvisionedThroughput.ReadCapacityUnits.should.eql(10);
          BillModeModel4.getTableReq().ProvisionedThroughput.WriteCapacityUnits.should.eql(10);
        });

        it('Should allow for originalItem function on models', function(done) {
          var item = {
            id: 2222,
            name: 'NAME_VALUE',
            owner: 'OWNER_VALUE'
          };

          var cat = new Cats.Cat(item);
          cat.originalItem().should.eql(item);
          cat.save(function(err, newCat) {
            newCat.originalItem().should.eql(item);
            newCat.name = 'NAME_VALUE_2';
            newCat.originalItem().should.eql(item);
            newCat.name.should.eql('NAME_VALUE_2');
            Cats.Cat.get(2222, function(err, newCatB) {
              newCatB.originalItem().should.eql(item);
              newCatB.name = 'NAME_VALUE_2';
              newCatB.originalItem().should.eql(item);
              newCatB.name.should.eql('NAME_VALUE_2');
              done();
            });
          });
        });

        it('Should store/load binary data safely', function(done) {
          var imageData = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x13, 0xd3, 0x61, 0x60, 0x60]);

          imageData.should.not.eql(Buffer.from(imageData.toString())); // The binary value should not be UTF-8 string for test.


          var item = {
            id: 3333,
            name: 'NAME_VALUE',
            owner: 'OWNER_VALUE',
            profileImage: imageData
          };

          var cat = new Cats.Cat(item);
          cat.save(function(err) {
            should.not.exist(err);
            Cats.Cat.get(3333, function(err, newCatB) {
              should.not.exist(err);
              should.exist(newCatB);
              newCatB.should.have.property('profileImage', imageData);
              done();
            });
          });
        });

    		describe('Model.transaction', function() {
          it('Model.transaction should exist and be an object', function() {
            should.exist(Cats.Cat.transaction);
            Cats.Cat.transaction.should.be.instanceof(Object);
          });

          describe('Model.transaction.get', () => {
            it('Model.transaction.get should work', function(done) {
              Cats.Cat.transaction.get("1").then(function(result) {
                should.exist(result);
                should.exist(result.Get);

                done();
              }).catch(done);
            });
            it('Model.transaction.get should work with options', function(done) {
              Cats.Cat.transaction.get("1", {consistent: true}).then(function(result) {
                should.exist(result);
                should.exist(result.Get);

                result.Get.ConsistentRead.should.be.true;
                done();
              }).catch(done);
            });
          });
          describe('Model.transaction.delete', () => {
            it('Model.transaction.delete should work', function(done) {
              Cats.Cat.transaction.delete("1").then(function(result) {
                should.exist(result);
                should.exist(result.Delete);

                done();
              }).catch(done);
            });
            it('Model.transaction.delete should work with options', function(done) {
              Cats.Cat.transaction.delete("1", {update: true}).then(function(result) {
                should.exist(result);
                should.exist(result.Delete);

                result.Delete.ReturnValues.should.eql("ALL_OLD");
                done();
              }).catch(done);
            });
          });
          describe('Model.transaction.create', () => {
            it('Model.transaction.create should work', function(done) {
              Cats.Cat.transaction.create({id: 1}).then(function(result) {
                should.exist(result);
                should.exist(result.Put);

                done();
              }).catch(done);
            });
            it('Model.transaction.create should work with options', function(done) {
              Cats.Cat.transaction.create({id: 1}, {overwrite: true}).then(function(result) {
                should.exist(result);
                should.exist(result.Put);

                should.not.exist(result.Put.ConditionExpression);
                done();
              }).catch(done);
            });
          });
          describe('Model.transaction.update', () => {
            it('Model.transaction.update should work if combined', function(done) {
              Cats.Cat.transaction.update({id: 1, name: "Bob"}).then(function(result) {
                should.exist(result);
                should.exist(result.Update);
                should.exist(result.Update.TableName);

                done();
              }).catch(done);
            });
            it('Model.transaction.update should work if seperate', function(done) {
              Cats.Cat.transaction.update({id: 1}, {name: "Bob"}).then(function(result) {
                should.exist(result);
                should.exist(result.Update);
                should.exist(result.Update.TableName);

                done();
              }).catch(done);
            });
            it('Model.transaction.update should work with options seperate', function(done) {
              Cats.Cat.transaction.update({id: 1}, {name: "Bob"}, {condition: 'attribute_not_exists(name)'}).then(function(result) {
                should.exist(result);
                should.exist(result.Update);
                should.exist(result.Update.TableName);

                result.Update.ConditionExpression.should.equal('attribute_not_exists(name)');
                done();
              }).catch(done);
            });
          });

    		});

        describe('Transactions', function () {
          it('Should return correct request object', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.create({id: 10000}),
              Cats.Cat2.transaction.update({ownerId: 1, name: "Sara"})
            ], {returnRequest: true}).then(function(request) {
              should.exist(request);
              should.exist(request.TransactItems);

              request.should.eql({"TransactItems":[{"Put":{"TableName":"test-Cat-db","Item":{"id":{"N":"10000"}},"ConditionExpression":"attribute_not_exists(id)"}},{"Update":{"TableName":"test-Cat2-db","Key":{"ownerId":{"N":"1"},"name":{"S":"Sara"}}}}]});

              done();
            }).catch(done);
          });

          it('Should return correct request object when all items are get', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.get(10000),
              Cats.Cat4.transaction.get(10000),
            ], {returnRequest: true}).then(function(request) {
              should.exist(request);
              should.exist(request.TransactItems);

              request.should.eql({"TransactItems":[{"Get":{"TableName":"test-Cat-db","Key":{"id":{"N":"10000"}}}},{"Get":{"TableName":"test-Cat4-db","Key":{"id":{"N":"10000"}}}}]});

              done();
            }).catch(done);
          });

          it('Should return correct request object when setting type to write', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.create({id: 10000}),
              Cats.Cat2.transaction.update({ownerId: 1, name: "Sara"})
            ], {returnRequest: true, type: "write"}).then(function(request) {
              should.exist(request);
              should.exist(request.TransactItems);

              request.should.eql({"TransactItems":[{"Put":{"TableName":"test-Cat-db","Item":{"id":{"N":"10000"}},"ConditionExpression":"attribute_not_exists(id)"}},{"Update":{"TableName":"test-Cat2-db","Key":{"ownerId":{"N":"1"},"name":{"S":"Sara"}}}}]});

              done();
            }).catch(done);
          });

          it('Should return correct request object when setting type to get', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.create({id: 10000}),
              Cats.Cat2.transaction.update({ownerId: 1, name: "Sara"})
            ], {returnRequest: true, type: "get"}).then(function(request) {
              should.exist(request);
              should.exist(request.TransactItems);

              request.should.eql({"TransactItems":[{"Put":{"TableName":"test-Cat-db","Item":{"id":{"N":"10000"}},"ConditionExpression":"attribute_not_exists(id)"}},{"Update":{"TableName":"test-Cat2-db","Key":{"ownerId":{"N":"1"},"name":{"S":"Sara"}}}}]});

              done();
            }).catch(done);
          });

          it('Should throw if invalid type passed in', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.get(10000),
              Cats.Cat4.transaction.get(10000),
            ], {returnRequest: true, type: "other"}).then(function () {

            }).catch(function (error) {
              should.exist(error);
              done();
            });
          });

          it('Should Properly work with read transactions', function(done) {
            Cats.Cat.batchPut([
              new Cats.Cat({id: '680', name: 'Oliver'}),
              new Cats.Cat({id: '780', name: 'Whiskers'})
            ], function (err, result) {
              return dynamoose.transaction([
                Cats.Cat.transaction.get(680),
                Cats.Cat.transaction.get(780),
              ]).then(function(result) {
                should.exist(result);
                result.length.should.equal(2);
                result[0].should.be.instanceof(Cats.Cat);
                result[1].should.be.instanceof(Cats.Cat);
                result[0].id.should.equal(680);
                result[1].id.should.equal(780);

                done();
              }).catch(done);
            });
          });

          it('Should respond with no data', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.create({id: 10000}),
              Cats.Cat3.transaction.update({id: 1, name: "Sara"}),
              // @TODO: use 10000 as in the first transaction. Currenly local mock requires us to use unique IDs.
              Cats.Cat.transaction.delete({id: 10001})
            ]).then(function(result) {
              should.not.exist(result);

              done();
            }).catch(done);
          });

          it('Should throw if RAW item object passed in, and table doesn\'t exist in Dynamoose', function(done) {
            dynamoose.transaction([
              Cats.Cat.transaction.create({id: 30000}),
              Cats.Cat3.transaction.update({id: 1, name: "Sara"}),
              // @TODO: use 10000 as in the first transaction. Currenly local mock requires us to use unique IDs.
              Cats.Cat.transaction.delete({id: 30001}),
              {
                Delete: {
                  Key: {
                    id: {
                      S: 'helloworld'
                    }
                  },
                  TableName: 'MyOtherTable'
                }
              }
            ]).then(function () {
            }).catch(function (error) {
              should.exist(error);
              error.message.should.eql("MyOtherTable is not a registered model. You can only use registered Dynamoose models when using a RAW transaction object.")
              done();
            });
          });

        });
      });
