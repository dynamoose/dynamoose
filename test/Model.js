/* eslint no-invalid-this: 'off' */

'use strict';

var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var should = require('should');

var Cat, Cat2;

describe('Model', function () {
  this.timeout(5000);

  before(function (done) {
    this.timeout(12000);

    dynamoose.setDefaults({prefix: 'test-'});


    Cat = dynamoose.model('Cat',
      {
        id: Number,
        name: String,
        owner: String,
        age: {type: Number},
        vet: {
          name: String,
          address: String
        },
        ears: [{
          name: String
        }],
        legs: [String],
        more: Object,
        array: Array
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
    should.not.exist(schema.attributes.id.validator);
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
        vet: {name: 'theVet', address: '12 somewhere'},
        ears: [{name: 'left'}, {name: 'right'}],
        legs: ['front right', 'front left', 'back right', 'back left'],
        more: {fovorites: {food: 'fish'}},
        array: [{one: '1'}]
      }
    );

    kitten.id.should.eql(1);
    kitten.name.should.eql('Fluffy');

    var dynamoObj = schema.toDynamo(kitten);

    dynamoObj.should.eql(
      {
        ears: {
          L: [
            {M: {name: {S: 'left'}}},
            {M: {name: {S: 'right'}}}
          ]
        },
        id: {N: '1'},
        name: {S: 'Fluffy'},
        vet: {M: {address: {S: '12 somewhere'}, name: {S: 'theVet'}}},
        legs: {SS: ['front right', 'front left', 'back right', 'back left']},
        more: {S: '{"fovorites":{"food":"fish"}}'},
        array: {S: '[{"one":"1"}]'}
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

  it('Get item for model', function (done) {

    Cat.get(1, function (err, model) {
      should.not.exist(err);
      should.exist(model);

      model.should.have.property('id', 1);
      model.should.have.property('name', 'Fluffy');
      model.should.have.property('vet', {address: '12 somewhere', name: 'theVet'});
      model.should.have.property('$__');
      done();
    });
  });

  it('Save existing item', function (done) {

    Cat.get(1, function (err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Fluffy');

      model.name = 'Bad Cat';
      model.vet.name = 'Tough Vet';
      model.ears[0].name = 'right';

      model.save(function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function (err, badCat) {
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
    Cat.get(1, function (err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        condition: '#name = :name',
        conditionNames: {name: 'name'},
        conditionValues: {name: 'Muffin'}
      }, function (err) {
        should.exist(err);
        err.code.should.eql('ConditionalCheckFailedException');

        Cat.get({id: 1}, {consistent: true}, function (err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Bad Cat');
          done();
        });
      });
    });
  });

  it('Save existing item with a true condition', function (done) {
    Cat.get(1, function (err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Bad Cat');

      model.name = 'Whiskers';
      model.save({
        condition: '#name = :name',
        conditionNames: {name: 'name'},
        conditionValues: {name: 'Bad Cat'}
      }, function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function (err, whiskers) {
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

    Cat.get(1, function (err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Whiskers');

      model.name = 'Fluffy';
      model.vet.name = 'Nice Guy';
      model.save(function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function (err, badCat) {
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

  it('Deletes item', function (done) {

    var cat = new Cat({id: 1});

    cat.delete(done);
  });

  it('Get missing item', function (done) {


    Cat.get(1, function (err, model) {
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
    Cat2.delete({ownerId: 666, name: 'Garfield'}, function (err) {
      should.not.exist(err);
      Cat2.get({ownerId: 666, name: 'Garfield'}, function (err, delCat) {
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
    Cat.delete(666, {update: true}, function (err, data) {
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
    Cat.delete(666, {update: true}, function (err) {
      should.exist(err);
      err.statusCode.should.eql(400);
      err.code.should.eql('ConditionalCheckFailedException');
      done();
    });
  });


  describe('Model.update', function () {
    before(function (done) {
      var stray = new Cat({id: 999, name: 'Tom'});
      stray.save(done);
    });

    it('False condition', function (done) {
      Cat.update({id: 999}, {name: 'Oliver'}, {
        condition: '#name = :name',
        conditionNames: {name: 'name'},
        conditionValues: {name: 'Muffin'}
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
        conditionNames: {name: 'name'},
        conditionValues: {name: 'Tom'}
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

    it('Default puts attribute', function (done) {
      Cat.update({id: 999}, {name: 'Tom'}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        data.name.should.equal('Tom');
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

    it('Manual puts attribute with removal', function (done) {
      Cat.update({id: 999}, {$PUT: {name: null}}, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        data.id.should.eql(999);
        should.not.exist(data.name);
        Cat.get(999, function (err, tomcat) {
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
        Cat.get(999, function (err, tomcat) {
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
        Cat.get(999, function (err, tomcat) {
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
        Cat.get(999, function (err, tomcat) {
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
  });

  describe('Model.batchPut', function () {

    it('Put new', function (done) {
      var cats = [];

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat({id: 10 + i, name: 'Tom_' + i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (var i = 0; i < 10; ++i) {

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

      for (var i = 0; i < 100; ++i) {
        cats.push(new Cat({id: 100 + i, name: 'Tom_' + i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);
        Object.getOwnPropertyNames(result.UnprocessedItems).length.should.eql(0);

        for (var i = 0; i < 100; ++i) {
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 10 + i, name: 'Tom_' + i}));
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 10 + i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.exist(err);
        should.not.exist(result);
        done();
      });
    });

    it('Update items', function (done) {
      var cats = [];

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat({id: 20 + i, name: 'Tom_' + i}));
      }

      Cat.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i = 0; i < 10; ++i) {
          var cat = cats[i];
          cat.name = 'John_' + (cat.id + 100);
        }

        Cat.batchPut(cats, function (err2, result2) {
          should.not.exist(err2);
          should.exist(result2);
          Object.getOwnPropertyNames(result2.UnprocessedItems).length.should.eql(0);

          for (var i = 0; i < 10; ++i) {
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 20 + i, name: 'Tom_' + i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i = 0; i < 10; ++i) {
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 20 + i, name: 'Tom_' + i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i = 0; i < 10; ++i) {
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

  describe('Model.batchDelete', function () {
    it('Simple delete', function (done) {
      var cats = [];

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat({id: 30 + i, name: 'Tom_' + i}));
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 30 + i, name: 'Tom_' + i}));
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

      for (var i = 0; i < 10; ++i) {
        cats.push(new Cat2({ownerId: 30 + i, name: 'Tom_' + i}));
      }

      Cat2.batchPut(cats, function (err, result) {
        should.not.exist(err);
        should.exist(result);

        for (var i = 0; i < 10; ++i) {
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
});
