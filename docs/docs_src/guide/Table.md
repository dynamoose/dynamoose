The Table object represents a single table in DynamoDB. It takes in both a name and array of models and has methods to retrieve, and save items in the database.

## new dynamoose.Table(name, models[, options])

dyno_jsdoc_dist/Table/index.js|new Table

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
	"prefix": "MyApplication_"
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
