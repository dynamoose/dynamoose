import * as dynamoose from "..";
import * as b from "benny";
import * as fs from "fs";
import * as path from "path";

// Ensure results directory exists
const resultsDir = path.join(process.cwd(), "performance-results");
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

// Simple schema definition
const schema = new dynamoose.Schema({
    id: {
        type: String,
        hashKey: true
    },
    name: String,
    age: Number,
    email: String
});

// Create suite for Model creation benchmark
b.suite(
    "Model Creation",
    b.add("Create Model", () => {
        dynamoose.model("User", schema);
    }),
    b.add("Create Model with Table Options", () => {
        dynamoose.model("UserWithOptions", schema, { 
            tableName: "UserTable",
            waitForActive: false
        });
    }),
    b.cycle(),
    b.complete(),
    b.save({ file: "model-creation", folder: resultsDir }),
    b.save({ file: "model-creation", folder: resultsDir, format: "chart.html" }),
    b.save({ file: "model-creation", folder: resultsDir, format: "csv" })
)
    .then(() => console.log("Performance test completed successfully"))
    .catch(err => console.error("Error running performance test:", err));