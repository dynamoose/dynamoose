const dynamoose = require("../dist");
const {createSmallSchema, createMediumSchema, createLargeSchema, createExtraLargeSchema} = require("./schemas");
const BenchmarkRunner = require("./utils/benchmark-runner");



// Test data generators for different schema types
function generateTestData (schemaType) {
	switch (schemaType) {
	case "small":
		return {
			"id": `small-${Date.now()}-${Math.random()}`,
			"name": "Test User",
			"email": "test@example.com",
			"age": 25,
			"active": true
		};

	case "medium":
		return {
			"id": `medium-${Date.now()}-${Math.random()}`,
			"name": "John Doe",
			"email": "john.doe@example.com",
			"profile": {
				"firstName": "John",
				"lastName": "Doe",
				"age": 30
			},
			"preferences": {
				"theme": "dark",
				"notifications": true,
				"language": "en"
			},
			"tags": ["user", "premium", "verified"],
			"metadata": {
				"source": "web",
				"campaign": "signup_2024"
			},
			"version": 1,
			"createdAt": new Date(),
			"updatedAt": new Date()
		};

	case "large":
		return {
			"id": `large-${Date.now()}-${Math.random()}`,
			"name": "John Doe",
			"email": "john.doe@example.com",
			"profile": {
				"personal": {
					"firstName": "John",
					"lastName": "Doe",
					"dateOfBirth": new Date("1990-01-01"),
					"gender": "male",
					"nationality": "US",
					"languages": ["en", "es"],
					"hobbies": ["reading", "swimming", "coding"]
				},
				"professional": {
					"title": "Software Engineer",
					"company": "Tech Corp",
					"department": "Engineering",
					"startDate": new Date("2020-01-01"),
					"salary": 100000,
					"currency": "USD",
					"skills": ["JavaScript", "Python", "AWS"],
					"certifications": ["AWS Solutions Architect", "PMP"]
				},
				"workHistory": [{
					"title": "Junior Developer",
					"company": "Previous Corp",
					"startDate": new Date("2018-01-01"),
					"endDate": new Date("2019-12-31"),
					"description": "Developed web applications",
					"achievements": ["Improved performance by 20%"]
				}],
				"education": [{
					"degree": "Bachelor",
					"fieldOfStudy": "Computer Science",
					"institution": "University",
					"startDate": new Date("2014-09-01"),
					"endDate": new Date("2018-05-31"),
					"gpa": 3.8,
					"honors": ["Magna Cum Laude"]
				}]
			},
			"socialConnections": {
				"social": [{
					"platform": "linkedIn",
					"username": "johndoe",
					"isVerified": true,
					"connectedAt": new Date()
				}],
				"friends": ["friend1", "friend2"],
				"groups": ["developers", "engineers"]
			},
			"preferences": {
				"appearance": {
					"theme": "dark",
					"fontSize": "medium",
					"colorScheme": "blue"
				},
				"notifications": {
					"email": {
						"marketing": true,
						"product": true,
						"security": true
					},
					"push": {
						"enabled": true,
						"frequency": "immediate"
					},
					"sms": {
						"enabled": false,
						"emergencyOnly": true
					}
				},
				"privacy": {
					"profileVisibility": "friends",
					"dataSharing": false,
					"analytics": true
				}
			},
			"activityLog": [{
				"action": "login",
				"timestamp": new Date(),
				"ipAddress": "192.168.1.1",
				"userAgent": "Mozilla/5.0",
				"location": {
					"country": "US",
					"city": "New York",
					"latitude": 40.7128,
					"longitude": -74.0060
				},
				"metadata": {"source": "web"}
			}],
			"settings": {
				"security": {
					"twoFactorEnabled": false,
					"loginAlerts": true,
					"passwordChangeDate": new Date(),
					"securityQuestions": [{
						"question": "What is your pet's name?",
						"answerHash": "hashed_answer"
					}]
				},
				"billing": {
					"plan": "premium",
					"billingCycle": "monthly",
					"paymentMethods": [{
						"type": "credit_card",
						"last4": "1234",
						"expiryMonth": 12,
						"expiryYear": 2025,
						"isDefault": true
					}]
				}
			},
			"customFields": {
				"field1": "value1",
				"field2": 123,
				"field3": true,
				"field4": new Date(),
				"field5": {"nested": "object"},
				"field6": ["array", "values"],
				"field7": "value7",
				"field8": 456,
				"field9": false,
				"field10": new Date()
			},
			"metadata": {
				"source": "import",
				"importId": "batch-2024-001",
				"tags": ["imported", "verified", "complete"],
				"category": "user",
				"priority": "high",
				"notes": "Migrated from legacy system"
			},
			"audit": {
				"createdAt": new Date(),
				"createdBy": "system",
				"updatedAt": new Date(),
				"updatedBy": "user",
				"version": 1,
				"changeLog": [{
					"timestamp": new Date(),
					"userId": "admin",
					"action": "create",
					"changes": {"field": "value"}
				}]
			}
		};

	case "extra-large": {
		const largeData = generateTestData("large");
		return {
			...largeData,
			"complexDataTypes": {
				"stringSet": new Set(["tag1", "tag2", "tag3"]),
				"numberSet": new Set([1, 2, 3, 4, 5]),
				"binaryData": Buffer.from("test binary data"),
				"bufferSet": new Set([Buffer.from("data1"), Buffer.from("data2")]),
				"multiType": Math.random() > 0.5 ? "stringValue" : 42,
				"nullableField": null,
				"constantValue": "EXTRA_LARGE_SCHEMA",
				"combinedIds": `${Date.now()}-combined`,
				"dateWithOptions": new Date(),
				"nestedSets": {
					"tags": new Set(["performance", "benchmark", "test"]),
					"scores": new Set([95, 87, 92])
				}
			},
			"complexAnalytics": {
				"behaviorData": [{
					"sessionId": `session-${Math.random()}`,
					"startTime": new Date(Date.now() - 3600000),
					"endTime": new Date(),
					"pageViews": [{
						"url": "/home",
						"title": "Home Page",
						"timeSpent": 120000,
						"interactions": [{
							"type": "click",
							"element": "button-cta",
							"timestamp": new Date(),
							"coordinates": {"x": 500, "y": 300}
						}]
					}],
					"deviceInfo": {
						"browser": "Chrome",
						"browserVersion": "91.0",
						"os": "macOS",
						"osVersion": "11.0",
						"device": "desktop",
						"screenResolution": "1920x1080",
						"viewport": {"width": 1920, "height": 1080}
					}
				}],
				"performanceMetrics": [{
					"timestamp": new Date(),
					"metric": "page_load_time",
					"value": 1200,
					"unit": "ms",
					"context": {"page": "/home"}
				}]
			},
			"businessData": {
				"companies": [{
					"id": "company-1",
					"name": "Tech Corp",
					"industry": "Technology",
					"size": "large",
					"revenue": 10000000,
					"employees": [{
						"id": "emp-1",
						"name": "John Doe",
						"position": "Engineer",
						"department": "Engineering",
						"reports": [{
							"id": "report-1",
							"title": "Monthly Report",
							"data": {"content": "performance report"},
							"generatedAt": new Date()
						}]
					}],
					"projects": [{
						"id": "proj-1",
						"name": "Web Platform",
						"status": "active",
						"milestones": [{
							"id": "milestone-1",
							"title": "MVP Release",
							"dueDate": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
							"tasks": [{
								"id": "task-1",
								"title": "Implement authentication",
								"assignee": "emp-1",
								"status": "in-progress",
								"priority": "high",
								"estimatedHours": 40,
								"actualHours": 35,
								"dependencies": []
							}]
						}]
					}]
				}]
			},
		};
	}

	default:
		return generateTestData("small");
	}
}

// Schema conversion benchmarks (toDynamo/fromDynamo)
async function benchmarkConversions () {
	console.log("\n🔄 SCHEMA CONVERSION BENCHMARKS");
	console.log("=".repeat(50));

	const schemas = {
		"small": createSmallSchema(),
		"medium": createMediumSchema(),
		"large": createLargeSchema(),
		"extra-large": createExtraLargeSchema()
	};

	const results = {};

	for (const [schemaType, schema] of Object.entries(schemas)) {
		console.log(`\n📝 Testing ${schemaType} schema conversions`);

		// Create model for this schema type
		const ModelName = `ConversionBenchmark${schemaType.charAt(0).toUpperCase() + schemaType.slice(1).replace("-", "")}${Date.now()}`;
		const Model = dynamoose.model(ModelName, schema);
		const testData = generateTestData(schemaType);

		// toDynamo benchmark
		const toDynamoBenchmark = new BenchmarkRunner(`${schemaType} toDynamo`);
		await toDynamoBenchmark.warmup(() => {
			const item = new Model(testData);
			item.toDynamo({"customTypesDynamo": true});
		});

		await toDynamoBenchmark.run(() => {
			const item = new Model(testData);
			item.toDynamo({"customTypesDynamo": true});
		});

		const toDynamoStats = toDynamoBenchmark.printStats();

		// Convert to DynamoDB format for fromDynamo tests
		const item = new Model(testData);
		const dynamoData = await item.toDynamo({"customTypesDynamo": true});

		// fromDynamo benchmark
		const fromDynamoBenchmark = new BenchmarkRunner(`${schemaType} fromDynamo`);
		await fromDynamoBenchmark.warmup(() => {
			new Model(dynamoData, {"type": "fromDynamo"});
		});

		await fromDynamoBenchmark.run(() => {
			new Model(dynamoData, {"type": "fromDynamo"});
		});

		const fromDynamoStats = fromDynamoBenchmark.printStats();

		// fromDynamo strict mode benchmark
		const fromDynamoStrictBenchmark = new BenchmarkRunner(`${schemaType} fromDynamo (strict)`);
		await fromDynamoStrictBenchmark.warmup(() => {
			new Model(dynamoData, {"type": "fromDynamo", "readStrict": true});
		});

		await fromDynamoStrictBenchmark.run(() => {
			new Model(dynamoData, {"type": "fromDynamo", "readStrict": true});
		});

		const fromDynamoStrictStats = fromDynamoStrictBenchmark.printStats();

		results[schemaType] = {
			"toDynamo": toDynamoStats,
			"fromDynamo": fromDynamoStats,
			"fromDynamoStrict": fromDynamoStrictStats
		};
	}

	return results;
}

// Initialize DynamoDB connection
async function initializeDynamoDB () {
	try {
		dynamoose.aws.ddb.local("http://localhost:8000");
		console.log("🔧 Using local DynamoDB at http://localhost:8000");
		return {"isLocal": true, "endpoint": "http://localhost:8000"};
	} catch (error) {
		console.log("⚠️  Local DynamoDB not available, using default AWS configuration");
		console.log(error.message);
		return {"isLocal": false};
	}
}

// Main execution
async function runSchemaConversions () {
	console.log("🚀 DYNAMOOSE SCHEMA CONVERSION BENCHMARKS");
	console.log("=".repeat(80));

	// Initialize database connection
	await initializeDynamoDB();

	const startTime = performance.now();
	const results = await benchmarkConversions();
	const endTime = performance.now();

	const totalDuration = (endTime - startTime) / 1000;

	console.log("\n" + "=".repeat(80));
	console.log("📊 SCHEMA CONVERSION SUMMARY");
	console.log("=".repeat(80));
	console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
	
	// Comparison table
	console.log("\n📊 PERFORMANCE COMPARISON TABLE");
	console.log("=".repeat(80));
	console.log("Schema Size    | toDynamo (ms) | fromDynamo (ms) | fromDynamo Strict (ms)");
	console.log("---------------|---------------|-----------------|---------------------");
	
	for (const [schemaType, result] of Object.entries(results)) {
		const toDynamoMean = result.toDynamo?.mean?.toFixed(3) || "N/A";
		const fromDynamoMean = result.fromDynamo?.mean?.toFixed(3) || "N/A";
		const fromDynamoStrictMean = result.fromDynamoStrict?.mean?.toFixed(3) || "N/A";
		
		const paddedSchema = schemaType.padEnd(14);
		const paddedToDynamo = toDynamoMean.padEnd(13);
		const paddedFromDynamo = fromDynamoMean.padEnd(15);
		
		console.log(`${paddedSchema} | ${paddedToDynamo} | ${paddedFromDynamo} | ${fromDynamoStrictMean}`);
	}
	
	console.log("\n📈 THROUGHPUT COMPARISON (ops/sec)");
	console.log("=".repeat(80));
	console.log("Schema Size    | toDynamo      | fromDynamo     | fromDynamo Strict");
	console.log("---------------|---------------|----------------|------------------");
	
	for (const [schemaType, result] of Object.entries(results)) {
		const toDynamoOps = result.toDynamo?.opsPerSec?.toFixed(2) || "N/A";
		const fromDynamoOps = result.fromDynamo?.opsPerSec?.toFixed(2) || "N/A";
		const fromDynamoStrictOps = result.fromDynamoStrict?.opsPerSec?.toFixed(2) || "N/A";
		
		const paddedSchema = schemaType.padEnd(14);
		const paddedToDynamo = toDynamoOps.padEnd(13);
		const paddedFromDynamo = fromDynamoOps.padEnd(14);
		
		console.log(`${paddedSchema} | ${paddedToDynamo} | ${paddedFromDynamo} | ${fromDynamoStrictOps}`);
	}

	console.log("\n🎉 Schema conversion benchmarks completed!");

	return results;
}

// Export for programmatic usage
module.exports = {
	runSchemaConversions,
	BenchmarkRunner,
	generateTestData
};

// Run benchmarks if this script is executed directly
if (require.main === module) {
	runSchemaConversions()
		.then(() => {
			console.log("\n🎉 Schema conversion benchmarks completed!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Schema conversion benchmarks failed:", error);
			process.exit(1);
		});
}