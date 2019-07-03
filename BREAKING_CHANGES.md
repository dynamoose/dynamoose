# Breaking Change

## v1.x to v2.x

#### Behavior Changes
- Use operation `$SET` instead of `$PUT`
- Deprecated operation `$PUT` 
- Change old operation `$DELETE` to `$REMOVE` for remove attribute
- new implement operation `$DELETE` to follow AWS DynamoDB for remove elements from sets

#### How to migrate
- Change operation `$DELETE` to `$REMOVE` in Model.update
- Change operation `$PUT` to `$SET` in Model.update

```js
// v1.x
Cats.Cat.update({'id': 999}, {'$PUT': {'name': 'Tom'}});
Cats.Cat.update({'id': 999}, {'$DELETE': {'owner': null}});

// v2.x
Cats.Cat.update({'id': 999}, {'$SET': {'name': 'Tom'}});
Cats.Cat.update({'id': 999}, {'$REMOVE': {'owner': null}});
```
