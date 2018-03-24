'use strict';

var dynamoose = require('../');
dynamoose.AWS.config.update({accessKeyId: 'AKID', secretAccessKey: 'SECRET', region: 'us-east-1'});

dynamoose.local();

var should = require('should');

describe.only('Plugin', function() {
	var Model = dynamoose.model('Puppy', {
    id: {
      type: Number,
      validate: function(v) {
        return v > 0;
      }
    },
    name: String,
    owner: String,
    age: {
      type: Number
    }
  }, {useDocumentTypes: true});
  
  
	this.timeout(15000);
	before(function(done) {
		this.timeout(12000);
		dynamoose.setDefaults({prefix: 'test-'});

		done();
	});

	beforeEach(function(done) {
		Model.clearAllPlugins();
		done();
	});

	after(function(done) {

		delete dynamoose.models['test-Cat'];
		done();
	});

	it('Should create simple plugin', function(done) {    
    Model.$__.plugins.length.should.eql(0);
    
    Model.plugin(function(obj) {
      should.exist(obj.on);
      should.exist(obj.setName);
      should.exist(obj.setDescription);
    });
    
    Model.$__.plugins.length.should.eql(1);
    
    done();
	});
  
  it('Should delete all plugins after calling Model.clearAllPlugins()', function(done) {    
    Model.$__.plugins.length.should.eql(0);
    
    Model.plugin(function(obj) {
      should.exist(obj.on);
      should.exist(obj.setName);
      should.exist(obj.setDescription);
    });
    
    Model.$__.plugins.length.should.eql(1);
    
    Model.clearAllPlugins();
    
    Model.$__.plugins.length.should.eql(0);
    
    done();
  });
  
  it('Should call plugin:register listener when plugin is registered', function(done) {        
    var counter = 0;
    
    Model.plugin(function(obj) {
      obj.on("plugin:register", function() {
        counter++;
      });
    });
    
    counter.should.eql(1);
    
    done();
  });
  
  it('Should call plugin:register listener when new plugin is registered', function(done) {        
    var counter = 0;
    
    Model.plugin(function(obj) {
      obj.on("plugin:register", function() {
        counter++;
      });
    });
    
    counter.should.eql(1); // plugin 1 post
    
    Model.plugin(function(obj) {
      obj.on("plugin:register", function() {
      });
    });
    
    counter.should.eql(3); // plugin 1 post, plugin 2 pre & post
    
    done();
  });
  
  it('Shouldn\'t fail if no function passed into .on function', function(done) {        
    
    Model.plugin(function(obj) {
      obj.on("plugin:register");
    });
    
    done();
  });
  
  it('Should pass in details into "plugin:register" on function', function(done) {            
    Model.plugin(function(obj) {
      obj.on("plugin:register", function (obj) {
        should.exist(obj.event);
        should.exist(obj.model);
        should.exist(obj.modelName);
        should.exist(obj.plugin);
        should.exist(obj.plugins);
        obj.plugins.length.should.eql(1);
      });
    });
    
    done();
  });
  
  it('Plugin Options should equal empty object if not defined', function(done) {            
    Model.plugin(function(obj) {
      obj.on("plugin:register", function (obj) {
        obj.event.pluginOptions.should.deep.eql({});
      });
    });
    done();
  });
  
  it('Plugin Options should equal object passed in', function(done) {            
    Model.plugin(function(obj) {
      obj.on("plugin:register", function (obj) {
        obj.event.pluginOptions.should.deep.eql({username: 'test'});
      });
    }, {username: 'test'});
    done();
  });
  
  it('Type of "*" should catch all events emited from Dynamoose', function(done) {        
    var counter = 0;
    
    Model.plugin(function(obj) {
      obj.on("*", function () {
        counter++;
      });
    });
    
    counter.should.eql(1);
    
    done();
  });
  
  it('No type passed in should catch all events emited from Dynamoose', function(done) {        
    var counter = 0;
    
    Model.plugin(function(obj) {
      obj.on(function () {
        counter++;
      });
    });
    
    counter.should.eql(1);
    
    done();
  });

});
