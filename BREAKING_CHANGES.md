# Breaking Change

#### Behavior Changes
- Change old `$DELETE` to `$REMOVE` for remove attribute
- new implement `$DELETE` to follow AWS DynamoDB for remove elements from sets

#### How to migrate
- Change `$DELETE` to `$REMOVE` in Model.update
