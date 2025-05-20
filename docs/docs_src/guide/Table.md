The Table object represents a single table in DynamoDB. It takes in both a name and array of models and has methods to retrieve, and save items in the database.

## new dynamoose.Table(name, models[, options])

dyno_jsdoc_dist/Table/index.js|new Table

### DynamoDB Streams Configuration

You can enable and configure DynamoDB Streams when creating a table using the `streamOptions` property in the `options` parameter. DynamoDB Streams capture a time-ordered sequence of item-level modifications in a DynamoDB table and store this information for up to 24 hours.

The `streamOptions` property accepts an object with the following properties:

- **enabled** - boolean - Set to `true` to enable DynamoDB Streams, `false` to disable
- **type** - string (optional) - The information that will be written to the stream when data in the table is modified. Must be one of the following:
  - `NEW_IMAGE` - The entire item, as it appears after it was modified
  - `OLD_IMAGE` - The entire item, as it appeared before it was modified
  - `NEW_AND_OLD_IMAGES` - Both the new and old images of the item
  - `KEYS_ONLY` - Only the key attributes of the modified item

#### Example - Creating a table with streams enabled

```js
const model = dynamoose.model("Cat", {
  id: String,
  name: String
});

const table = new dynamoose.Table("CatTable", [model], {
  streamOptions: {
    enabled: true,
    type: "NEW_AND_OLD_IMAGES"
  }
});
```

#### Example - Updating stream settings on an existing table

You can update DynamoDB Stream settings on an existing table by including `"streams"` in the `update` option:

```js
const model = dynamoose.model("Cat", {
  id: String,
  name: String
});

const table = new dynamoose.Table("CatTable", [model], {
  streamOptions: {
    enabled: true,
    type: "NEW_IMAGE"
  },
  update: ["streams"]  // or update: true for all update options
});
```

## dynamoose.Table.defaults.get()

This function is used to get the custom default values that you set with [dynamoose.Table.defaults.set(defaults)].

```js
console.log(dynamoose.Table.defaults.get());
```

## dynamoose.Table.defaults.set(defaults)

This function is used to set default values for the config object for new tables that are created. Ensure that you set this before initializing your tables to ensure the defaults are applied to your tables.

The priority of how the configuration gets set for new tables is:

- Configuration object passed into table creation
- Custom defaults provided by `dynamoose.Tables.defaults.set(defaults)`
- Dynamoose internal defaults

In the event that properties are not passed into the configuration object or custom defaults, the Dynamoose internal defaults will be used.

You can set the defaults by setting the property to a custom object:

```js
dynamoose.Table.defaults.set({
	"prefix": "MyApplication_",
});
```

In order to revert to the default and remove custom defaults you can set it to an empty object:

```js
dynamoose.Table.defaults.set({});
```

## table.name

dyno_jsdoc_dist/Table/index.js|table.name

## table.hashKey

dyno_jsdoc_dist/Table/index.js|table.hashKey

## table.rangeKey

dyno_jsdoc_dist/Table/index.js|table.rangeKey

## table.create([config][, callback])

dyno_jsdoc_dist/Table/index.js|table.create

## table.initialize([callback])

dyno_jsdoc_dist/Table/index.js|table.initialize
