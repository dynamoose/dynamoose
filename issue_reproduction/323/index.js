const dynamoose = require('../../lib');
const dynalite = require('dynalite');

const startUpAndReturnDynamo = async () => {
    const dynaliteServer = dynalite();
    await dynaliteServer.listen(8000);
    return dynaliteServer;
};

const createDynamooseInstance = () => {
    dynamoose.AWS.config.update({
      accessKeyId: 'AKID',
      secretAccessKey: 'SECRET',
      region: 'us-east-1'
    });
    dynamoose.local(); // This defaults to "http://localhost:8000"
    return dynamoose
}

const initialize = async () => {
    await startUpAndReturnDynamo()
    return createDynamooseInstance()
}

module.exports = {
    initialize
}
