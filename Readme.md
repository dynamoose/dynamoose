# Dynamoose [![Build Status](https://travis-ci.org/automategreen/dynamoose.png)](https://travis-ci.org/automategreen/dynamoose)


Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](http://mongoosejs.com/))

In switching from MongoDB/Mongoose to DynamoDB, we missed the modeling provided by Mongoose. There are several great modules out there, but they didn't match our needs.  We created Dynamoose based on our usage.

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

## API

### Dynamoose

```js
var dynamoose = require('dynamoose');
```

#### dynamoose.model(name, schema, [options])

Compiles a new model or looks up an existing model. `options` is optional.

Default `options`:

```js
{
  create: true, // Create table in DB, if it does not exist
  waitForActive: true, // Wait for table to be created before trying to us it
  waitForActiveTimeout: 180000 // wait 3 minutes for table to activate
}
```

Basic example:

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

#### dynamoose.defaults(options)

Sets the default to be used when creating a model. Can be modified on a per model by passing options to `.model()`.

Default `options`:

```js
{
  create: true // Create table in DB if it does not exist
}
```

It is recommended that `create` be disabled for production environments.

```js
dynamoose.defaults( { create: false });
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

**set**: function

Adds a setter function that will be used to transform the value before writing to the DB.

**get**: function

Adds a getter function that will be used to transform the value return from the DB.

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

#### Model.update(key, update, callback)

Updates and existing item in the table. Three types of updates: $PUT, $ADD, and $DELETE. Refer to DynamoDB's updateItem documentation for details on how PUT, ADD, and DELETE work.

**$PUT**

Put is the default behavior.  The two example below are identical.

```js
Dog.update({age: 1},{ownerId: 4, name: 'Odie'}, function (err) {
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

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$ADD: {age: 1}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Birthday boy');
})
```

**$DELETE**

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$DELETE: {age: null}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Too old to keep count');
})
```

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

#### query.filter(filter)

Set the atribulte on which to filter.

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

Range key or filter is between values a and b.

Attribute is greater than the value.

#### scan.contains(value)

Filter contains the value.

#### scan.beginsWith(value)

Filter begins with the value.

#### scan.in(values)

Filter is in values array.

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

Attribute is between value a and b.

#### scan.limit(limit)

Limit scan response to limit.

#### scan.startAt(key)

Start scan at key.  Use LastEvaluatedKey returned in scan.exec() callback.

#### scan.attributes(attributes)

Set the attributes to return.
