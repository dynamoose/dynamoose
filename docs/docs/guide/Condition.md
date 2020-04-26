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

This function has no behavior and is only used to increase readability of your conditional. This function can be omitted with no behavior change to your code.

```js
// The two condition objects below are identical
new dynamoose.Condition().where("id").eq(1).and().where("name").eq("Bob");
new dynamoose.Condition().where("id").eq(1).where("name").eq("Bob");
```

## condition.or()

This function specifies an `OR` join between two conditions, as opposed to the default `AND`. The condition will return `true` if either condition is met.

```js
new dynamoose.Condition().where("id").eq(1).or().where("name").eq("Bob"); // id = 1 OR name = Bob
```

## condition.not()

This function sets the condition to use the opposite comparison type for the given condition. You can find the list opposite comparison types below.

| Original | Opposite |
|---|---|
| equals (EQ) | not equals (NE) |
| less than or equals (LE) | greater than (GT) |
| less than (LT) | greater than or equals (GE) |
| null (NULL) | not null (NOT_NULL) |
| contains (CONTAINS) | not contains (NOT_CONTAINS) |
| exists (EXISTS) | not exists (NOT_EXISTS) |

The following comparisons do not have an opposite comparison type, and will throw an error if you try to use condition.not() with them.

| Original |
|---|
| in (IN) |
| between (BETWEEN) |
| begins with (BEGINS_WITH) |

```js
new dynamoose.Condition().where("id").not().eq(1); // Retrieve all objects where id does NOT equal 1
new dynamoose.Condition().where("id").not().between(1, 2); // Will throw error since between does not have an opposite comparison type
```

## condition.parenthesis(condition)

This function takes in a `Condition` instance as a parameter and uses that as a group. This lets you specify the priority of the conditional. You can also pass a function into the `condition` parameter and Dynamoose will call your function with one argument which is a condition instance that you can return to specify the group.

```js
// The two condition objects below are identical
new dynamoose.Condition().where("id").eq(1).and().parenthesis(new dynamoose.Condition().where("name").eq("Bob")); // id = 1 AND (name = Bob)
new dynamoose.Condition().where("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob")); // id = 1 AND (name = Bob)
```

## condition.group(condition)

This function is identical to [`condition.parenthesis(condition)`](#conditionparenthesiscondition) and just used as an alias.

## condition.filter(key)

This function prepares a new conditional to be used with the request. If you have not finished your previous filter conditional before using this function again it will wipe out the previous pending conditional filter. The `key` parameter is a string that you pass in representing which attribute you would like to filter on.

You will use this function with a comparison function which will complete the filter conditional and allow you to start another filter conditional if you wish.

```js
new dynamoose.Condition().filter("id"); // Currently this condition has no filter behavior and will represent an empty conditional
new dynamoose.Condition().filter("id").eq(1); // Since this condition has a comparison function (eq) after the filter it will complete the filter conditional and only represent documents where `id` = 1
```

## condition.where(key)

This function is identical to [`condition.filter(key)`](#conditionfilterkey) and just used as an alias.

## condition.attribute(key)

This function is identical to [`condition.filter(key)`](#conditionfilterkey) and just used as an alias.

## condition.eq(value)

This comparison function will check to see if the given filter key is equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").eq("Tom"); // Condition all documents where `name` equals `Tom`
```

## condition.exists()

This comparison function will check to see if the given filter key exists in the document.

```js
new dynamoose.Condition().filter("phoneNumber").exists(); // Represents all documents where `phoneNumber` exists in the document

new dynamoose.Condition().filter("phoneNumber").not().exists(); // Represents all documents where `phoneNumber` does not exist in the document
```

## condition.lt(value)

This comparison function will check to see if the given filter key is less than the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").lt(5); // Represents all documents where `age` is less than 5
```

## condition.le(value)

This comparison function will check to see if the given filter key is less than or equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").le(5); // Represents all documents where `age` is less than or equal to 5
```

## condition.gt(value)

This comparison function will check to see if the given filter key is greater than the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").gt(5); // Represents all documents where `age` is greater than 5
```

## condition.ge(value)

This comparison function will check to see if the given filter key is greater than or equal to the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("age").ge(5); // Represents all documents where `age` is greater than or equal to 5
```

## condition.beginsWith(value)

This comparison function will check to see if the given filter key begins with the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").beginsWith("T"); // Represents all documents where `name` begins with `T`
```

## condition.contains(value)

This comparison function will check to see if the given filter key contains the value you pass in as a parameter.

```js
new dynamoose.Condition().filter("name").contains("om"); // Represents all documents where `name` contains `om`
```

## condition.in(values)

This comparison function will check to see if the given filter key equals any of the documents you pass in in the values array you pass in. The `values` parameter must be an array and will only represent documents where the value for the given key exists in the array you pass in.

```js
new dynamoose.Condition("name").in(["Charlie", "Bob"]) // Represents all documents where `name` = `Charlie` OR `Bob`
```

## condition.between(a, b)

This comparison function will check to see if the given filter key is between the two values you pass in as parameters.

```js
new dynamoose.Condition().filter("age").between(5, 9); // Represents all documents where `age` is between 5 and 9
```
