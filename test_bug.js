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

// Test function to verify the bug without accessing DynamoDB
async function testBug() {
  console.log("Testing bug with custom Date type...");
  
  // 1. Create a new item with a timestamp (number)
  const timestamp = Date.now();
  console.log("Using timestamp:", timestamp, "of type:", typeof timestamp);
  
  // Create the item directly without going through DynamoDB
  const item = new DateModel.Item({
    "id": "test",
    "someDate": timestamp
  });
  
  // Verify the type before any processing
  console.log("\n1. BEFORE PROCESSING:");
  console.log("Item someDate type:", typeof item.someDate);
  console.log("Item someDate value:", item.someDate);
  
  // 2. Emulate the processing that happens during Model.create
  // This just copies the item without schema conformance
  console.log("\n2. EMULATING MODEL.CREATE:");
  // Model.create doesn't call conformToSchema on the input object
  console.log("Model.create someDate type:", typeof item.someDate);
  console.log("Model.create someDate value:", item.someDate);
  
  // 3. Emulate the processing that happens during Model.get
  console.log("\n3. EMULATING MODEL.GET:");
  // Model.get calls conformToSchema with customTypesDynamo:true
  const processedItem = await item.conformToSchema({
    "customTypesDynamo": true,
    "type": "fromDynamo"
  });
  console.log("Model.get someDate type:", typeof processedItem.someDate);
  console.log("Model.get someDate value:", processedItem.someDate);
  
  console.log("\nBUG CONFIRMED:", typeof item.someDate !== typeof processedItem.someDate);
}

// Run the test
testBug()
  .then(() => console.log("\nTest completed"))
  .catch((error) => console.error("\nTest failed:", error));