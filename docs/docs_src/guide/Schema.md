## new dynamoose.Schema(schema[, options])

dyno_jsdoc_dist/Schema.js|new Schema

## schema.hashKey

dyno_jsdoc_dist/Schema.js|schema.hashKey

## schema.rangeKey

dyno_jsdoc_dist/Schema.js|schema.rangeKey

## schema.indexAttributes

dyno_jsdoc_dist/Schema.js|schema.indexAttributes

## Attribute Types

| Type | Set Allowed | DynamoDB Type | Custom Dynamoose Type | Nested Type | Settings | Notes |
|---|---|---|---|---|---|---|
| String | True | S | False | False |   |   |
| Boolean | False | BOOL | False | False |   |   |
| Number | True | N | False | False |   |   |
| Buffer | True | B | False | False |   |   |
| Date | True | N \| S (if `storage` is set to `iso`) | True | False | **storage** - milliseconds \| seconds \| iso (default: milliseconds) | Will be stored in DynamoDB as milliseconds since Jan 1 1970, and converted to/from a Date instance. |
| Object | False | M | False | True |   |   |
| Array | False | L | False | True |   |   |
| [`dynamoose.type.NULL`](Dynamoose#dynamoosetypenull) | False | NULL | False | False |   |   |
| Schema | False | M | True | True |   | This will be converted to an Object type. |
| Model | Only if no `rangeKey` for model's schema | S \| N \| B \| M | True | If `rangeKey` in model's schema |   | Model Types are setup a bit differently. [Read below](#model-types) for more information. |
| Combine | False | S | True | False | **attributes** - [string] - The attributes to store in the combine attribute.<br/>**separator** - string (default: `,`) - The string used to separate the attributes in the combine attribute. | When running `Model.update` you must update all the attributes in the combine attributes array, or none of them. This is to ensure your combine method remains in sync with your overall item. |
| Constant | False | S \| N \| BOOL | True | False | **value** - string \| number \| boolean - The value this attribute should always match. |   |

Set's are different from Array's since they require each item in the Set be unique. If you use a Set, it will use the underlying JavaScript Set instance as opposed to an Array. If you use a set you will define the type surrounded by brackets in the [`schema`](#schema-object--array) setting. For example to define a string set you would do something like:

```js
{
	"friends": {
		"type": Set,
		"schema": [String]
	}
}
```

When using `saveUnknown` with a set, the type recognized by Dynamoose will be the underlying JavaScript Set constructor. If you have a set type defined in your schema the underlying type will be an Array.

Custom Dynamoose Types are not supported with the `saveUnknown` property. For example, if you wish you retrieve an item with a Date type, Dynamoose will return it as a number if that property does not exist in the schema and `saveUnknown` is enabled for that given property.

For types that are `Nested Types`, you must define a [`schema` setting](#schema-object--array) that includes the nested schema for that given attribute.

You can also define an array of types to allow your attribute to match any one of multiple types you set. For example in the following code example, the `data` attribute can either be of type String or Number.

```js
{
	"data": [String, Number]
}
```

In the event you have multiple types that match (Date & Number, Set & Array, multiple Objects with different Schemas), Dynamoose will attempt to pick the closest matching type. However, if all types are valid, Dynamoose will default to the first type in the array.

```js
{
	"date": [Number, Date] // If you pass in a Date instance, it will use Date, otherwise it will use Number. All retrieved items from DynamoDB will use Number since there is no difference in the underlying storage of Number vs Date
}
```

You are also not allowed to have multiple types on any `hashKey` or `rangeKey` attributes. DynamoDB requires that these key attributes only have one type.


## Model Types

For Model types, you must pass in another model or `dynamoose.type.THIS` (to reference your own model).

```js
const userSchema = new dynamoose.Schema({
	"id": String,
	"name": String,
	"parent": dynamoose.type.THIS
});
```

```js
const gameSchema = new dynamoose.Schema({
	"id": String,
	"state": String,
	"user": User
});
```

```js
const gameSchema = new dynamoose.Schema({
	"id": String,
	"state": String,
	"user": {
		"type": Set,
		"schema": [User] // Set is only valid if `User` does not have a `rangeKey`
	}
});
```

You can then set items to be an Item instance of that Model, a value of the `hashKey` (if you don't have a `rangeKey`), or an object representing the `hashKey` & `rangeKey` (if you have a `rangeKey`).

```js
const dad = new User({
	"id": 1,
	"name": "Steve"
});

const user = new User({
	"id": 2,
	"name": "Bob",
	"parent": dad
});
```

```js
const user = new User({
	"id": 2,
	"name": "Bob",
	"parent": 1 // Only valid if you do not have a `rangeKey` on the model you are referencing
});
```

```js
const user = new User({
	"id": 2,
	"name": "Bob",
	"parent": {
		"pk": 1,
		"sk": "random"
	} // Only valid if you have a `rangeKey` on the model you are referencing
});
```

You can then call [`item.populate`](Item#itempopulatesettings-callback) to populate the instances with the items.

```js
const user = await User.get(2); // {"id": 2, "name": "Bob", "parent": 1}
const populatedUser = await user.populate(); // {"id": 2, "name": "Bob", "parent": {"id": 1, "name": "Steve"}}
```

## Attribute Settings

### type: type | object

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.type

### schema: object | array

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.schema

### default: value | function | async function

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.default

### forceDefault: boolean

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.forceDefault

### validate: value | RegExp | function | async function

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.validate

### required: boolean

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.required

### enum: array

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.enum

### get: function | async function

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.get

### set: function | async function

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.set

### index: boolean | object | array

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.index

### hashKey: boolean

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.hashKey

### rangeKey: boolean

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.rangeKey

### map: string | [string]

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.map

### alias: string | [string]

This property is the same as [`map`](#map-string--string) and used as an alias for that property.

### aliases: string | [string]

This property is the same as [`map`](#map-string--string) and used as an alias for that property.

### defaultMap: string

dyno_jsdoc_dist/Schema.d.ts|AttributeDefinition.defaultMap

### defaultAlias: string

This property is the same as [`defaultMap`](#defaultmap-string) and used as an alias for that property.
