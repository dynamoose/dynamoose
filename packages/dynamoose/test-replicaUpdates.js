// Simple validation of ReplicaUpdates structure
const replicaUpdatesExample = {
  TableName: "TestTable",
  ReplicaUpdates: [
    {
      Create: {
        RegionName: "us-west-1"
      }
    },
    {
      Delete: {
        RegionName: "us-east-1"
      }
    }
  ]
};

console.log('ReplicaUpdates structure example:');
console.log(JSON.stringify(replicaUpdatesExample, null, 2));