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


## Schemas

Schemas are used to define DynamoDB table attributes and their constraints.

### Creating a new Schema

Schemas are created using `new Schema(attrDefObj, options)`. 

The first argument (`attrDefObj`) is an object containing attribute definitions. Keys of this object correspond to attributes in the resulting DynamoDB table. The values of these keys define constraints on those attributes (as well as a few handy features...). See [Attribute Definitions](#attribute-definitions) for a more thorough description.

The second argument (`options`) defines options for the table that are beyond the scope of individual attributes. See [Schema Options](#schema-options) for more.

The following is an example of creating a new Schema:

```js
var Schema = dynamoose.Schema;

var dogSchema = new Schema({
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

### Attribute Types

Attribute Types define the domain of a particular attribute. For example, a `name` might be set to `String` or `age` to `Number`. 

The following table describes valid Attribute Types, and their translation to DynamoDB types:

| Attribute Type | Resulting DynamoDB Type |
|:--------------:|:-----------------------:|
| String         | 'S'                     |
| Number         | 'N'                     |
| Boolean        | 'S'                     |
| Date           | 'N'                     |
| Object         | 'S'                     |
| Array          | 'S'                     |
| Buffer         | 'B'                     |
| [String]       | 'SS'                    |
| [Number]       | 'NS'                    |
| [Boolean]      | 'SS'                    |
| [Date]         | 'NS'                    |
| [Object]       | 'SS'                    |
| [Array]        | 'SS'                    |

_**: Use the useNativeBooleans flag to store Boolean values as 'BOOL'_

### Attribute Definitions

Attribute definitions define constraints on a particular attribute specified in a Schema. Attribute definitions may be an object type (see [Attribute Types](#attribute-types)) or an object with the following options:

**type**: AttributeType _required_

Required for all attribute definitions. Defines the attribute type. See [Attribute Types](#attribute-types).

**hashKey**: boolean

Sets the attribute as the table's hash key. If this option isn't specified in a schema, then the first attribute is defined as the hash key.

**rangeKey**: boolean

Sets the attribute as the table's range key.

**required**: boolean

Sets the attribute as a 'required' attribute. Required attributes must not be saved as undefined or null, or an error will be thrown.

**index**: boolean or object

Defines the attribute as a local or global secondary index. Index can either be true or an index definition object. The index definition object can contain the following keys:

- _name: 'string'_ - Name of index (Default is `attribute.name + (global ? 'GlobalIndex' : 'LocalIndex')``).
- _global: boolean_ - Set the index to be a global secondary index.  Attribute will be the hash key for the Index.
- _rangeKey: 'string'_ - The range key for a global secondary index.
- _project: boolean | ['string', ...]_ - Sets the attributes to be projected for the index.  `true` projects all attributes, `false` projects only the key attributes, and ['string', ...] projects the attributes listed. Default is `true`.
- _throughput: number | {read: number, write: number}_ - Sets the throughput for the global secondary index.
- _useNativeBooleans: boolean_ - Later versions of Dynamo added support for Boolean attributes. Set to true to add support for Boolean values that aren't stored as strings.

**default**: function | value

Applies a default to the attribute's value when saving, if the values is null or undefined.

If default is a function, the function is called, and the response is assigned to the attribute's value.

If it is a value, the value is simply assigned.

**validate**: function, regular expression, or value

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

Adds a getter function that will be used to transform the value returned from the DB.

**trim**: boolean

Trim whitespace from string when saving to DB.

**lowercase**: boolean

Convert to lowercase when saving to DB.

**uppercase**: boolean

Convert to uppercase when saving to DB.

### Options

**throughput**: number | {read: number, write: number}

Sets the throughput of the DynamoDB table. The value can either be a number or an object with the keys `read` and `write` (for example: `{read: 5, write: 2}`). If it is a number, both read and write are configured to that number. If it is omitted, the read and write values will be set to 1.

```js
var schema = new Schema({...}, { throughput: 5 });
var schema = new Schema({...}, { throughput: { read: 5, write: 2 } });
```

**timestamps**: boolean | {createdAt: string, updatedAt: string}

Defines that _schema_ must contain fields to control creation and last update timestamps. If it is set to true, this fields will be createdAt for creation date and updatedAt for last update. for example:

```js
var schema = new Schema({...}, { throughput: 5, timestamps: true});
```

Also it is possible to specify wich names that field will use, like in the following example:

```js
var schema = new Schema({...}, { throughput: 5, timestamps: {createdAt: 'creationDate', updatedAt: 'lastUpdateDate'});
```

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


