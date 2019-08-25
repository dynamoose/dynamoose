# Contributing To Dynamoose

## Quick Start

We have added a few helpers for your development. There are some scripts for you, and some automation for us.

To get all setup:

    npm i

This will get you ready to develop.

## Development Scripts

Dynamoose has a few helpers for local development. These are included in the scripts section of our `package.json`.

### npm test

This will run all of our tests via a node script. This spins up a local DynamoDB Local instance, runs Mocha, and closes the DynamoDB Local instance at completion.

### npm run test:debug

Same as above, but launched with `--inspect`. This will allow you to place debugger statements for working in the tests.

### npm run test:debug:brk

Same as above, but launched with `--inspect-brk`. This will allow you to place debugger statements for working in the tests, and not initialize the tests until you manually start it.

### npm run lint

This will run our lint configuration against all of our source files and alert you to any issues.

### npm run ci

This will run our lint, test, and coverage scripts. This is exactly what travis runs, if you'd like to verify prior to commit.

## Getting A PR Merged

We have a few requirements for getting a PR merged. They are:

  1. Must pass our `eslint`
  2. Must have test coverage not decrease
  3. An approved review
