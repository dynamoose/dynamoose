'use strict';

const dynamoose = require('../lib/');
dynamoose.AWS.config.update({'accessKeyId': 'AKID', 'secretAccessKey': 'SECRET', 'region': 'us-east-1'});

dynamoose.local();

const should = require('should');

describe('Plugin', function () {
  const Model = dynamoose.model('Puppy', {
    'id': {
      'type': Number,
      'validate' (v) {
        return v > 0;
      }
    },
    'name': String,
    'owner': String,
    'age': {
      'type': Number
    }
  }, {'useDocumentTypes': true});


  this.timeout(15000);
  before(function (done) {
    this.timeout(12000);
    dynamoose.setDefaults({'prefix': 'test-'});

    done();
  });

  beforeEach((done) => {
    Model.clearAllPlugins();
    done();
  });

  after((done) => {

    delete dynamoose.models['test-Cat'];
    done();
  });

  it('Should create simple plugin', (done) => {
    Model.$__.plugins.length.should.eql(0);

    Model.plugin((obj) => {
      should.exist(obj.on);
      should.exist(obj.setName);
      should.exist(obj.setDescription);
    });

    Model.$__.plugins.length.should.eql(1);

    done();
  });

  it('Should delete all plugins after calling Model.clearAllPlugins()', (done) => {
    Model.$__.plugins.length.should.eql(0);

    Model.plugin((obj) => {
      should.exist(obj.on);
      should.exist(obj.setName);
      should.exist(obj.setDescription);
    });

    Model.$__.plugins.length.should.eql(1);

    Model.clearAllPlugins();

    Model.$__.plugins.length.should.eql(0);

    done();
  });

  it('Should call plugin:register listener when plugin is registered', (done) => {
    let counter = 0;

    Model.plugin((obj) => {
      obj.on('plugin:register', () => {
        counter += 1;
      });
    });

    counter.should.eql(1);

    done();
  });

  it('Should call plugin:register listener when new plugin is registered', (done) => {
    let counter = 0;

    Model.plugin((obj) => {
      obj.on('plugin:register', () => {
        counter += 1;
      });
    });

    counter.should.eql(1); // plugin 1 post

    Model.plugin((obj) => {
      obj.on('plugin:register', () => {
      });
    });

    counter.should.eql(3); // plugin 1 post, plugin 2 pre & post

    done();
  });

  it('Shouldn\'t fail if no function passed into .on function', (done) => {

    Model.plugin((obj) => {
      obj.on('plugin:register');
    });

    done();
  });

  it('Should pass in details into "plugin:register" on function', (done) => {
    Model.plugin((obj) => {
      obj.on('plugin:register', (objB) => {
        should.exist(objB.event);
        should.exist(objB.model);
        should.exist(objB.modelName);
        should.exist(objB.plugin);
        should.exist(objB.plugins);
        objB.plugins.length.should.eql(1);
      });
    });

    done();
  });

  it('Plugin Options should equal empty object if not defined', (done) => {
    Model.plugin((obj) => {
      obj.on('plugin:register', (objB) => {
        objB.event.pluginOptions.should.deep.eql({});
      });
    });
    done();
  });

  it('Plugin Options should equal object passed in', (done) => {
    Model.plugin((obj) => {
      obj.on('plugin:register', (objB) => {
        objB.event.pluginOptions.should.deep.eql({'username': 'test'});
      });
    }, {'username': 'test'});
    done();
  });

  it('Type of "*" should catch all events emited from Dynamoose', (done) => {
    let counter = 0;

    Model.plugin((obj) => {
      obj.on('*', () => {
        counter += 1;
      });
    });

    counter.should.eql(2);

    done();
  });

  it('No type passed in should catch all events emited from Dynamoose', (done) => {
    let counter = 0;

    Model.plugin((obj) => {
      obj.on(() => {
        counter += 1;
      });
    });

    counter.should.eql(2);

    done();
  });

  it('Should allow sub-plugins or registration of plugins within plugin', (done) => {
    let counter = 0;

    const pluginB = function (plugin) {
      plugin.setName('Plugin B');
      plugin.on('plugin', 'init', () => {
        counter += 1;
      });
    };

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('plugin', 'init', (obj) => {
        obj.actions.registerPlugin(pluginB);
      });
    };


    Model.plugin(pluginA);

    Model.$__.plugins.length.should.eql(2);
    counter.should.eql(1);

    done();
  });

  it('Should work with model:scan', (done) => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:scan', () => {
        counter += 1;
      });
    };


    Model.plugin(pluginA);

    Model.scan({}).exec(() => {
      Model.$__.plugins.length.should.eql(1);
      counter.should.eql(4);

      done();
    });

  });

  it('Should continue for with model:scan request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:scan', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.scan({}).exec((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for with model:scan request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:scan', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.scan({}).exec((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should continue for with model:scan request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:scan', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.scan({}).exec((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should continue for with model:scan request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:scan', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.scan({}).exec((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should work with model:query', (done) => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:query', () => {
        counter += 1;
      });
    };


    Model.plugin(pluginA);

    Model.query('id').eq(1).exec(() => {
      Model.$__.plugins.length.should.eql(1);
      counter.should.eql(4);

      done();
    });

  });

  it('Should continue for with model:query request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:query', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.query('id').eq(1).exec((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for with model:query request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:query', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.query('id').eq(1).exec((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should continue for with model:query request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:query', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.query('id').eq(1).exec((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for with model:query request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:query', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.query('id').eq(1).exec((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should work with model:get', (done) => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:get', () => {
        counter += 1;
      });
    };


    Model.plugin(pluginA);

    Model.get('', () => {
      Model.$__.plugins.length.should.eql(1);
      counter.should.eql(3);

      done();
    });

  });

  it('Should continue for model:get request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:get', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.get('', (err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:get request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:get', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.get('', (err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should continue for model:get request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:get', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.get('', (err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should continue for model:get request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:get', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    Model.get('', (err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should work with model:put', (done) => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', () => {
        counter += 1;
      });
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save(() => {
      Model.$__.plugins.length.should.eql(1);
      counter.should.eql(3);

      done();
    });

  });

  it('Should pass emit object to put:called callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'put:called', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const data = {
      'id': 1,
      'name': 'Lucky',
      'owner': 'Bob',
      'age': 2
    };
    const myItem = new Model(data);
    myItem.save({'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:put');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('put:called');
      emitObject.should.have.propertyByPath('event', 'item').match(data);
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});
      emitObject.should.have.propertyByPath('event', 'callback').which.is.Function;

      emitObject.should.have.propertyByPath('actions', 'updateCallback').which.is.Function;
      emitObject.should.have.propertyByPath('actions', 'updateOptions').which.is.Function;

      done();
    });

  });

  it('Should continue for model:put request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:put request:pre on adding a model', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should pass emit object to model:put request:pre callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:pre', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save({'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:put');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:pre');
      emitObject.should.have.propertyByPath('event', 'item').which.has.keys('Item', 'TableName');
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});

      emitObject.should.have.propertyByPath('actions', 'updateItem').which.is.Function;

      done();
    });

  });

  it('Should continue for model:put request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save((err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:put request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save((err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should pass emit object to model:put request:post callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:put', 'request:post', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const myItem = new Model(
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      }
    );
    myItem.save({'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:put');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:post');
      emitObject.should.have.propertyByPath('event', 'item').which.has.keys('Item', 'TableName');
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});

      emitObject.should.have.propertyByPath('actions', 'updateError').which.is.Function;

      delete myItem.id;
      myItem.save(() => {
        emitObject.should.have.propertyByPath('event', 'error').which.is.not.eql(null).and.has.property('message');

        done();
      });
    });

  });

  it('Should work with model:batchput', (done) => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', () => {
        counter += 1;
      });
    };


    Model.plugin(pluginA);

    const myItem = {
      'id': 1,
      'name': 'Lucky',
      'owner': 'Bob',
      'age': 2
    };
    Model.batchPut([myItem], () => {
      Model.$__.plugins.length.should.eql(1);
      counter.should.eql(3);

      done();
    });

  });

  it('Should continue for model:batchput batchput:called', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'batchput:called', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);


    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, (err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:batchput batchput:called', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'batchput:called', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, (err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should pass emit object to batchput:called callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'batchput:called', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, {'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:batchput');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('batchput:called');
      emitObject.should.have.propertyByPath('event', 'items').which.has.length(2);
      emitObject.should.have.propertyByPath('event', 'items', 0).match(items[0]);
      emitObject.should.have.propertyByPath('event', 'items', 1).match(items[1]);
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});
      emitObject.should.have.propertyByPath('event', 'callback').which.is.Function;

      emitObject.should.have.propertyByPath('actions', 'updateCallback').which.is.Function;
      emitObject.should.have.propertyByPath('actions', 'updateOptions').which.is.Function;

      done();
    });

  });

  it('Should continue for model:batchput request:pre', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, (err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:batchput request:pre on adding a model', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const myItem = {
      'id': 1,
      'name': 'Lucky',
      'owner': 'Bob',
      'age': 2
    };
    Model.batchPut([myItem], (err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should pass emit object to model:batchput request:pre callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:pre', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, {'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:batchput');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:pre');
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});

      emitObject.should.have.propertyByPath('event', 'items').which.has.length(1);
      emitObject.should.have.propertyByPath('event', 'items', 0).which.has.keys('RequestItems');
      const [{RequestItems}] = emitObject.event.items;
      RequestItems.should.have.propertyByPath(Model.$__.name).which.has.length(2);
      RequestItems.should.have.propertyByPath(Model.$__.name, 0, 'PutRequest').which.has.keys('Item');
      RequestItems.should.have.propertyByPath(Model.$__.name, 1, 'PutRequest').which.has.keys('Item');

      emitObject.should.have.propertyByPath('actions', 'updateItems').which.is.Function;

      done();
    });

  });

  it('Should continue for model:batchput request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);


    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, (err, result) => {
      result.should.eql('Test');

      done();
    });

  });

  it('Should not continue for model:batchput request:post', (done) => {

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': 'Test'});
        }, 500);
      }));
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, (err) => {
      err.should.eql('Test');

      done();
    });

  });

  it('Should pass emit object to model:batchput request:post callback', (done) => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:batchput', 'request:post', (obj) => { emitObject = obj; });
    };


    Model.plugin(pluginA);

    const items = [
      {
        'id': 1,
        'name': 'Lucky',
        'owner': 'Bob',
        'age': 2
      },
      {
        'id': 2,
        'name': 'Pharaoh',
        'owner': 'Jack',
        'age': 5
      }
    ];
    Model.batchPut(items, {'prop': true}, () => {
      should.exist(emitObject);
      emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

      emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:batchput');
      emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:post');
      emitObject.should.have.propertyByPath('event', 'items', 'Responses');
      emitObject.should.have.propertyByPath('event', 'items', 'UnprocessedItems').which.is.empty;
      emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});

      emitObject.should.have.propertyByPath('actions', 'updateError').which.is.Function;

      delete items[0].id;
      Model.batchPut(items, () => {
        emitObject.should.have.propertyByPath('event', 'error').which.is.not.eql(null).and.has.property('message');

        done();
      });
    });
  });

  it('Should work with model:update', async () => {
    let counter = 0;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', () => {
        counter += 1;
      });
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 3,
      'name': 'Luna',
      'owner': 'Margaret',
      'age': 3
    });
    await Model.update({'id': 3}, {'$ADD': {'age': 1}});

    Model.$__.plugins.length.should.eql(1);
    counter.should.eql(3);
  });

  it('Should continue for model:update update:called', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'update:called', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 4,
      'name': 'Oliver',
      'owner': 'Bill',
      'age': 1
    });
    const result = await Model.update({'id': 4}, {'$ADD': {'age': 1}}, {'prop': true});

    result.should.eql('Test');
  });

  it('Should not continue for model:update update:called', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'update:called', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': new Error('Test')});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 5,
      'name': 'Daisy',
      'owner': 'Veronica',
      'age': 1
    });

    await Model.update({'id': 5}, {'$ADD': {'age': 1}}, {'prop': true}).should.be.rejectedWith('Test');
  });

  it('Should pass emit object to update:called callback', async () => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'update:called', (obj) => { emitObject = obj; });
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 6,
      'name': 'Rex',
      'owner': 'Mike',
      'age': 1
    });
    await Model.update({'id': 6}, {'$ADD': {'age': 1}}, {'prop': true});

    should.exist(emitObject);
    emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

    emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:update');
    emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('update:called');
    emitObject.should.have.propertyByPath('event', 'key').match({'id': 6});
    emitObject.should.have.propertyByPath('event', 'expression').match({'$ADD': {'age': 1}});
    emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});
    emitObject.should.have.propertyByPath('event', 'callback').which.is.Function;

    emitObject.should.have.propertyByPath('actions', 'updateCallback').which.is.Function;
    emitObject.should.have.propertyByPath('actions', 'updateOptions').which.is.Function;
    emitObject.should.have.propertyByPath('actions', 'updateExpression').which.is.Function;
    emitObject.should.have.propertyByPath('actions', 'updateKey').which.is.Function;
  });

  it('Should continue for model:update request:pre', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 7,
      'name': 'Duke',
      'owner': 'Maria',
      'age': 1
    });
    const result = await Model.update({'id': 7}, {'$ADD': {'age': 1}}, {'prop': true});

    result.should.eql('Test');
  });

  it('Should not continue for model:update request:pre on adding a model', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:pre', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': new Error('Test')});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 8,
      'name': 'Lucy',
      'owner': 'Piper',
      'age': 2
    });

    await Model.update({'id': 8}, {'$ADD': {'age': 1}}, {'prop': true}).should.be.rejectedWith('Test');
  });

  it('Should pass emit object to model:update request:pre callback', async () => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:pre', (obj) => { emitObject = obj; });
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 9,
      'name': 'Ollie',
      'owner': 'Chris',
      'age': 2
    });
    await Model.update({'id': 9}, {'$ADD': {'age': 1}}, {'prop': true});

    should.exist(emitObject);
    emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

    emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:update');
    emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:pre');
    emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});
    emitObject.should.have.propertyByPath('event', 'key').match({'id': 9});
    emitObject.should.have.propertyByPath('event', 'request').which.has.keys('TableName', 'Key', 'ExpressionAttributeNames', 'ExpressionAttributeValues', 'ReturnValues', 'UpdateExpression');

    const {UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues} = emitObject.event.request;
    const exprTokens = UpdateExpression.split(' ');
    exprTokens[0].should.eql('ADD');
    ExpressionAttributeNames.should.have.keys(exprTokens[1]);
    ExpressionAttributeValues.should.have.keys(exprTokens[2]);

    emitObject.should.have.propertyByPath('actions', 'updateRequest').which.is.Function;
  });

  it('Should continue for model:update request:post', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'resolve': 'Test'});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 10,
      'name': 'Louie',
      'owner': 'Nick',
      'age': 1
    });
    const result = await Model.update({'id': 10}, {'$ADD': {'age': 1}}, {'prop': true});

    result.should.eql('Test');
  });

  it('Should not continue for model:update request:post', async () => {
    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:post', () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({'reject': new Error('Test')});
        }, 500);
      }));
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 11,
      'name': 'Sophie',
      'owner': 'Irene',
      'age': 1
    });

    await Model.update({'id': 11}, {'$ADD': {'age': 1}}, {'prop': true}).should.be.rejectedWith('Test');
  });

  it('Should pass emit object to model:update request:post callback', async () => {
    let emitObject;

    const pluginA = function (plugin) {
      plugin.setName('Plugin A');
      plugin.on('model:update', 'request:post', (obj) => { emitObject = obj; });
    };
    Model.plugin(pluginA);

    await Model.create({
      'id': 12,
      'name': 'Tucker',
      'owner': 'Jeff',
      'age': 1
    });
    await Model.update({'id': 12}, {'$ADD': {'age': 1}}, {'prop': true});

    should.exist(emitObject);
    emitObject.should.have.keys('model', 'modelName', 'plugins', 'plugin', 'event', 'actions');

    emitObject.should.have.propertyByPath('event', 'type').which.is.eql('model:update');
    emitObject.should.have.propertyByPath('event', 'stage').which.is.eql('request:post');
    emitObject.should.have.propertyByPath('event', 'options').match({'prop': true});
    emitObject.should.have.propertyByPath('event', 'key').match({'id': 12});
    emitObject.should.have.propertyByPath('event', 'data').which.has.keys('Attributes');
    emitObject.should.have.propertyByPath('event', 'data', 'Attributes').which.has.keys('owner', 'name', 'id', 'age');

    emitObject.should.have.propertyByPath('actions', 'updateError').which.is.Function;
    emitObject.should.have.propertyByPath('actions', 'updateData').which.is.Function;

    await Model.update({'id': 12}, {'$ADD': {'age': 1}}, {'condition': 'attr_not_exists(age)'}).should.be.rejected();

    emitObject.should.have.propertyByPath('event', 'error').which.is.not.eql(null).and.has.property('message');
  });
});
