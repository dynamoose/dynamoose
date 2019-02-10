---
order: 3
---

## Model

### Create Model From Schema

```js
const Dog = dynamoose.model('Dog', dogSchema);
```

### new Model(object)

Creates a new instance of the model. Object keys are assigned to the new model.

```js
const odie = new Dog({
  ownerId: 4,
  name: 'Odie',
  breed: 'Beagle',
  color: ['Tan'],
  cartoon: true
});
```

### model.put(options, callback) & model.save(options, callback)

Puts the item in the DynamoDB table. Will overwrite the item.

```js
odie.save(function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Ta-da!');
});

odie.save({
  condition: '#o = :ownerId',
  conditionNames: { o: 'ownerId' },
  conditionValues: { ownerId: 4 }
}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Ta-da!');
});
```

Options:
  - overwrite: should overwrite the existing item in DynamoDB (default: true)
  - updateExpires: should update the expires timestamp if exists (default: false)
  - updateTimestamps: should update the updatedAt timestamp if exists (default: true)
  - returnRequest: should not make request to DynamoDB and resolve with request (default: false)

### Model.batchPut(items, options, callback)

Puts multiple items in the table. Will overwrite existing items.

```js
Dog.batchPut([
  {
    ownerId: 2,
    name: 'Princes',
    breed: 'Jack Russell Terrier',
    color: ['White', 'Brown'],
    cartoon: true
  },
  {
    ownerId: 3,
    name: 'Toto',
    breed: 'Terrier',
    color: ['Brown'],
    cartoon: false
  },
  {
    ownerId: 4,
    name: 'Odie',
    breed: 'Beagle',
    color: ['Tan'],
    cartoon: true
  },
  {
    ownerId: 5,
    name: 'Lassie',
    breed: 'Beagle',
    color: ['Tan'],
    cartoon: false
  }
], function (err, dogs) {
  if (err) {
    return console.log(err);
  }

  console.log('Ta-da!');
});
```

#### Options

**overwrite**: boolean

Overwrite existing item. Defaults to true.

**updateExpires**: boolean

Update the `expires` timestamp if exists. Defaults to false.

**updateTimestamps**: boolean

Should update the `updatedAt` timestamp if exists. Defaults to false.

**condition**: string

An expression for a conditional update. See
[the AWS documentation](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
for more information about condition expressions.

**conditionNames**: object

A map of name substitutions for the condition expression.

**conditionValues**: object

A map of values for the condition expression. Note that in order for
automatic object conversion to work, the keys in this object must
match schema attribute names.

### Model.create(object, options, callback)

Creates a new instance of the model and save the item in the table.

```js
Dog.create({
  ownerId: 4,
  name: 'Odie',
  breed: 'Beagle',
  color: ['Tan'],
  cartoon: true
}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```

You can set `options.returnRequest` to true, to resolve the get request instead of making the request.


### Model.get(key, options, callback)

Gets an item from the table.

```js
Dog.get({ownerId: 4, name: 'Odie'}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```

You can set `options.returnRequest` to true, to resolve the get request instead of making the request.


### Model.populate(options)

Populates paths from an item from the table.

(Only promise mode yet)

```js
Dog = dynamoose.model('Dog', {
    id: {
      type:  Number
    },
    name: {
      type: String
    },
    parent: Number
  })

/*
Available dogs
{ id: 1, name: 'Odie'}
{ id: 2, name: 'Rex', parent: 1 }
{ id: 3, name: 'Fox', parent: 2 }
*/

Dog.get(3)
  .then(function(dog) {
    return dog.populate({
      path: 'parent',
      model: 'Dog',
      populate: {
        path: 'parent',
        model: 'Dog'
      }
    });
  })
  .then(function(dog) {
    console.log(dog);
    /*
    {
      id: 3,
      name: 'Fox',
      parent: {
        id: 2,
        name: 'Rex',
        parent: {
          id: 1,
          name: 'Odie'
        }
      }
    }
    */
  });


Dog.scan().exec()
  .then(function(dogs) {
    return Promise.all(dogs.map(function(dog) {
      return dog.populate({
        path: 'parent',
        model: 'Dog'
      });
    }));
  })
  .then(function(dogs) {
    console.log(dogs);
  });
```
#### Populate with range and hash key

If the object to populate has both a range and hash key, you must store both in the attribute.

```js
const CatWithOwner = dynamoose.model('CatWithOwner',
  {
    id: {
      type:  Number
    },
    name: {
      type: String
    },
    owner: {
      name: String,
      address: String
    }
  }
);

const Owner = dynamoose.model('Owner',
  {
    name: {
      type: String,
      hashKey: true
    },
    address: {
      type: String,
      rangeKey: true
    },
    phoneNumber: String
  }
);

var owner = new Owner({
  name: 'Owner',
  address: '123 A Street',
  phoneNumber: '2345551212'
});

var kittenWithOwner = new CatWithOwner({
  id: 100,
  name: 'Owned',
  owner: {
    name: owner.name,
    address: owner.address
  }
});

CatWithOwner.get(100)
.then(function(cat) {
  should.not.exist(cat.owner.phoneNumber);
  return cat.populate({
    path: 'owner',
    model: 'Owner'
  });
})
.then(function(catWithOwnerPopulated) {
  ...
});
```



### Model.batchGet(keys, options, callback)

Gets multiple items from the table.

```js
Dog.batchGet([{ownerId: 4, name: 'Odie'}, {ownerId: 5, name: 'Lassie'}], function (err, dogs) {
  if (err) {
    return console.log(err);
  }

  console.log('Retrieved two dogs: ' + dogs);
});
```

### Model.delete(key, [options, ]callback)

Deletes an item from the table.

```js
Dog.delete({ownerId: 4, name: 'Odie'}, function(err) {
  if (err) {
    return console.log(err);
  }

  console.log('Bye bye Odie');
});
```

`options` parameters:

- `update` (boolean): Will return the object deleted (default: false), if set to false and no object was deleted this function will fail silently.
- `returnRequest` (boolean): Will resolve with the request object instead of making the request (default: false)

### model.delete([options, ]callback)

Deletes the item from the table. The `options` parameter is optional, and should be a object type if passed in. The `callback` parameter is the function that will be called once the item has been deleted from the table. The `error` and `item` (if `update` is set to true) will be passed in as parameters to the callback function. The options object accepts the same parameters as described above in `Model.delete`.

```js
odie.delete(function(err) {
  if (err) {
    return console.log(err);
  }

  console.log('Bye bye Odie');
});
```

### model.originalItem()

This function returns the last item that was saved/received from DynamoDB. This can be useful to view the changes made since the last DynamoDB save/received that your application made for a given document. This function will return a JSON object that represents the original item.

```js
odie.originalItem(); // {ownerId: 4, name: 'Odie'}
```

### Model.batchDelete(keys, options, callback)

Deletes multiple items from the table.

```js
Dog.batchDelete([
  { ownerId: 2, name: 'Princes' },
  { ownerId: 3, name: 'Toto' },
  { ownerId: 4, name: 'Odie' },
  { ownerId: 5, name: 'Lassie'}
], function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Bye bye my friends');
});
```

### Model.update(key, update, options, callback)
### Model.update(keyWithUpdate, callback)

Updates an existing item in the table. Three types of updates: $PUT, $ADD, and $DELETE.

The key can either be its own object or combined with the update object.

**$PUT**

Put is the default behavior. The three example below are identical.

*key and updated are separate*
```js
Dog.update({ownerId: 4, name: 'Odie'}, {age: 1}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Just a puppy');
})
```

*key and updated are combined*
```js
Dog.update({ownerId: 4, name: 'Odie', age: 1}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Just a puppy');
})
```

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$PUT: {age: 1}}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Just a puppy');
})
```

**$ADD**

Adds one or more attributes to the item. These attributes must be of the number or set type. If the attribute already exists it will be manipulated instead. If it's a number the provided value will be added mathematically to the existing value. If the attribute is a set the provided value is appended to the set.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$ADD: {age: 1}}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Birthday boy is one year older');
})
```

**$DELETE**

Removes one or more attributes from an item.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$DELETE: {age: null}}, function (err) {
  if (err) {
    return console.log(err);
  }

  console.log('Too old to keep count');
})
```

#### Options

**allowEmptyArray**: boolean

If true, the attribute can be updated to an empty array. If false, empty arrays will remove the attribute. Defaults to false.

**createRequired**: boolean

If true, required attributes will be filled with their default values on update (regardless of you specifying them for the update). Defaults to false.

**updateTimestamps**: boolean

If true, the `timestamps` attributes will be updated. Will not do anything if timestamps attribute were not specified. Defaults to true.

**updateExpires**: boolean

If true, the `expires` attributes will be updated. Will not do anything if expires attribute were not specified. Defaults to false.

**condition**: string

An expression for a conditional update. See
[the AWS documentation](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html)
for more information about condition expressions.

**conditionNames**: object

A map of name substitutions for the condition expression.

**conditionValues**: object

A map of values for the condition expression. Note that in order for
automatic object conversion to work, the keys in this object must
match schema attribute names.

**returnValues**: string

From [the AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html)
Use ReturnValues if you want to get the item attributes as they appear before or after they are updated. For UpdateItem, the valid values are:

- NONE - If ReturnValues is not specified, or if its value is NONE, then nothing is returned. (This setting is DynamoDB's default.)
- ALL_OLD - Returns all of the attributes of the item, as they appeared before the UpdateItem operation.
- UPDATED_OLD - Returns only the updated attributes, as they appeared before the UpdateItem operation.
- ALL_NEW - Returns all of the attributes of the item, as they appear after the UpdateItem operation. (This setting is the Dynamoose default.)
- UPDATED_NEW - Returns only the updated attributes, as they appear after the UpdateItem operation.


### Model.transaction

This object has the following methods that you can call.

- `Model.transaction.get`
- `Model.transaction.create`
- `Model.transaction.delete`
- `Model.transaction.update`
- `Model.transaction.conditionCheck`

You can pass in the same parameters into each method that you do for the normal (non-transaction) methods.

These methods are only meant to only be called to instantiate the `dynamoose.transaction` array.


### Model.transaction.conditionCheck(key, options)

This method allows you to run a conditionCheck when running a DynamoDB transaction.

Example:

```js
Model.transaction.conditionCheck("credit1", {
  condition: "amount > :request",
  conditionNames: {
    request: "request"
  },
  conditionValues: {
    request: 100
  }
})
```

#### Options

**condition**: string

An expression for a conditional update. See [the AWS documentation](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.SpecifyingConditions.html) for more information about condition expressions.

**conditionNames**: object

A map of name substitutions for the condition expression.

**conditionValues**: object

A map of values for the condition expression. Note that in order for
automatic object conversion to work, the keys in this object must
match schema attribute names.


### Model.getTableReq()

The function will return the object used to create the table with AWS. You can use this to create the table manually, for things like the Serverless deployment toolkit, or just to peak behind the scenes and see what Dynamoose is doing to create the table.

```js
Dog.getTableReq();
//  {
//    AttributeDefinitions: attrDefs,
//    TableName: name,
//    KeySchema: keySchema,
//    ProvisionedThroughput: provThroughput
//  }
```

### Model.plugin(pluginPackage[, pluginOptions])

**WARNING: PLUGINS IS CURRENTLY IN BETA. THIS FUNCTIONALITY MIGHT CHANGE AT ANYTIME WITHOUT WARNING. DO NOT CONSIDER THIS FEATURE TO BE STABLE.**

This is how you can add plugins to be run on your model. For example you can use this function like so.

```js
const MyPlugin = require('ThePluginPackage');
const MyPluginB = require('ThePluginPackageB');
const Model = dynamoose.model('Puppy', {
    id: {
        type: Number,
        validate: function(v) {
            return v > 0;
        }
    },
    name: String,
    owner: String,
    age: {
        type: Number
    }
});
Model.plugin(MyPlugin); // this plugin will always take priority over the plugin below and be run first
Model.plugin(MyPluginB, {username: 'test', password: 'test'}); // this plugin will always take priority second and will be run after the first plugin, this plugin also passes options into the plugin

module.exports = Model;
```
