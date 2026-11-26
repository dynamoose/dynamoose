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

## Reading items that do not match the schema

By default (`readStrict: true`), Dynamoose type checks every item it reads from DynamoDB against the schema. If a stored value does not match the type of its attribute, the read throws a `TypeMismatch` error. This can occur after a schema change, or when other code writes to the table.

To return these items instead, set `readStrict` to `false` in the table options.

```js
const User = dynamoose.model("User", {"id": Number, "age": Number});
const Table = new dynamoose.Table("User", [User], {"readStrict": false});

// Stored item: {"id": {"N": "1"}, "age": {"S": "unknown"}}
const user = await User.get(1);
console.log(user.age); // "unknown"
```

This setting applies to `Model.get`, `Model.batchGet`, `Model.query`, `Model.scan`, the item that `Model.update` returns, and `dynamoose.transaction` get requests.

Dynamoose returns a value that matches no type of its attribute exactly as stored, together with all values below it. It does not run the custom type conversion (for example to `Date`) or the `get` function of that attribute on the value.

All other read steps do not change:

- Dynamoose processes values that match the schema as before.
- Dynamoose removes attributes that are not in the schema, unless `saveUnknown` allows them.
- Dynamoose removes expired items if `expires.items.returnExpired` is `false`.

Reads never run the `validate`, `required`, `enum` or `default` attribute settings, with or without this option.

:::caution
With `readStrict: false`, an item can contain values of a type that the schema does not allow. Your code, including the `get` functions of parent attributes and of the schema, must handle these values. If you save such an item, the type check runs and the save fails until you correct the values.
:::
