'use strict';

var DynamoDbLocal = require('dynamodb-local');

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
      },
      testCoverage: {
        options: {
          reporter: 'spec',
          require: 'test/coverage/blanket'
        },
        src: ['test/**/*.js']
      },
      coverage: {
        options: {
          reporter: 'html-cov',
          // use the quiet flag to suppress the mocha console output
          quiet: true,
          // specify a destination file to capture the mocha
          // output (the quiet option does not suppress this)
          captureFile: 'coverage.html'
        },
        src: ['test/**/*.js']
      },
      'travis-cov': {
        options: {
          reporter: 'travis-cov'
        },
        src: ['test/**/*.js']
      }
    }
  });

  // Load libs
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('dynamo:start', function() {
    var done = this.async();
    DynamoDbLocal
        .launch(8000)
        .then(function() { done(); })
        .catch(function(e) { done(e); });
  });

  grunt.registerTask('dynamo:stop', function() {
      DynamoDbLocal.stop(8000);
  });

  // Register the default tasks
  grunt.registerTask('default', ['jshint', 'mochaTest']);

  grunt.registerTask('test', ['jshint', 'mochaTest:test']);

  grunt.registerTask('coverage', ['jshint', 'mochaTest:testCoverage', 'mochaTest:coverage', 'mochaTest:travis-cov']);

};