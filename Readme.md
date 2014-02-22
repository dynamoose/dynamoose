# Dynamoose

Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](http://mongoosejs.com/))

In switching from MongoDB/Mongoose to DynamoDB, we missed the modeling provided by Mongoose. There are several great modules out there, but they didn't match our needs.  We created Dynamoose based on our usage.

Dynamoose uses the official [AWS SDK](https://github.com/aws/aws-sdk-js).

## Installation

    $ npm install dynamoose
    
## Stability

**Unstable** This module is currently under development and functionally may change.

## Overview

Here's a simple example:

```js

var dynamoose = require('dynamoose');

dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});

var Cat = dynamoose.model('Cat', { id: Number, name: String });

var badCat = new Cat({id: 666, name: 'Garfield'});

badCat.save(function (err) {
  if (err) { return console.log(err); }
  console.log('Never trust a smiling cat.');
});

```

## API

### Dynamoose

```js
var dynamoose = require('dynamoose');
```

#### dynamoose.model(name, schema, options)

Compiles a new model or looks up an existing model.

```js
var Cat = dynamoose.model('Cat', { id: Number, name: String });
```

#### dynamoose.local(url)

Configure dynamoose to use a DynamoDB local for testing.

`url` defaults to 'http://localhost:8000'

```js
dynamoose.local();
```

#### dynamoose.ddb()

Configures and returns the AWS.DynamoDB object

#### dynamoose.AWS

AWS object for dynamoose.  Used to configure AWS for dynamoose.

```js
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
```

#### dynamoose.Schema

Schema class

#### dynamoose.Table

Table class


### Schema

```js
var Schema = dynamoose.Schema;
```

#### new Schema(schema, options)

Create a new Schema objects. The schema maps back to a DynamoDB table.

```js
var dogSchema  = new Schema({
  ownerId: {
    type: Number,
    validate: function(v) { return v > 0; },
    hashKey: true
  },
  name: {
    type: String,
    rangeKey: true,
    index: true // name: nameLocalIndex, ProjectionType: ALL
  },
  breed: {
    type: String,
    trim: true,
    required: true,
    index: {
      global: true,
      rangeKey: 'ownerId',
      name: 'BreedIndex',
      project: true, // ProjectionType: ALL
      throughput: 5 // read and write are both 5
    }
  },
  color: {
    lowercase: true,
    type: [String],
    default: ['Brown']
  },
  age: Number
},
{
  throughput: {read: 15, write: 5}
});
```

##### Attribute Types

Each key represents an attribute in the DynamoDB table.  The value of the key can either be the attribute type or an Object describing the attribute.

Valid attribute types are:

- String
- Number
- Boolean
- Date
- Object
- Array
- Buffer

String, Boolean, Object, and Array all map to the DynamoDB type of 'S'.  Number and Date map to 'N'. Buffer maps to 'B'.

Types can also be sets of the above types.  This is done by making the type an array. For example, [String] would be a String Set (DynamoDB 'SS') and [Number] would be a Number Set (DynamoDB 'NS').

##### Attribute Definition

**type**: AttributeType _required_

Required for all attribute definitions. Defines the attribute type.  See [Attribute Types](#attribute-types).

**hashKey**: boolean

Defines the hash key attribute for the table.  If no attribute is defined as the hash key, the first attribute is assumed to be the hash key.

**rangeKey**: boolean

Defines the range key attribute.

**required**: boolean

Defines if the attribute is required.  Prior to saving an entry, if the attribute is undefined or null, an error will be thrown.

**index**: boolean | {...}

Defines the attribute as a local or global secondary index. Index can either be true or an index definition object. The index definition object can contain the following keys:

- _name: 'string'_ - Name of index (Default is `attribute.name + (global ? 'GlobalIndex' : 'LocalIndex')``).
- _global: boolean_ - Set the index to be a global secondary index.  Attribute will be the hash key for the Index.
- _rangeKey: 'string'_ - The range key for a global secondary index.
- _project: boolean | ['string', ...]_ - Sets the attributes to be projected for the index.  `true` projects all attributes, `false` projects only the key attributes, and ['string', ...] projects the attributes listed. Default is `true`.
- _throughput: number | {read: number, write: number}_ - Sets the throughput for the global secondary index.

**default**: function | value

Applies a default to the attribute's value when saving, if the values is null or undefined.

If default is a function, the function is called, and the response is assigned to the attribute's value.

If it is a value, the value is simply assigned. 

**validate**: function | RegExp | value

Validation required before for saving.  

If validate is a function, the function is used to validate the attribute's value. The function must have the signature:

```js
function(value) {
  if(valid)
    return true;
  else
    return false;
}
```

If it is a RegExp, it is compared using `RegExp.text(value)`.

If it is a value, it is compared with `===`.

**trim**: boolean

Trim whitespace from string when saving to DB.

**lowercase**: boolean

Convert to lowercase when saving to DB.

**uppercase**: boolean

Convert to uppercase when saving to DB.

##### Options

**throughput**: boolean | {read: number, write: number}

Sets the throughput of the DynamoDB table.  The value can either be a number or an Object with the keys read and write `{read: 5, write: 2}`. If it is a number, both read and write are configured to the same number.  If it is omitted, the default value is 1 for both read and write.

```js
var schema = New Schema({...}, { throughput: 5});
var schema = New Schema({...}, { throughput: { read: 5, write: 2 } });
```

### Model

```js
var Dog = dynamoose.model('Dog', dogSchema);
```

#### new Model(object)

Creates a new instance of the model. Object keys are assigned to the new model.

```js
var odie = new Dog({
  ownerId: 4,
  name: 'Odie',
  breed: 'Beagle',
  color: ['Tan'],
  cartoon: true
});
```

#### model.put(callback) & model.save(callback)

Puts the item in the DynamoDB table.  Will overwrite the item.

```js
odie.save(function (err) {
  if(err) { return console.log(err); }
  console.log('Ta-da!');
});
```

#### Model.get(key, options, callback)

Get's an item from the table. 

```js
Dog.get('{ownerId: 4, name: 'Odie'}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```

#### model.delete(callback)

Deletes the item from the table.

```js
odie.delete(function(err) {
  if(err) { return console.log(err); }
  console.log('Bye bye Odie');
});
```

#### Model.query(query, options, callback)

Queries a table or index.  If callback is not provided, then a Query object is returned. See [Query](#query).

#### Model.scan(filter, options, callback)

Scans a table. If callback is not provided, then a Scan object is returned. See [Scan](#scan).

#### Model.update(key, update, callback)

*Future release*

### Query

#### Model.query(query, options, callback)

Queries a table or index. The query parameter can either the the hash key of the table or global index or a complete query object. If the callback is provided, the exec command is called automatically, and the query parameter must be a query object.

```js
Dog.query('breed').eq('Beagle').exec(function (err, dogs) {
  // Look at all the beagles
});
```

```js
Dog.query({breed: {eq: 'Beagle'} }, function (err, dogs) {
  // Look at all the beagles
});
```

#### query.exec(callback)

Executes the query against the table or index.

#### query.where(rangeKey)

Set the range key of the table or index to query. 

#### query.eq(value)

Hash or range key must equal the value provided. This is the only comparison option allowed for a hash key.

#### query.lt(value)

Range key less than the value.

#### query.le(value)

Range key less than or equal value.

#### query.ge(value)

Range key greater than or equal value.

#### query.gt(value)

Range key greater than the value.

#### query.beginsWith(value)

Range key begins with value

#### query.between(a, b)

Range key is between values a and b.

#### query.limit(limit)

Limit the number of responses.

#### query.consistent()

Query with consistent read.

#### query.descending()

Sort in descending order.

#### query.ascending()

Sort in ascending order (default).

#### query.startAt(key)

Start query at key.  Use LastEvaluatedKey returned in query.exec() callback.

#### query.attributes(attributes)

Set the attributes to return.

### Scan


#### Model.scan(filter, options, callback)

Scans a table. The optional filter parameter can either be an attribute of the table or a complete filter object. If the callback is provided, the exec command is called automatically, and the scan parameter must be a Scan object.

```js
Dog.scan('breed').contains('Terrier').exec(function (err, dogs) {
  // Look at all the Terriers
});
```

```js
Dog.scan({breed: {contains: 'Terrier'} }, function (err, dogs) {
  // Look at all the Terriers
});
```

To get all the items in a table, do not provide a filter. 

```js
Dog.scan().exec(function (err, dogs, lastKey) {
  // Look at all the dogs
  if(lastKey) { // More dogs to get
    Dog.scan().startAt(lastKey).exec(function (err, dogs, lastKey) {
      // Look more dogs
    });
  }
});
```

#### scan.exec(callback)

Executes a scan against a table

#### scan.and()

For readability only. Scans us AND logic for multiple attributes.  `and()` does not provide any functionality and can be omitted.

#### scan.where(filter)

Add additional attribute to the filter list.

#### scan.not()

Inverts the filter logic that follows.

#### scan.null()

Scan attribute for null.

#### scan.eq(value)

Attribute is equal to the value.

#### scan.lt(value)

Attribute is less than the value.

#### scan.le(value)

Attribute is less than or equal value.

#### scan.ge(value)

Attribute is greater than or equal value.

#### scan.gt(value)

Attribute is greater than the value.

#### scan.contains(value)

Attribute contains the value.

#### scan.beginsWith(value)

Attribute begins with the value.

#### scan.in(values)

Attribute is in values array.

#### scan.between(a, b)

Attribute is between value a and b.

#### scan.limit(limit)

Limit scan response to limit.

#### scan.startAt(key)

Start scan at key.  Use LastEvaluatedKey returned in scan.exec() callback.

#### scan.attributes(attributes)

Set the attributes to return.