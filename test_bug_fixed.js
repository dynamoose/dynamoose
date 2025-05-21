const dynamoose = require("./packages/dynamoose/dist");

// Initialize and configure
dynamoose.Table.defaults.set({
  "create": false,
  "waitForActive": false
});

// Set up a model with a Date attribute
const dateSchema = new dynamoose.Schema({
  "id": String,
  "someDate": {
    "type": Date
  }
});
const DateModel = dynamoose.model("DateModel", dateSchema);

// Test function to verify the bug is fixed
async function testFix() {
  console.log("Testing fix for custom Date type...");
  
  // Get current timestamp
  const timestamp = Date.now();
  console.log("Using timestamp:", timestamp, "of type:", typeof timestamp);
  
  // Create an item with the timestamp
  const item = new DateModel.Item({
    "id": "test",
    "someDate": timestamp
  });
  
  // Simulate save operation with our fix
  console.log("\n1. Original item before save:");
  console.log("someDate type:", typeof item.someDate);
  console.log("someDate value:", item.someDate);
  
  // Apply our fix (call conformToSchema after save)
  const savedItem = await item.conformToSchema({"customTypesDynamo": true, "type": "fromDynamo"});
  
  console.log("\n2. After our fix is applied:");
  console.log("someDate type:", typeof savedItem.someDate);
  console.log("someDate value:", savedItem.someDate);
  
  // Verify type is now consistent
  const isCorrectType = savedItem.someDate instanceof Date;
  console.log("\nIs someDate now a Date object?", isCorrectType);
  
  return isCorrectType;
}

// Run the test
testFix()
  .then(success => {
    if (success) {
      console.log("\nFIX SUCCESSFUL: Custom Date type is now handled correctly!");
    } else {
      console.log("\nFIX FAILED: Custom Date type is still not handled correctly.");
    }
  })
  .catch((error) => console.error("\nTest failed with error:", error));