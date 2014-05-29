'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
dynamoose.local();

var should = require('should');

var Cat;

describe('Model', function (){
  this.timeout(5000);


  before(function(done) {
    this.timeout(12000);

    Cat = dynamoose.model('Cat',
    {
      id: Number,
      name: String,
      owner: String,
      age: Number
    });

    done();
  });

  it('Create simple model', function (done) {


    Cat.should.have.property('$__');

    Cat.$__.name.should.eql('Cat');
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

    var kitten = new Cat({id: 1, name: 'Fluffy'});

    kitten.id.should.eql(1);
    kitten.name.should.eql('Fluffy');

    var dynamoObj = schema.toDynamo(kitten);

    dynamoObj.should.eql({ id: { N: '1' }, name: { S: 'Fluffy' } });

    kitten.save(done);


  });

  it('Get item for model', function (done) {

    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.should.have.property('id', 1);
      model.should.have.property('name', 'Fluffy');
      model.should.have.property('$__');
      done();
    });
  });

  it('Save existing item', function (done) {

    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.exist(model);

      model.name.should.eql('Fluffy');

      model.name = 'Bad Cat';
      model.save(function (err) {
        should.not.exist(err);

        Cat.get({id: 1}, {consistent: true}, function(err, badCat) {
          should.not.exist(err);
          badCat.name.should.eql('Bad Cat');
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

  it('Static Delete', function (done) {
    Cat.delete(666, function (err) {
      should.not.exist(err);
      Cat.get(666, function (err, delCat) {
        should.not.exist(err);
        should.not.exist(delCat);
        done();
      });
    });
  });


  describe('Model.update', function (){
    before(function (done) {
      var stray = new Cat({id: 999});
      stray.save(done);
    });

    it('Default puts attribute', function (done) {
      Cat.update({id: 999}, {name: 'Tom'}, function (err) {
        should.not.exist(err);
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


    it('Manual puts attribute', function (done) {
      Cat.update({id: 999}, {$PUT: {owner: 'Jerry', age: 3}}, function (err) {
        should.not.exist(err);
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
      Cat.update({id: 999}, {$ADD: {age: 1}}, function (err) {
        should.not.exist(err);
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
      Cat.update({id: 999}, {$DELETE: {owner: null}}, function (err) {
        should.not.exist(err);
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
  });
});
