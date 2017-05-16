---
title: Dynamoose
layout: single
---

# Dynamoose [![Build Status](https://travis-ci.org/automategreen/dynamoose.png)](https://travis-ci.org/automategreen/dynamoose)


Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](http://mongoosejs.com/))


{% include toc %}

Dynamoose uses the official [AWS SDK](https://github.com/aws/aws-sdk-js).

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

## Specifying AWS credentials

There are three ways to specify AWS credentials:

### .aws/credentials

### Environment Variables

### AWS.config

## Dynamoose API

```js
var dynamoose = require('dynamoose');
```

### dynamoose.model(name, schema, [options])

Compiles a new model or looks up an existing one. `options` is optional.

Default `options`:

```js
{
  create: true, // Create table in DB, if it does not exist,
  update: false, // Update remote indexes if they do not match local index structure
  waitForActive: true, // Wait for table to be created before trying to use it
  waitForActiveTimeout: 180000 // wait 3 minutes for table to activate
}
```

Basic example:

```js
var Cat = dynamoose.model('Cat', { id: Number, name: String });
```

### dynamoose.local(url)

Configure dynamoose to use a DynamoDB local for testing.

`url` defaults to 'http://localhost:8000'

```js
dynamoose.local();
```

### dynamoose.ddb()

Configures and returns the AWS.DynamoDB object

### dynamoose.AWS

AWS object for dynamoose.  Used to configure AWS for dynamoose.

```js
dynamoose.AWS.config.update({
  accessKeyId: 'AKID',
  secretAccessKey: 'SECRET',
  region: 'us-east-1'
});
```

### dynamoose.setDefaults(options)

Sets the default to be used when creating a model. Can be modified on a per model by passing options to `.model()`.

Default `options`:

```js
{
  create: true // Create table in DB if it does not exist
}
```

It is recommended that `create` be disabled for production environments.

```js
dynamoose.setDefaults( { create: false });
```

### dynamoose.Schema

The dynamoose Schema class, used to create new schema definitions. For example:

```js
var appleSchema = new dynamoose.Schema({
  id: Number, 
  type: String
});
```

### dynamoose.Table

Table class


## Model API

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

#### model.put(options, callback) & model.save(options, callback)

Puts the item in the DynamoDB table.  Will overwrite the item.

```js
odie.save(function (err) {
  if(err) { return console.log(err); }
  console.log('Ta-da!');
});

odie.save({
    condition: '#o = :ownerId',
    conditionNames: { o: 'ownerId' },
    conditionValues: { ownerId: 4 }
  }, function (err) {
  if(err) { return console.log(err); }
  console.log('Ta-da!');
});
```

#### Model.batchPut(items, options, callback)

Puts multiple items in the table. Will overwrite existing items.

```js
Dog.batchPut([
  {
    ownerId: 2,
    name: 'Princes',
    breed: 'Jack Russell Terrier',
    color: ['White', 'Brown'],
    cartoon: true
  },
  {
    ownerId: 3,
    name: 'Toto',
    breed: 'Terrier',
    color: ['Brown'],
    cartoon: false
  },
  {
    ownerId: 4,
    name: 'Odie',
    breed: 'Beagle',
    color: ['Tan'],
    cartoon: true
  },
  {
    ownerId: 5,
    name: 'Lassie',
    breed: 'Beagle',
    color: ['Tan'],
    cartoon: false
  }], function (err, dogs) {
    if (err) { return console.log(err); }
    console.log('Ta-da!');
  });
```

##### Options

**overwrite**: boolean

Overwrite existing item. Defaults to true.

**condition**: string

An expression for a conditional update. See
[the AWS documentation](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
for more information about condition expressions.

**conditionNames**: object

A map of name substitutions for the condition expression.

**conditionValues**: object

A map of values for the condition expression. Note that in order for
automatic object conversion to work, the keys in this object must
match schema attribute names.

#### Model.create(object, options, callback)

Creates a new instance of the model and save the item in the table.

```js
Dog.create({
  ownerId: 4,
  name: 'Odie',
  breed: 'Beagle',
  color: ['Tan'],
  cartoon: true
}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```

#### Model.get(key, options, callback)

Gets an item from the table.

```js
Dog.get({ownerId: 4, name: 'Odie'}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```

#### Model.batchGet(keys, options, callback)

Gets multiple items from the table.

```js
Dog.batchGet([{ownerId: 4, name: 'Odie'}, {ownerId: 5, name: 'Lassie'}], function (err, dogs) {
  if (err) { return console.log(err); }
  console.log('Retrieved two dogs: ' + dogs);
});
```

#### Model.delete(key, options, callback)

Deletes an item from the table.

```js
Dog.delete({ownerId: 4, name: 'Odie'}, function(err) {
  if(err) { return console.log(err); }
  console.log('Bye bye Odie');
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

#### Model.batchDelete(keys, options, callback)

Deletes multiple items from the table.

```js
Dog.batchDelete([
  { ownerId: 2, name: 'Princes' },
  { ownerId: 3, name: 'Toto' },
  { ownerId: 4, name: 'Odie' },
  { ownerId: 5, name: 'Lassie'}
], function (err) {
  if (err) { return console.log(err); }
  console.log('Bye bye my friends');
});
```

#### Model.query(query, options, callback)

Queries a table or index.  If callback is not provided, then a Query object is returned. See [Query](#query).

#### Model.queryOne(query, options, callback)

Same functionality as query except only return the first result object (if any). See [Query](#query).

#### Model.scan(filter, options, callback)

Scans a table. If callback is not provided, then a Scan object is returned. See [Scan](#scan).

#### Model.update(key, update, options, callback)

Updates and existing item in the table. Three types of updates: $PUT, $ADD, and $DELETE.

**$PUT**

Put is the default behavior.  The two example below are identical.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {age: 1}, function (err) {
  if(err) { return console.log(err); }
  console.log('Just a puppy');
})
```

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$PUT: {age: 1}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Just a puppy');
})
```

**$ADD**

Adds one or more attributes to the item.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$ADD: {age: 1}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Birthday boy');
})
```

**$DELETE**

Removes one or more attributes from an item.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$DELETE: {age: null}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Too old to keep count');
})
```

##### Options

**allowEmptyArray**: boolean

If true, the attribute can be updated to an empty array. If false, empty arrays will remove the attribute. Defaults to false.

**createRequired**: boolean

If true, required attributes will be filled with their default values on update (regardless of you specifying them for the update). Defaults to false.

**updateTimestamps**: boolean

If true, the `timestamps` attributes will be updated. Will not do anything if timestamps attribute were not specified. Defaults to true.

## Query

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

#### query.filter(filter)

Set the attribute on which to filter.

#### query.and()

Use add logic for filters.

#### query.or()

Use or logic for filters.

#### scan.not()

Inverts the filter logic that follows.

#### scan.null()

Filter attribute for null.

#### query.eq(value)

Hash, range key, or filter must equal the value provided. This is the only comparison option allowed for a hash key.

#### query.lt(value)

Range key or filter less than the value.

#### query.le(value)

Range key or filter less than or equal value.

#### query.ge(value)

Range key or filter greater than or equal value.

#### query.gt(value)

Range key or filter greater than the value.

#### query.beginsWith(value)

Range key or filter begins with value

#### query.between(a, b)

Range key or filter is greater than or equal `a`. and less than or equal to `b`.

#### scan.contains(value)

Filter contains the value.

#### scan.beginsWith(value)

Filter begins with the value.

#### scan.in(values)

Filter is in values array.

#### query.limit(limit)

The maximum number of items to evaluate (not necessarily the number of matching items). If DynamoDB processes the number of items up to the limit while processing the results, it stops the operation and returns the matching values up to that point, and a key in `lastKey` to apply in a subsequent operation, so that you can pick up where you left off. Also, if the processed data set size exceeds 1 MB before DynamoDB reaches this limit, it stops the operation and returns the matching values up to the limit, and a key in `lastKey` to apply in a subsequent operation to continue the operation. For more information, see Query and Scan in the Amazon DynamoDB Developer Guide.

#### query.consistent()

Query with consistent read.

#### query.descending()

Sort in descending order.

#### query.ascending()

Sort in ascending order (default).

#### query.startAt(key)

Start query at key. Use `lastKey` returned in query.exec() callback.

#### query.attributes(attributes)

Set the list of attributes to return.

#### query.count()

Return the number of matching items, rather than the matching items themselves.

#### query.counts()

Return the counts objects of matching items, rather than the matching items themselves:

```js
{
    "count": 2,
    "scannedCount": 1000
}
```

If you used a filter in the request, then `count` is the number of items returned after the filter was applied, and `scannedCount` is the number of matching items before the filter was applied.

## Scan

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
Dog.scan().exec(function (err, dogs) {
  // Look at all the dogs
  if(dogs.lastKey) { // More dogs to get
    Dog.scan().startAt(dogs.lastKey).exec(function (err, dogs) {
      // Look more dogs
    });
  }
});
```

#### scan.exec(callback)

Executes a scan against a table

#### scan.all([delay[, max]])

Recursively scan as long as lastKey exists. This function will also return a property called `timesScanned` indicating how many scans were completed.

`delay` is the time (in seconds) between recursive scans. Default: 1sec

`max` is the maximum number of recursive scans. Default: 0 - unlimited

#### scan.and()

For readability only. Scans us AND logic for multiple attributes.  `and()` does not provide any functionality and can be omitted.

#### scan.where(filter) | scan.filter(filter)

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

Attribute value is greater than or equal `a`. and less than or equal to `b`.

#### scan.limit(limit)

The maximum number of items to evaluate (not necessarily the number of matching items). If DynamoDB processes the number of items up to the limit while processing the results, it stops the operation and returns the matching values up to that point, and a key in `lastKey` to apply in a subsequent operation, so that you can pick up where you left off. Also, if the processed data set size exceeds 1 MB before DynamoDB reaches this limit, it stops the operation and returns the matching values up to the limit, and a key in `lastKey` to apply in a subsequent operation to continue the operation. For more information, see Query and Scan in the Amazon DynamoDB Developer Guide.

#### scan.startAt(key)

Start scan at key. Use `lastKey` returned in `scan.exec()` callback.

#### scan.attributes(attributes)

Set the list of attributes to return.

#### scan.count()

Return the number of matching items, rather than the matching items themselves.

#### scan.counts()

Return the counts objects of matching items, rather than the matching items themselves:

```js
{
    "count": 2,
    "scannedCount": 1000
}
```

If you used a filter in the scan, then `count` is the number of items returned after the filter was applied, and `scannedCount` is the number of matching items before the filter was applied.


#### scan.consistent()

Scan with consistent read.

