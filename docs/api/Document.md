# Document

A document represents an item for a given model in DynamoDB. This item can created locally (meaning it's not yet saved in DynamoDB), or created from an item already stored in DynamoDB (ex. `Model.get`).

## new Model(object)

In order to create a new document you just pass in your object into an instance of your model.

```js
const User = dynamoose.model("User", {"id": Number, "name": String});
const myUser = new User({
	"id": 1,
	"name": "Tim"
});

// myUser is now a document instance of the User model
```

## document.save([callback])

This saves a document to DynamoDB. This method uses the `putItem` DynamoDB API call to store your object in the given table associated with the model. This method is overwriting, and will overwrite the data you currently have in place for the existing key for your table.

This method returns a promise that will resolve when the operation is complete, this promise will reject upon failure. You can also pass in a function into the `callback` parameter to have it be used in a callback format as opposed to a promise format. Nothing will be passed into the result for the promise or callback.

```js
//...
const myUser = new User({
	"id": 1,
	"name": "Tim"
});

try {
	await myUser.save();
	console.log("Save operation was successful.");
} catch (error) {
	console.error(error);
}

// OR

myUser.save((error) => {
	if (error) {
		console.error(error);
	} else {
		console.log("Save operation was successful.");
	}
});
```
