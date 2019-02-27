## Installation

    $ npm i dynamoose

## Example

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
