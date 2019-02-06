const Mocha = require('mocha');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readdir = util.promisify(require('fs').readdir);
const DynamoDbLocal = require('dynamodb-local');
const DYNAMO_DB_PORT = 8000;
const testDir = path.resolve(__dirname, './test');

/**
 * This functions looks for any running db instance on our desired port, kills it, and starts a new one
 * @return {child_process} dynamoLocal - a child process instance attached to our running db instance
 */
const startUpAndReturnDynamo = async () => {
  const getPID = `ps aux | grep "DynamoDBLocal.jar -port ${DYNAMO_DB_PORT}" | grep -v grep | awk '{print $2}'`;
  const {stdout} = await exec(getPID);
  if (parseInt(stdout)) {
    console.log(`Killing DynamoDBLocal process on port ${DYNAMO_DB_PORT}`);
    process.kill(parseInt(stdout));
  }
  const dynamoLocal = await DynamoDbLocal.launch(DYNAMO_DB_PORT);
  return dynamoLocal;
};

/**
 * starts up dynamo, finds our tests files, excludes configuration, runs them, kills dynamo, returns results.
 * @return {[type]} [description]
 */
const runMocha = async () => {
  const dynamoDb = await startUpAndReturnDynamo();
  const mocha = new Mocha();
  const files = await readdir(testDir);
  files.forEach(file => {
    if (file.substr(-3) === '.js' && !file.startsWith('.')) {
      mocha.addFile(
        path.join(testDir, file)
      );
    }
  });
  mocha.run(function(failures) {
    if (dynamoDb && dynamoDb.pid) {
      process.kill(dynamoDb.pid);
    }
    const exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
    process.exit(exitCode);
  });
};

runMocha();
