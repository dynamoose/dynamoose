# Dynamoose Roadmap

### Release 0.9

The goal of release 0.9 is to increase the parity with mongoose.  The primary purpose will be to come up with a plugin system similar to that of mongoose although not necessarily compatible.

- [ ] Plugin system
- [ ] `Model.find` alias
- [ ] Complete `.populate` support


### Release 1.0

The main goal of 1.0 will be to improve the code and refactor to ES2015 (ES6).  In addition, `useNativeBooleans` and `useDocumentTypes`  will be toggled to make uses of "newer" DynamoDB features by default.

- [ ] ES2015 updates
- [ ] Switch to ESLint
- [ ] Set `useNativeBooleans` and `useDocumentTypes` to default to `true`
