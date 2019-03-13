# Dynamoose

[![Slack Chat](https://img.shields.io/badge/chat-on%20slack-informational.svg)](https://publicslack.com/slacks/dynamoose/invites/new) [![Build Status](https://travis-ci.org/dynamoosejs/dynamoose.svg)](https://travis-ci.org/dynamoosejs/dynamoose) [![Coverage Status](https://coveralls.io/repos/github/dynamoosejs/dynamoose/badge.svg?branch=master)](https://coveralls.io/github/dynamoosejs/dynamoose?branch=master)

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

The documentation can be found at https://dynamoosejs.com/api/about/. You can also find additional examples at https://dynamoosejs.com/examples/about/.

## Changelog

The Dynamoose Changelog can be found in the [CHANGELOG.md](//github.com/dynamoosejs/dynamoose/blob/master/CHANGELOG.md) file.

## Roadmap

The Dynamoose Roadmap can be found in the [ROADMAP.md](//github.com/dynamoosejs/dynamoose/blob/master/ROADMAP.md) file. Help is always appreciated on these items. If you are able to help submit a PR so we can review and improve Dynamoose!

## Contributing

To contirubute to this project please checkout our [CONTRIBUTING.md](//github.com/dynamoosejs/dynamoose/blob/master/CONTRIBUTING.md) file.
