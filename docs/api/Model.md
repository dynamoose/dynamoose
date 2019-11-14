# Model

The Model object represents one DynamoDB table. It takes in both a name and a schema and has methods to retrieve, and save items in the database.

## dynamoose.model(name, schema)

This method is the basic entry point for creating a model in Dynamoose.

The `schema` parameter can either be an object OR a Schema instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.

```js
const dynamoose = require("dynamoose");

const Cat = dynamoose.model("Cat", {"name": String});
```

### Other Notes:

- `mongoose.model()` supports using the `new` keyword as well without any problems. Currently `dynamoose.model()` does not support the `new` keyword and will throw an error if you attempt to use the `new` keyword with `dynamoose.model`.
