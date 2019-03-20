'use strict';
const dynamooseModule = require('../lib/Dynamoose');
const dynamoose = dynamooseModule.default;
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

});
