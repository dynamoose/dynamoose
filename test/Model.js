'use strict';


var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
dynamoose.local();

var should = require('should');


describe('Model', function (){

  it('Create simple model', function (done) {
    var Cat = dynamoose.model('Cat', { id: Number, name: String });

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

    // wait for table to be created
    setTimeout(function() {
        kitten.save(done);
    }, 1000);


  });

  it('Get item for model', function (done) {
    var Cat = dynamoose.model('Cat');

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
    var Cat = dynamoose.model('Cat');

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
    var Cat = dynamoose.model('Cat');

    var cat = new Cat({id: 1});

    cat.delete(done);
  });

  it('Get missing item', function (done) {
    var Cat = dynamoose.model('Cat');


    Cat.get(1, function(err, model) {
      should.not.exist(err);
      should.not.exist(model);
      done();
    });
  });
});