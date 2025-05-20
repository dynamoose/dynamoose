This is a NPM package that houses Dynamoose, a Node.js modeling tool for Amazon DynamoDB.

Most of the project is written in TypeScript, with a few things being written in JavaScript (ie. script files, test files, and build helpers).

The project is structured in a monorepo format, with 3 packages:

- `packages/dynamoose`: The main package that contains the core functionality of Dynamoose.
- `packages/dynamoose-logger`: The logger package that users can install to get logging functionality.
- `packages/dynamoose-utils`: A shared package that contains utility functions used by both `dynamoose` and `dynamoose-logger`.

You can build the project by running `npm run build` in the root directory. This will build all packages in the monorepo. You can also build individual packages by running `npm run build` in the package directory.

It is critical to always write tests to cover all code and edge cases. You can run the test suite by using the `npm test` command in the root directory. We also have type tests that you can run using `npm run test:types` in the root directory. You can also run these commands individually in each package directory to run for a specific package.

It is also important to run the linter to ensure the format of the code is correct. You can run the linter by using the `npm run lint` or `npm run lint:fix` command in the root directory. The `npm run lint:fix` command will automatically fix any issues that it can automatically and report any that it cannot fix. You can also run this command individually in each package directory to run for a specific package.

It's important to update the documentation when making changes to the code. Most of the documentation lives in the `docs/docs_src` folder. Some of the documentation is generated from the JSDoc comments in the code. If you see something like `dyno_jsdoc_dist/Model/index.js|model.table`, that will get replaced with the actual JSDoc comments in the code when the site is built. You can build the documentation site by running `npm run site:build` in the root directory. Sometimes you won't need to make any changes to the `docs/docs_src` folder, but you will need to update the JSDoc comments in the code. You are expected to determine if all the documentation lives in JSDoc comments or if edits need to be made to the `docs/docs_src` folder.

Whenever you submit a PR, be sure to put a short summary in the PENDING_CHANGELOG.md file. You can use the CHANGELOG.md file as a template for the formatting of that changelog.
