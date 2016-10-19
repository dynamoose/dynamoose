/* eslint no-invalid-this: 'off' */
'use strict';

//var util = require('util');

var dynamoose = require('../');
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

dynamoose.local();

var Schema = dynamoose.Schema;

var should = require('should');


describe('Schema tests', function () {
  this.timeout(5000);

  it('Simple schema', function (done) {
    var schemaObj = {
      id: Number,
      name: String,
      children: [Number],
      aObject: Object,
      aArray: Array,
      aMap: {
        mapId: Number,
        mapName: String,
        anotherMap: {
          m1: String,
        }
      },
      aList: [
        {
          listMapId: Number,
          listMapName: String
        }
      ]
    };

    var schema = new Schema(schemaObj);

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

    schema.attributes.children.type.name.should.eql('number');
    schema.attributes.children.isSet.should.be.ok;
    should.not.exist(schema.attributes.children.default);
    should.not.exist(schema.attributes.children.validator);
    should(schema.attributes.children.required).not.be.ok;

    schema.attributes.aObject.type.name.should.eql('object');

    schema.attributes.aArray.type.name.should.eql('array');

    schema.attributes.aMap.type.name.should.eql('object');

    schema.attributes.aList.type.name.should.eql('array');

    schema.hashKey.should.equal(schema.attributes.id); // should be same object
    should.not.exist(schema.rangeKey);

    schema.throughput.read.should.equal(1);
    schema.throughput.write.should.equal(1);

    done();
  });

  it('Schema with basic options', function (done) {
    var schema = new Schema({
      id: {
        type: Number,
        validate: function (v) {
          return v > 0;
        },
        rangeKey: true
      },
      breed: {
        type: String,
        hashKey: true
      },
      name: {
        type: String,
        required: true
      },
      color: {
        type: String,
        default: 'Brown'
      },
      born: {
        type: Date,
        default: Date.now
      },
      aObject: {
        type: 'Object',
        default: {state: 'alive'}
      },
      aMap: {
        type: 'map',
        map: {
          mapId: {type: Number, required: true},
          mapName: {type: String, required: true}
        }
      },
      aList: {
        type: 'list',
        list: [
          {
            listMapId: {type: Number, default: 1},
            listMapName: {type: String, default: 'SomeName'}
          }
        ]
      }
    }, {throughput: {read: 10, write: 2}});

    schema.attributes.id.type.name.should.eql('number');
    should(schema.attributes.id.isSet).not.be.ok;
    should.not.exist(schema.attributes.id.default);
    var validator = schema.attributes.id.validator;
    should.exist(validator);
    validator(-1).should.not.be.ok;
    validator(1).should.be.ok;
    should(schema.attributes.id.required).not.be.ok;

    schema.attributes.name.type.name.should.eql('string');
    schema.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema.attributes.name.default);
    should.not.exist(schema.attributes.name.validator);
    schema.attributes.name.required.should.be.ok;

    schema.attributes.color.type.name.should.eql('string');
    schema.attributes.color.isSet.should.not.be.ok;
    schema.attributes.color.default().should.eql('Brown');
    should.not.exist(schema.attributes.color.validator);
    should(schema.attributes.color.required).not.be.ok;

    schema.attributes.born.type.name.should.eql('date');
    schema.attributes.born.isSet.should.not.be.ok;
    schema.attributes.born.default().should.be.ok;
    should.not.exist(schema.attributes.born.validator);
    should(schema.attributes.born.required).not.be.ok;

    schema.attributes.aObject.type.name.should.eql('object');
    should.exist(schema.attributes.aObject.default);

    schema.attributes.aMap.type.name.should.eql('object');

    schema.attributes.aList.type.name.should.eql('array');

    schema.hashKey.should.equal(schema.attributes.breed); // should be same object
    schema.rangeKey.should.equal(schema.attributes.id);

    schema.throughput.read.should.equal(10);
    schema.throughput.write.should.equal(2);

    done();
  });

  it('Schema with timestamps options', function (done) {
    var schema1 = new Schema({
      id: {
        type: Number,
        validate: function (v) {
          return v > 0;
        },
        rangeKey: true
      },
      name: {
        type: String,
        required: true
      },
    },
      {
        throughput: {read: 10, write: 2},
        timestamps: true
      });

    var schema2 = new Schema({
      id: {
        type: Number,
        validate: function (v) {
          return v > 0;
        },
        rangeKey: true
      },
      name: {
        type: String,
        required: true
      },
    },
      {
        throughput: {read: 10, write: 2},
        timestamps: {createdAt: 'createDate', updatedAt: 'lastUpdate'}
      });

    schema1.attributes.id.type.name.should.eql('number');
    should(schema1.attributes.id.isSet).not.be.ok;
    should.not.exist(schema1.attributes.id.default);
    var validator = schema1.attributes.id.validator;
    should.exist(validator);
    validator(-1).should.not.be.ok;
    validator(1).should.be.ok;
    should(schema1.attributes.id.required).not.be.ok;

    schema1.attributes.name.type.name.should.eql('string');
    schema1.attributes.name.isSet.should.not.be.ok;
    should.not.exist(schema1.attributes.name.default);
    should.not.exist(schema1.attributes.name.validator);
    schema1.attributes.name.required.should.be.ok;

    schema1.rangeKey.should.equal(schema1.attributes.id);

    schema1.throughput.read.should.equal(10);
    schema1.throughput.write.should.equal(2);
    //
    // Schema1 timestamps validation
    //
    schema1.timestamps.should.exists;
    schema1.timestamps.createdAt.should.exists;
    schema1.timestamps.createdAt.should.be.equal('createdAt');
    schema1.timestamps.updatedAt.should.exists;
    schema1.timestamps.updatedAt.should.be.equal('updatedAt');

    schema1.attributes.createdAt.type.name.should.eql('date');
    should.exist(schema1.attributes.createdAt.default);

    schema1.attributes.updatedAt.type.name.should.eql('date');
    should.exist(schema1.attributes.updatedAt.default);
    //
    // Schema2 timestamps validation
    //
    schema2.timestamps.should.exists;
    schema2.timestamps.createdAt.should.exists;
    schema2.timestamps.createdAt.should.be.equal('createDate');
    schema2.timestamps.updatedAt.should.exists;
    schema2.timestamps.updatedAt.should.be.equal('lastUpdate');

    schema2.attributes.createDate.type.name.should.eql('date');
    should.exist(schema2.attributes.createDate.default);

    schema2.attributes.lastUpdate.type.name.should.eql('date');
    should.exist(schema2.attributes.lastUpdate.default);

    done();
  });


  it('Schema with use Document Types', function (done) {
    var schema = new Schema({
      id: {
        type: Number,
        validate: function (v) {
          return v > 0;
        },
        rangeKey: true
      },
      breed: {
        type: String,
        hashKey: true
      },
      aObject: {
        type: 'Object',
        default: {state: 'alive'}
      },
      anotherObject: Object,
      aArray: Array,
      aMap: {
        mapId: Number,
        mapName: String,
        anotherMap: {
          m1: String,
        }
      },
      aList: [
        {
          listMapId: Number,
          listMapName: String
        }
      ],
      anotherMap: {
        type: 'map',
        map: {
          mapId: {type: Number, required: true},
          mapName: {type: String, required: true}
        }
      },
      anotherList: {
        type: 'list',
        list: [
          {
            listMapId: {type: Number, default: 1},
            listMapName: {type: String, default: 'SomeName'}
          }
        ]
      }
    }, {useDocumentTypes: true});

    schema.useDocumentTypes.should.be.ok;

    schema.attributes.aObject.type.name.should.eql('object');
    schema.attributes.anotherObject.type.name.should.eql('object');
    schema.attributes.aArray.type.name.should.eql('array');

    schema.attributes.aMap.type.name.should.eql('map');

    schema.attributes.aMap.type.name.should.eql('map');
    schema.attributes.aMap.attributes.mapId.type.name.should.eql('number');
    schema.attributes.aMap.attributes.mapName.type.name.should.eql('string');
    should.not.exist(schema.attributes.aMap.attributes.mapId.default);
    should.not.exist(schema.attributes.aMap.attributes.mapId.validator);
    should(schema.attributes.aMap.attributes.mapId.required).not.be.ok;
    schema.attributes.aMap.attributes.anotherMap.attributes.m1.type.name.should.eql('string');

    schema.attributes.anotherMap.attributes.mapId.type.name.should.eql('number');
    schema.attributes.anotherMap.attributes.mapId.required.should.be.ok;
    schema.attributes.anotherMap.attributes.mapName.type.name.should.eql('string');
    schema.attributes.anotherMap.attributes.mapName.required.should.be.ok;

    schema.attributes.aList.type.name.should.eql('list');
    schema.attributes.aList.attributes[0].attributes.listMapId.type.name.should.eql('number');
    schema.attributes.aList.attributes[0].attributes.listMapName.type.name.should.eql('string');

    schema.attributes.anotherList.attributes[0].attributes.listMapId.type.name.should.eql('number');
    schema.attributes.anotherList.attributes[0].attributes.listMapId.default().should.be.ok;
    schema.attributes.anotherList.attributes[0].attributes.listMapName.type.name.should.eql('string');
    schema.attributes.anotherList.attributes[0].attributes.listMapName.default().should.be.ok;

    done();
  });

  it('Schema with secondary indexes', function (done) {
    var schema = new Schema({
      ownerId: {
        type: Number,
        validate: function (v) {
          return v > 0;
        },
        hashKey: true
      },
      breed: {
        type: String,
        rangeKey: true,
        index: {
          global: true,
          rangeKey: 'color',
          name: 'IdGlobalIndex',
          project: true, // ProjectionType: ALL
          throughput: 5 // read and write are both 5
        }
      },
      name: {
        type: String,
        required: true,
        index: true // name: nameLocalIndex, ProjectionType: ALL
      },
      color: {
        type: String,
        default: 'Brown',
        index: [{ // name: colorLocalIndex
          project: ['name'] // ProjectionType: INCLUDE
        }, { // name: colorGlobalIndex, no ragne key
          global: true,
          project: ['name', 'breed'] // ProjectionType: INCLUDE
        }]
      },
      born: {
        type: Date,
        default: Date.now,
        index: {
          name: 'birthIndex',
          project: false // ProjectionType: KEYS_ONLY
        }
      }
    });

    schema.attributes.ownerId.type.name.should.eql('number');
    should(schema.attributes.ownerId.isSet).not.be.ok;
    should.not.exist(schema.attributes.ownerId.default);
    var validator = schema.attributes.ownerId.validator;
    should.exist(validator);
    validator(-1).should.not.be.ok;
    validator(1).should.be.ok;
    should(schema.attributes.ownerId.required).not.be.ok;

    var breed = schema.attributes.breed;
    breed.type.name.should.eql('string');
    breed.isSet.should.not.be.ok;
    should.not.exist(breed.default);
    should.not.exist(breed.validator);
    should(breed.required).not.be.ok;
    breed.indexes.should.have.property('IdGlobalIndex');
    breed.indexes.IdGlobalIndex.should.have.property('global', true);
    breed.indexes.IdGlobalIndex.should.have.property('project', true);
    breed.indexes.IdGlobalIndex.should.have.property('rangeKey', 'color');
    breed.indexes.IdGlobalIndex.should.have.property('throughput', {read: 5, write: 5});

    var name = schema.attributes.name;
    name.type.name.should.eql('string');
    name.isSet.should.not.be.ok;
    should.not.exist(name.default);
    should.not.exist(name.validator);
    name.required.should.be.ok;
    name.indexes.should.have.property('nameLocalIndex');
    name.indexes.nameLocalIndex.should.not.have.property('global');
    name.indexes.nameLocalIndex.should.have.property('project', true);
    name.indexes.nameLocalIndex.should.not.have.property('rangeKey');
    name.indexes.nameLocalIndex.should.not.have.property('throughput');


    var color = schema.attributes.color;
    color.type.name.should.eql('string');
    color.isSet.should.not.be.ok;
    color.default().should.eql('Brown');
    should.not.exist(color.validator);
    should(color.required).not.be.ok;
    color.indexes.should.have.property('colorLocalIndex');
    color.indexes.colorLocalIndex.should.not.have.property('global');
    color.indexes.colorLocalIndex.should.have.property('project', ['name']);
    color.indexes.colorLocalIndex.should.not.have.property('rangeKey');
    color.indexes.colorLocalIndex.should.not.have.property('throughput');
    color.indexes.should.have.property('colorGlobalIndex');
    color.indexes.colorGlobalIndex.should.have.property('global', true);
    color.indexes.colorGlobalIndex.should.have.property('project', ['name', 'breed']);
    color.indexes.colorGlobalIndex.should.not.have.property('rangeKey');
    color.indexes.colorGlobalIndex.should.have.property('throughput', {read: 1, write: 1});

    var born = schema.attributes.born;
    born.type.name.should.eql('date');
    born.isSet.should.not.be.ok;
    born.default().should.be.ok;
    should.not.exist(born.validator);
    should(born.required).not.be.ok;
    born.indexes.should.have.property('birthIndex');
    born.indexes.birthIndex.should.not.have.property('global');
    born.indexes.birthIndex.should.have.property('project', false);
    born.indexes.birthIndex.should.not.have.property('rangeKey');
    born.indexes.birthIndex.should.not.have.property('throughput');


    schema.hashKey.should.equal(schema.attributes.ownerId); // should be same object
    schema.rangeKey.should.equal(schema.attributes.breed);

    schema.throughput.read.should.equal(1);
    schema.throughput.write.should.equal(1);

    done();
  });


  it('Schema with added instance methods', function (done) {

    dynamoose.setDefaults({prefix: ''});

    var schema = new Schema({
      id: Number
    });

    schema.method('meow', function () {
      this.lastcall = 'meooowwww';
    });

    var Kitty = dynamoose.model('Kitty', schema);
    var fizz = new Kitty();
    fizz.meow();
    fizz.lastcall.should.eql('meooowwww');

    schema.method({
      purr: function () {
        this.didpurr = 1;
      },
      scratch: function () {
        this.didscratch = 1;
      }
    });

    var Tabby = dynamoose.model('Tabby', schema);
    var tom = new Tabby();

    tom.should.not.have.property('didpurr');
    tom.should.not.have.property('didscratch');

    tom.purr();
    tom.scratch();

    tom.didscratch.should.be.ok;
    tom.didpurr.should.be.ok;


    Tabby.$__.table.delete(function () {
      delete dynamoose.models.Tabby;

      Kitty.$__.table.delete(function () {
        delete dynamoose.models.Kitty;
        done();
      });
    });

  });

  it('Schema with added static methods', function (done) {

    dynamoose.setDefaults({prefix: ''});

    var staticSchema = new Schema({
      name: String
    });

    staticSchema.static('findKittenName', function (name) {
      return name + '\'s kitten';
    });

    var Cat = dynamoose.model('Cat', staticSchema);
    var kitten = Cat.findKittenName('sue');
    kitten.should.eql('sue\'s kitten');

    staticSchema.static({
      findCatsByOwner: function (owner) {
        return owner + 'fluffy';
      },
      findCatsByRace: function (owner) {
        return owner + 'bobbly';
      }
    });

    var Cats = dynamoose.model('Cats', staticSchema);
    var catsByOwner = Cats.findCatsByOwner('fred');
    var catsByRace = Cats.findCatsByRace('siamese');

    catsByOwner.should.eql('fredfluffy');
    catsByRace.should.eql('siamesebobbly');

    Cat.$__.table.delete(function () {
      delete dynamoose.models.Cat;

      Cats.$__.table.delete(function () {
        delete dynamoose.models.Cats;
        done();
      });
    });
  });


  it('Schema with added virtual methods', function (done) {

    var schema = new Schema({
      name: String,
      owner: String
    });

    schema.virtual('mergedname').get(function () {
      return (this._mergedname) ? this._mergedname : this.name;//this.name + this.owner;
    });

    schema.virtual('mergedname').set(function (v) {
      this._mergedname = v;
    });

    var Cat = dynamoose.model('Cat', schema);
    var tim = new Cat();

    tim.name = 'tommy';
    tim.owner = 'bill';

    tim.should.have.property('mergedname');
    tim.mergedname.should.eql('tommy');

    tim.mergedname = 'george';
    tim.mergedname.should.eql('george');


    Cat.$__.table.delete(function () {
      delete dynamoose.models.Cat;
      done();
    });
  });


});
