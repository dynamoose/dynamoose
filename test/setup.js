'use strict';

const DynamoDbLocal = require('dynamodb-local');
const DYNAMO_DB_PORT = 8000;

/**
 * This functions looks for any running db instance on our desired port, kills it, and starts a new one
 * @return {child_process} dynamoLocal - a child process instance attached to our running db instance
 */
const startUpAndReturnDynamo = async () => {
  const dynamoLocal = await DynamoDbLocal.launch(DYNAMO_DB_PORT);
  return dynamoLocal;
};

let dynamoDb;

before(async function () {
  this.timeout(30000);
  dynamoDb = await startUpAndReturnDynamo();
});

after(() => {
  if (dynamoDb && dynamoDb.pid) {
    process.kill(dynamoDb.pid);
  }
});
