const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

// Create an instance of the command to inspect its structure
const updateCommand = new UpdateTableCommand({
  TableName: 'TestTable',
  ReplicaUpdates: [
    {
      Create: {
        RegionName: 'us-west-1'
      }
    }
  ]
});

console.log('UpdateTableCommand structure:');
console.log(JSON.stringify(updateCommand.input, null, 2));