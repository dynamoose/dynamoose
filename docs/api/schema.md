Schemas are used to define DynamoDB table attributes and their constraints.

### Creating a new Schema

Schemas are created using `new Schema(attrDefObj, options)`.

The first argument (`attrDefObj`) is an object containing attribute definitions. Keys of this object correspond to attributes in the resulting DynamoDB table. The values of these keys define constraints on those attributes (as well as a few handy features). See [Attribute Definitions](#attribute-definitions) for a more thorough description.

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
  race: {
     type: String,
     enum: ['Golden retriever', 'Beagle']
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
  age: Number,
  awards: {
    type: 'list',
    list: [{
      type: 'map',
      map: {
        year: Number,
        name: String
      }
    }]
  }  
},
{
  throughput: {read: 15, write: 5}
});
```

### Attribute Types

Attribute Types define the domain of a particular attribute. For example, a `name` might be set to `String` or `age` to `Number`.

The following table describes valid Attribute Types, and their translation to DynamoDB types:

| Attribute Type      | Resulting DynamoDB Type |
|:-------------------:|:-----------------------:|
| String              | 'S'                     |
| Number              | 'N'                     |
| Boolean<sup>*</sup> | 'S' or 'BOOL'           |
| Date                | 'N'                     |
| Object<sup>*</sup>  | 'S' or 'M'              |
| Array<sup>*</sup>   | 'S' or 'L'              |
| Buffer              | 'B'                     |
| [String]            | 'SS'                    |
| [Number]            | 'NS'                    |
| [Boolean]           | 'SS'                    |
| [Date]              | 'NS'                    |
| [Object]            | 'SS'                    |
| [Array]             | 'SS'                    |


<sup>*</sup> Use `useNativeBooleans` and `useDocumentTypes` to change DynamoDB type

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

**index**: boolean &#124; object &#124; [objects]

Defines the attribute as a local or global secondary index. Index can either be true, an index definition object or and array of index definition objects. The array is used define multiple indexes for a single attribute. The index definition object can contain the following keys:

- _name: 'string'_ - Name of index (Default is `attribute.name + (global ? 'GlobalIndex' : 'LocalIndex')`).
- _global: boolean_ - Set the index to be a global secondary index. Attribute will be the hash key for the Index.
- _rangeKey: 'string'_ - The range key for a global secondary index.
- _project: boolean &#124; ['string', ...]_ - Sets the attributes to be projected for the index. `true` projects all attributes, `false` projects only the key attributes, and ['string', ...] projects the attributes listed. Default is `true`.
- _throughput: number &#124; {read: number, write: number}_ - Sets the throughput for the global secondary index.

**default**: function &#124; value

Applies a default to the attribute's value when saving, if the value is null or undefined.

If default is a function, the function is called with the current model instance, and the response is assigned to the attribute's value.

If it is a value, the value is simply assigned.

```js
function(model) {
    return model.name +'_'+ model.category;
}
```

Your function may also be an async function with `await` statements in it, or you may return a promise. For example:

```js
function(model) {
    return new Promise(resolve => {
        setTimeout(function() {
            resolve("My default value");
        }, 1000);
    });
}
```

**enum: Array of strings**

Force value to be one of the enumeration values.

**forceDefault: boolean**

(default: false) Will force the default value to always be applied to the attribute event if it already set. This is good for populating data that will be used as sort or secondary indexes.

**validate**: function, regular expression, object, or value

Validation required before for saving.

If validate is a function, the function is used to validate the attribute's value. The function must have the signature:

```js
function(value, model) {
  if(valid)
    return true;
  else
    return false;
}
```

You can also pass in a function that returns a promise, or an async function:

```js
async function(v) {
  const result = await networkRequest(v);
  if (result.value === "true") {
    return true;
  } else {
    return false;
  }
}
```

If it is a `RegExp`, it is compared using `RegExp.test(value)`.

If it is a value, it is compared with `===`.

If an object is passed in, it must have a validator property that is a function. You can set the `isAsync` property to `true`, to enable callback functionality. If you are using promises, `isAsync` is not required. For example:

```js
{
  isAsync: true, // default: false
  validator: function(v, model, cb) {
    setTimeout(function() {
      var phoneRegex = /\d{3}-\d{3}-\d{4}/;
      var msg = v + ' is not a valid phone number!';
      // First argument is a boolean, whether validator succeeded
      // 2nd argument is an optional error message override
      cb(phoneRegex.test(v), msg);
    }, 5);
  },
  disableModelParameter: false // default: false, if enabled will only pass in value and callback, and not the model
}
```

**Running any Dynamoose method that calls the `validate` method indirectly from within the `validate` method will cause an infinate loop.**

The property name `validate` is also an alias for `validator`. The property name `validator` will take priority if both are passed in.

**set**: function | object

Adds a setter function that will be used to transform the value before writing to the DB. You can pass in a standard function that returns the new result, an async function that uses await syntax in it, or a function that returns a promise.

You can also pass in an object that defines extra settings and allows for callback based async set. For example:

```js
{
  isAsync: true, // default: false
  set: function(v, cb) {
    setTimeout(function() {
      cb("My item: " + v, msg);
    }, 5);
  }
}
```

**get**: function | object

Adds a getter function that will be used to transform the value returned from the DB, fired only if there is a value returned from the DB. You can pass in a standard function that returns the new result, an async function that uses await syntax in it, or a function that returns a promise.

You can also pass in an object that defines extra settings and allows for callback based async get. For example:

```js
{
  isAsync: true, // default: false
  get: function(v, cb) {
    setTimeout(function() {
      cb("My item: " + v, msg);
    }, 5);
  }
}
```

**toDynamo**: function | object

Adds a setter function that will directly set the value to the DB. This skips all type management and parsing normally provided by `options.set`.

Your function may also be an async function with await statements in it, or return a promise. For example:

```js
function(val) {
    return new Promise(resolve => {
        setTimeout(function() {
            resolve({S: "My custom value"});
        }, 1000);
    });
}
```

If an object is passed in it must have a `toDynamo` property that is a function. You can set the `isAsync` property to true, to enable callback functionality. If you are using promises, `isAsync` is not required. For example:

```js
{
  isAsync: true, // default: false
  toDynamo: function(v, cb) {
    setTimeout(function() {
      cb({S: "My custom value"});
    }, 5);
  }
}
```

**fromDynamo**: function | object

Adds a getter function that will be used to transform the value directly returned from the DB. This skips all type management and parsing normally provided by `options.get`.

Your function may also be an async function with `await` statements in it, or you may return a promise. For example:

```js
function(val) {
    return new Promise(resolve => {
        setTimeout(function() {
            resolve("My custom value");
        }, 1000);
    });
}
```

If an object is passed in it must have a `fromDynamo` property that is a function. You can set the `isAsync` property to `true`, to enable callback functionality. If you are using promises, `isAsync` is not required. For example:

```js
{
  isAsync: true, // default: false
  fromDynamo: function(v, cb) {
    setTimeout(function() {
      cb({S: "My custom value"});
    }, 5);
  }
}
```

**trim**: boolean

Trim whitespace from string when saving to DB.

**lowercase**: boolean

Convert to lowercase when saving to DB.

**uppercase**: boolean

Convert to uppercase when saving to DB.

### Options

**throughput**: number | string &#124; {read: number, write: number}

Sets the throughput of the DynamoDB table on creation. The value can either be a number or an object with the keys `read` and `write` (for example: `{read: 5, write: 2}`). If it is a number, both read and write are configured to that number. If it is omitted, the read and write values will be set to `1`. Throughput will only be respected on table creation, and will not update the throughput of an existing table.

If this property is set to `"ON_DEMAND"` the table will be created using `PAY_PER_REQUEST` BillingMode.

```js
var schema = new Schema({...}, {
  throughput: 5
});
var schema = new Schema({...}, {
  throughput: {
    read: 5,
    write: 2
  }
});
```


**useNativeBooleans**: boolean

Store Boolean values as Boolean ('BOOL') in DynamoDB. Default to `true` (i.e store as DynamoDB boolean).


```js
var schema = new Schema({...}, {
  useNativeBooleans: true
});
```

**useDocumentTypes**: boolean

Store Objects and Arrays as Maps ('M') and Lists ('L') types in DynamoDB. Defaults to `true` (i.e. store as DynamoDB maps and lists).

```js
var schema = new Schema({...}, {
  useDocumentTypes: true
});
```

**timestamps**: boolean &#124; {createdAt: string, updatedAt: string}

Defines that _schema_ must contain fields to control creation and last update timestamps. If it is set to true, the fields `createdAt` for creation date and `updatedAt` for last update will be added to the instance of the model. For example:

```js
var schema = new Schema({...}, {
  throughput: 5,
  timestamps: true
});
```

You can specify the names that the fields will use, like in the following example:

```js
var schema = new Schema({...}, {
  throughput: 5,
  timestamps: {
    createdAt: 'creationDate',
    updatedAt: 'lastUpdateDate'
  }
});
```

**expires**: number &#124; {ttl: number, attribute: string, returnExpiredItems: boolean, defaultExpires: function}

Defines that _schema_ must contain an expires attribute. This field is configured in DynamoDB as the TTL attribute. If set to a `number`, an attribute named "expires" will be added to the schema. The default value of the attribute will be the current time plus the expires value, unless an optional defaultExpires property is passed in. The expires value is in seconds.

The attribute will be a standard javascript `Date` in the object, and will be stored as number ('N') in the DyanmoDB table. The stored number is in seconds. [More information about DynamoDB TTL](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)

```js
var schema = new Schema({...}, {
  expires: 7*24*60*60 // 1 week in seconds
});
```

You can specify the attribute name by passing an object:

```js
var schema = new Schema({...}, {
  expires: {
    ttl: 7*24*60*60, // 1 week in seconds
    attribute: 'ttl', // ttl will be used as the attribute name
    returnExpiredItems: true, // if expired items will be returned or not (default: true)
    defaultExpires: function () { // optional, will default to `ttl` if not defined, this function is mainly used to allow the expires to be set to null or undefined, without resetting to the normal default
      return null;
    }
  }
});
```

**saveUnknown**: boolean or array

Specifies that attributes not defined in the _schema_ will be saved and retrieved. This defaults to false.

```js
var schema = new Schema({...}, {
  saveUnknown: true
});
```

If an array is passed in, only attributes that are in the array passed in will be saved and retrieved.

```js
var schema = new Schema({...}, {
  saveUnknown: ['name', 'age'] // only `name` and `age` unknown attributes will be saved and retrieved from DynamoDB
});
```

**errorUnknown**: boolean

Specifies that any attributes not defined in the _schema_ will throw an error if encountered while parsing records from DynamoDB. This defaults to false.

```js
var schema = new Schema({...}, {
  errorUnknown: true
});
```

**attributeToDynamo**: function

A function that accepts `name, json, model, defaultFormatter, options`.

This will override attribute formatting for all attributes. Whatever is returned by the function will be sent directly to the DB.

```js
var schema = new Schema({...}, {
  attributeToDynamo: function(name, json, model, defaultFormatter, options) {
    switch(name) {
      case 'specialAttribute':
        return specialFormatter(json);
      default:
        return specialFormatter(json);
    }
  }
});
```

**attributeFromDynamo**: function

A function that accepts `name, json, fallback`.

This will override attribute parsing for all attributes. Whatever is returned by the function will be passed directly to the model instance.

```js
var schema = new Schema({...}, {
  attributeFromDynamo: function(name, json, defaultParser) {
    switch(name) {
      case 'specialAttribute':
        return specialParser(json);
      default:
        return defaultParser(json);
    }
  }
});
```

### Methods

You can add custom methods to your Schema. Model methods can be accessed via `this.model(modelName)`.

```js
const Schema = dynamoose.Schema;

const dogSchema = new Schema({
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
  friends: {
    type: [String],
    default: [],
  }
});

dogSchema.method('becomeFriends', function (otherDog) {
  this.friends = this.friends || [];
  otherDog.friends = otherDog.friends || [];
  this.friends.push(otherDog.name);
  otherDog.friends.push(this.name);
  this.model('Dog').batchPut([this, otherDog]);
});

const Dog = dynamoose.model('Dog', dogSchema);
const dog1 = new Dog({ownerId: 137, name: 'Snuffles'});
const dog2 = new Dog({ownerId: 138, name: 'Bill'});
dog1.becomeFriends(dog2);
```

#### Static Methods

Can be accessed from the compiled `Schema`, similar to how `scan()` and `query()` are called.
`this` will refer to the compiled schema within the definition of the function.

```js
// Construction:
const ModelSchema = new Schema({...})

ModelSchema.statics.getAll = async function (cb) {
  let results = await this.scan().exec();
  while (results.lastKey) {
    results = await this.scan().startKey(results.startKey).exec();
  }
  return results;
}

const Model = dynamoose.model('Model', ModelSchema)

// Using:
Model.getAll((err, models) => {
  models.forEach((model) => {
    console.log(model)
  });
});
```

#### Instance Methods

Can be accessed from a newly created model. `this` will refer to the instace of the model within
the definition of the function.

```js
// Construction:
const ModelSchema = new Schema({
  name: String
});

ModelSchema.methods.setName = function (name) {
  this.name = name
};

const Model = dynamoose.model('Model', ModelSchema);

// Using:
const batman = new Model({name: "Bruce"});
batman.setName("Bob");
```
