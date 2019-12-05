# Model

The Model object represents one DynamoDB table. It takes in both a name and a schema and has methods to retrieve, and save items in the database.

## dynamoose.model(name, schema[, config])

This method is the basic entry point for creating a model in Dynamoose.

The `schema` parameter can either be an object OR a Schema instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.

```js
const dynamoose = require("dynamoose");

const Cat = dynamoose.model("Cat", {"name": String});
```

The config parameter is an object used to customize settings for the model.
