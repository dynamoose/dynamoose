---
order: 3
---

## Model

### Create Model From Schema

```js
var Dog = dynamoose.model('Dog', dogSchema);
```

### new Model(object)

Creates a new instance of the model. Object keys are assigned to the new model.

```js
var odie = new Dog({
  ownerId: 4,
  name: 'Odie',
  breed: 'Beagle',
  color: ['Tan'],
  cartoon: true
});
```

### model.put(options, callback) & model.save(options, callback)

Puts the item in the DynamoDB table.  Will overwrite the item.

```js
odie.save(function (err) {
  if(err) { return console.log(err); }
  console.log('Ta-da!');
});

odie.save({
    condition: '#o = :ownerId',
    conditionNames: { o: 'ownerId' },
    conditionValues: { ownerId: 4 }
  }, function (err) {
  if(err) { return console.log(err); }
  console.log('Ta-da!');
});
```

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
  }], function (err, dogs) {
    if (err) { return console.log(err); }
    console.log('Ta-da!');
  });
```

#### Options

**overwrite**: boolean

Overwrite existing item. Defaults to true.

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

### Model.get(key, options, callback)

Gets an item from the table.

```js
Dog.get({ownerId: 4, name: 'Odie'}, function(err, odie) {
  if(err) { return console.log(err); }
  console.log('Odie is a ' + odie.breed);
});
```


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
  if (err) { return console.log(err); }
  console.log('Retrieved two dogs: ' + dogs);
});
```

### Model.delete(key, options, callback)

Deletes an item from the table.

```js
Dog.delete({ownerId: 4, name: 'Odie'}, function(err) {
  if(err) { return console.log(err); }
  console.log('Bye bye Odie');
});
```

### model.delete(callback)

Deletes the item from the table.

```js
odie.delete(function(err) {
  if(err) { return console.log(err); }
  console.log('Bye bye Odie');
});
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
  if (err) { return console.log(err); }
  console.log('Bye bye my friends');
});
```

### Model.update(key, update, options, callback)

Updates and existing item in the table. Three types of updates: $PUT, $ADD, and $DELETE.

**$PUT**

Put is the default behavior.  The two example below are identical.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {age: 1}, function (err) {
  if(err) { return console.log(err); }
  console.log('Just a puppy');
})
```

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$PUT: {age: 1}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Just a puppy');
})
```

**$ADD**

Adds one or more attributes to the item.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$ADD: {age: 1}}, function (err) {
  if(err) { return console.log(err); }
  console.log('Birthday boy');
})
```

**$DELETE**

Removes one or more attributes from an item.

```js
Dog.update({ownerId: 4, name: 'Odie'}, {$DELETE: {age: null}}, function (err) {
  if(err) { return console.log(err); }
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
