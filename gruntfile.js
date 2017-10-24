'use strict';

var DynamoDbLocal = require('dynamodb-local');
var DYNAMO_DB_PORT = 8000;

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      app: {
        src: ['gruntfile.js', 'index.js', 'lib/**/*.js'],
        options: {
          node: true,
          jshintrc: '.jshintrc'
        }
      },
      test: {
        src: ['test/**/*.js' ],
        options: {
          node: true,
          jshintrc: 'test/.jshintrc'
        }
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    }
  });

  // Load libs
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('dynamo:start', function() {
    var getPID = 'ps aux | grep "DynamoDBLocal.jar -port ' +
                 DYNAMO_DB_PORT  +
                 '" | grep -v grep | awk \'{print $2}\'';
    var done = this.async();
    require('child_process').exec(getPID, function (err, pid) {
      if(err) {
        return done(err);
      }
      if(pid) {
        console.log('Killing DynamoDBLocal process');
        process.kill(pid);
      } else {
        console.log('No DynamoDBLocal process running');
      }

      DynamoDbLocal
      .launch(DYNAMO_DB_PORT)
      .then(function() { done(); })
      .catch(function(e) { done(e); });
    });
  });

  // Register the default tasks
  grunt.registerTask('default', ['jshint', 'dynamo:start', 'mochaTest']);

  grunt.registerTask('test', ['jshint', 'dynamo:start', 'mochaTest:test']);
};
