# Dynamoose

[![Join the chat at https://gitter.im/dynamoosejs/Lobby](https://badges.gitter.im/dynamoosejs/Lobby.svg)](https://gitter.im/dynamoosejs/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Build Status](https://travis-ci.org/automategreen/dynamoose.svg)](https://travis-ci.org/automategreen/dynamoose) [![Coverage Status](https://coveralls.io/repos/github/automategreen/dynamoose/badge.svg?branch=master)](https://coveralls.io/github/automategreen/dynamoose?branch=master)

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

The documentation can be found at https://dynamoosejs.com/api. You can also find additional examples at https://dynamoosejs.com/examples.

## Help Wanted!

Help improve Dynamoose.  I need all the help I can get to improve test coverage and the documentation.  If you would like to help please look at the `/test` folder to add tests to the project along with `/docs/_docs` and `/docs/_examples` folders to help write better documentation and examples for Dynamoose.  You can create a PR (pull request) to get your changes merged in.  Thank you very much!!

## ChangeLog

The Dynamoose ChangeLog can be found in the [CHANGELOG.md](//github.com/automategreen/dynamoose/blob/master/CHANGELOG.txt) file.

## Roadmap

The Dynamoose Roadmap can be found in the [ROADMAP.md](//github.com/automategreen/dynamoose/blob/master/ROADMAP.txt) file. Help is always appreciated on these items. If you are able to help submit a PR so we can review and improve Dynamoose!
