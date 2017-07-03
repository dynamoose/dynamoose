# Dynamoose [![Build Status](https://travis-ci.org/automategreen/dynamoose.png)](https://travis-ci.org/automategreen/dynamoose)


Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](http://mongoosejs.com/))


## Getting Started

### Installation

    $ npm install dynamoose

### Example

Set AWS configurations in enviroment varable:

```sh
export AWS_ACCESS_KEY_ID="Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY="Your AWS Secret Access Key"
export AWS_REGION="us-east-1"
```

Here's a simple example:

```js
var dynamoose = require('dynamoose');

// Create cat model with default options
var Cat = dynamoose.model('Cat', { id: Number, name: String });

// Create a new cat object
var garfield = new Cat({id: 666, name: 'Garfield'});

// Save to DynamoDB
garfield.save();

// Lookup in DynamoDB
Cat.get(666)
.then(function (badCat) {
  console.log('Never trust a smiling cat. - ' + badCat.name);
});
```

## API Docs

The documentation can be found at https://dynamoosejs.com/api.

## Change log

### Release 0.8

- useNativeBooleans [#55](//github.com/automategreen/dynamoose/issues/55)
- saveUnknown [#125](//github.com/automategreen/dynamoose/issues/125)
- Support for multiple indexes defined on the hashkey attribute of the table
- scan.all() [#93](//github.com/automategreen/dynamoose/issues/93) [#140](//github.com/automategreen/dynamoose/issues/140)
- scan.parallel [d7f7f77](//github.com/automategreen/dynamoose/commit/d7f7f77)
- TTL support [92994f1](//github.com/automategreen/dynamoose/commit/92994f1)
- added schema parsing overrides [#145](//github.com/automategreen/dynamoose/issues/145)
- populate [#137](//github.com/automategreen/dynamoose/issues/137)
- Added consistent() to scan.  [#15](//github.com/automategreen/dynamoose/issues/15) [#142](//github.com/automategreen/dynamoose/issues/142)
- Default function enhancements [#127](//github.com/automategreen/dynamoose/issues/127)
- Create required attributes on update [#96](//github.com/automategreen/dynamoose/issues/96)
- Add typescript typings [#123](//github.com/automategreen/dynamoose/issues/123)
- Added .count() for Query and Scan [#101](//github.com/automategreen/dynamoose/issues/101)
- Nested scans [#141](//github.com/automategreen/dynamoose/issues/141) [#158](//github.com/automategreen/dynamoose/issues/158)


## Roadmap

### Release 0.9

The goal of release 0.9 is to increase the parity with mongoose.  The primary purpose will be to come up with a plugin system similar to that of mongoose although not necessarily compatible.

- [ ] Plugin system
- [ ] `Model.find` alias
- [ ] Complete `.populate` support


### Release 1.0

The main goal of 1.0 will be to improve the code and refactor to ES2015 (ES6).  In addition, `useNativeBooleans` and `useDocumentTypes`  will be toggled to make uses of "newer" DynamoDB features by default.

- [ ] ES2015 updates
- [ ] Switch to ESLint
- [ ] Set `useNativeBooleans` and `useDocumentTypes` to default to `true`
