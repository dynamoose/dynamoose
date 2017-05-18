---
order: 2
---
# Schema

Schemas are used to define DynamoDB table attributes and their constraints.

## Creating a new Schema

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

## Attribute Types

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

## Attribute Definitions

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

## Options

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

**saveUnknown**: boolean

Specifies that attributes not defined in the _schema_ will be saved and retrieved.  This defaults to false.

```js
var schema = new Schema({...}, { saveUnknown: true });
```
