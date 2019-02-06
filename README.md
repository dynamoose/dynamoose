# Dynamoose

[![Join the chat at https://gitter.im/dynamoosejs/Lobby](https://badges.gitter.im/dynamoosejs/Lobby.svg)](https://gitter.im/dynamoosejs/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Build Status](https://travis-ci.org/dynamoosejs/dynamoose.svg)](https://travis-ci.org/dynamoosejs/dynamoose) [![Coverage Status](https://coveralls.io/repos/github/dynamoosejs/dynamoose/badge.svg?branch=master)](https://coveralls.io/github/dynamoosejs/dynamoose?branch=master)

Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](http://mongoosejs.com/))


## Getting Started

### Installation

    $ npm i dynamoose

### Example

Set AWS configurations in environment variables:

```sh
export AWS_ACCESS_KEY_ID="Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY="Your AWS Secret Access Key"
export AWS_REGION="us-east-1"
```

Here's a simple example:

```js
const dynamoose = require('dynamoose');

// Create cat model with default options
const Cat = dynamoose.model('Cat', {
  id: Number,
  name: String
});

// Create a new cat object
const garfield = new Cat({
  id: 666,
  name: 'Garfield'
});

// Save to DynamoDB
garfield.save(); // Returns a promise that resolves when save has completed

// Lookup in DynamoDB
Cat.get(666).then((badCat) => {
  console.log(`Never trust a smiling cat. - ${badCat.name}`);
});
```

## API Docs

The documentation can be found at https://dynamoosejs.com/api. You can also find additional examples at https://dynamoosejs.com/examples.

## Changelog

The Dynamoose Changelog can be found in the [CHANGELOG.md](//github.com/dynamoosejs/dynamoose/blob/master/CHANGELOG.md) file.

## Roadmap

The Dynamoose Roadmap can be found in the [ROADMAP.md](//github.com/dynamoosejs/dynamoose/blob/master/ROADMAP.md) file. Help is always appreciated on these items. If you are able to help submit a PR so we can review and improve Dynamoose!

## Development Scripts

Dynamoose has a few helpers for local development. These are included in the scripts section of our `package.json`.

### npm test

This will run all of our tests via a node script. This spins up a local DynamoDB Local instance, runs Mocha, and closes the DynamoDB Local instance at completion.

### npm run test:debug

Same as above, but launched with `--inspect`. This will allow you to place debugger statements for working in the tests.

### npm run test:debug:brk

Same as above, but launched with `--inspect-brk`. This will allow you to place debugger statements for working in the tests, and not initialize the tests until you manually start it.

### npm run lint

This will run our lint configuration against all of our source files and alert you to any issues.

### npm run ci

This will run our lint, test, and coverage scripts. This is exactly what travis runs, if you'd like to verify prior to commit.

### husky

This is a helper for commit sanity. This will run our lint prior to commit, and full ci prior to push.


