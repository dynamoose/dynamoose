The Condition object represents a conditional that you can attach to various settings in other Dynamoose methods.

## new dynamoose.Condition([filter])

This is the basic entry point to construct a conditional. The filter property is optional and can either be an object, existing conditional instance or a string representing the key you which to first filter on.

```js
new dynamoose.Condition("breed").contains("Terrier") // will condition for where the key `breed` contains `Terrier`
new dynamoose.Condition({"breed": {"contains": "Terrier"}}) // will condition for where the key `breed` contains `Terrier`
new dynamoose.Condition(new dynamoose.Condition({"breed": {"contains": "Terrier"}})) // will condition for where the key `breed` contains `Terrier`
```

For a more advanced use case you pass an object into `new dynamoose.Condition()` the object for each key should contain the comparison type. For example, in the second to last example above, `contains` was our comparison type. This comparison type must match one of the comparison type functions listed on this page.

You can also pass in a raw DynamoDB condition object. Which has properties for `ExpressionAttributeNames`, `ExpressionAttributeValues` & either `FilterExpression` or `ComparisonExpression`. In the event you do this, all future condition methods called on this condition instance will be ignored. In the event you don't pass in DynamoDB objects for the `ExpressionAttributeValues` values, Dynamoose will automatically convert them to DynamoDB compatible objects to make the request.

```js
new dynamoose.Condition({
	"FilterExpression": "#id = :id",
	"ExpressionAttributeValues": {
		":id": 100
	},
	"ExpressionAttributeNames": {
		"#id": "id"
	}
})
new dynamoose.Condition({
	"FilterExpression": "#id = :id",
	"ExpressionAttributeValues": {
		":id": {"N": 100}
	},
	"ExpressionAttributeNames": {
		"#id": "id"
	}
})
```

## condition.and()

dyno_jsdoc_dist/Condition.js|condition.and()

## condition.or()

dyno_jsdoc_dist/Condition.js|condition.or()

## condition.not()

dyno_jsdoc_dist/Condition.js|condition.not()

## condition.parenthesis(condition)

dyno_jsdoc_dist/Condition.js|condition.parenthesis

## condition.group(condition)

This function is identical to [`condition.parenthesis(condition)`](#conditionparenthesiscondition) and just used as an alias.

## condition.filter(key)

This function prepares a new conditional to be used with the request. If you have not finished your previous filter conditional before using this function again it will wipe out the previous pending conditional filter. The `key` parameter is a string that you pass in representing which attribute you would like to filter on.

You will use this function with a comparison function which will complete the filter conditional and allow you to start another filter conditional if you wish.

```js
new dynamoose.Condition().filter("id"); // Currently this condition has no filter behavior and will represent an empty conditional
new dynamoose.Condition().filter("id").eq(1); // Since this condition has a comparison function (eq) after the filter it will complete the filter conditional and only represent items where `id` = 1
```

## condition.where(key)

This function is identical to [`condition.filter(key)`](#conditionfilterkey) and just used as an alias.

## condition.attribute(key)

This function is identical to [`condition.filter(key)`](#conditionfilterkey) and just used as an alias.

## condition.eq(value)

This comparison function will check to see if the given filter key is equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").eq("Tom"); // Condition all items where `name` equals `Tom`
```

## condition.exists()

This comparison function will check to see if the given filter key exists in the item.

```js
new dynamoose.Condition().filter("phoneNumber").exists(); // Represents all items where `phoneNumber` exists in the item

new dynamoose.Condition().filter("phoneNumber").not().exists(); // Represents all items where `phoneNumber` does not exist in the item
```

## condition.lt(value)

This comparison function will check to see if the given filter key is less than the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").lt(5); // Represents all items where `age` is less than 5
```

## condition.le(value)

This comparison function will check to see if the given filter key is less than or equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").le(5); // Represents all items where `age` is less than or equal to 5
```

## condition.gt(value)

This comparison function will check to see if the given filter key is greater than the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").gt(5); // Represents all items where `age` is greater than 5
```

## condition.ge(value)

This comparison function will check to see if the given filter key is greater than or equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").ge(5); // Represents all items where `age` is greater than or equal to 5
```

## condition.beginsWith(value)

This comparison function will check to see if the given filter key begins with the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").beginsWith("T"); // Represents all items where `name` begins with `T`
```

## condition.contains(value)

This comparison function will check to see if the given filter key contains the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").contains("om"); // Represents all items where `name` contains `om`
```

## condition.in(values)

This comparison function will check to see if the given filter key equals any of the items you pass in in the values array you pass in. The `values` parameter must be an array and will only represent items where the value for the given key exists in the array you pass in.

```js
new dynamoose.Condition("name").in(["Charlie", "Bob"]) // Represents all items where `name` = `Charlie` OR `Bob`
```

## condition.between(a, b)

This comparison function will check to see if the given filter key is between the two values you pass in as parameters.

```js
new dynamoose.Condition().filter("age").between(5, 9); // Represents all items where `age` is between 5 and 9
```
