const dynamoose = require("../dist");
const {createSmallSchema, createMediumSchema, createLargeSchema, createExtraLargeSchema} = require("./schemas");

// Enhanced benchmark runner with comprehensive statistics
class UnifiedBenchmarkRunner {
	constructor (name, config = {}) {
		this.name = name;
		this.results = [];
		this.memoryUsage = [];
		this.config = {
			"warmupRuns": 200,
			"benchmarkRuns": 1000,
			"modelOperationRuns": 1000,
			"enableMemoryTracking": true,
			...config
		};
	}

	// Memory tracking utility
	trackMemory (label = "default") {
		if (this.config.enableMemoryTracking) {
			const usage = process.memoryUsage();
			this.memoryUsage.push({
				label,
				"timestamp": Date.now(),
				"heapUsed": usage.heapUsed / 1024 / 1024, // MB
				"heapTotal": usage.heapTotal / 1024 / 1024, // MB
				"external": usage.external / 1024 / 1024 // MB
			});
		}
	}

	async warmup (operation, runs = this.config.warmupRuns) {
		console.log(`    🔥 Warming up ${this.name} (${runs} runs)...`);

		for (let i = 0; i < runs; i++) {
			try {
				await operation();
			} catch (error) {
				// Ignore warmup errors
			}
		}
	}

	async run (operation, runs = this.config.benchmarkRuns) {
		console.log(`  📊 Running ${this.name} benchmark (${runs} runs)...`);
		this.results = [];
		this.trackMemory("start");

		for (let i = 0; i < runs; i++) {
			const startTime = performance.now();

			try {
				await operation();
				const endTime = performance.now();
				const duration = endTime - startTime;
				this.results.push(duration);
			} catch (error) {
				console.warn(`    ⚠️  Run ${i + 1} failed:`, error.message);
				this.results.push(30000); // Use timeout value for failed runs
			}

			// Track memory periodically
			if (i % Math.floor(runs / 10) === 0) {
				this.trackMemory(`run-${i}`);
			}
		}

		this.trackMemory("end");
		return this.results;
	}

	printStats () {
		if (this.results.length === 0) {
			console.log(`    📈 ${this.name} Results: No data`);
			return {};
		}

		const sorted = [...this.results].sort((a, b) => a - b);
		const sum = sorted.reduce((a, b) => a + b, 0);
		const mean = sum / sorted.length;
		const median = sorted[Math.floor(sorted.length / 2)];
		const min = sorted[0];
		const max = sorted[sorted.length - 1];
		const p90 = sorted[Math.floor(sorted.length * 0.9)];
		const p95 = sorted[Math.floor(sorted.length * 0.95)];
		const p99 = sorted[Math.floor(sorted.length * 0.99)];

		// Standard deviation
		const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
		const stdDev = Math.sqrt(variance);

		// Coefficient of variation
		const cv = (stdDev / mean) * 100;

		// Operations per second
		const opsPerSec = 1000 / mean;

		// Memory stats
		let memoryStats = "";
		if (this.memoryUsage.length > 0) {
			const startMem = this.memoryUsage[0].heapUsed;
			const endMem = this.memoryUsage[this.memoryUsage.length - 1].heapUsed;
			const maxMem = Math.max(...this.memoryUsage.map(m => m.heapUsed));
			memoryStats = `Memory: ${startMem.toFixed(1)} → ${endMem.toFixed(1)}MB (max: ${maxMem.toFixed(1)}MB)`;
		}

		console.log(`    📈 ${this.name} Results:`);
		console.log(`       Runs: ${this.results.length}`);
		console.log(`       Mean: ${mean.toFixed(3)}ms (${opsPerSec.toFixed(2)} ops/sec)`);
		console.log(`       Median: ${median.toFixed(3)}ms`);
		console.log(`       Min: ${min.toFixed(3)}ms | Max: ${max.toFixed(3)}ms`);
		console.log(`       P90: ${p90.toFixed(3)}ms | P95: ${p95.toFixed(3)}ms | P99: ${p99.toFixed(3)}ms`);
		console.log(`       Std Dev: ${stdDev.toFixed(3)}ms | CV: ${cv.toFixed(2)}%`);
		if (memoryStats) {
			console.log(`       ${memoryStats}`);
		}

		return {
			"runs": this.results.length,
			mean,
			median,
			min,
			max,
			p90,
			p95,
			p99,
			stdDev,
			cv,
			opsPerSec,
			"memoryUsage": this.memoryUsage
		};
	}
}

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
			"userId": `user-${Math.random()}`,
			"personalInfo": {
				"firstName": "John",
				"lastName": "Doe",
				"dateOfBirth": new Date("1990-01-01"),
				"gender": "male",
				"nationality": "US",
				"languages": ["English", "Spanish"]
			},
			"contactInfo": {
				"primaryEmail": "john.doe@example.com",
				"secondaryEmail": "john.personal@example.com",
				"phoneNumbers": [{
					"type": "mobile",
					"number": "+1234567890",
					"countryCode": "+1",
					"isPrimary": true
				}],
				"addresses": [{
					"type": "home",
					"street": "123 Main St",
					"city": "New York",
					"state": "NY",
					"zipCode": "10001",
					"country": "US",
					"isDefault": true
				}]
			},
			"professionalInfo": {
				"currentPosition": {
					"title": "Software Engineer",
					"company": "Tech Corp",
					"department": "Engineering",
					"startDate": new Date("2020-01-01"),
					"salary": 100000,
					"currency": "USD"
				},
				"workHistory": [{
					"title": "Junior Developer",
					"company": "Previous Corp",
					"startDate": new Date("2018-01-01"),
					"endDate": new Date("2019-12-31"),
					"description": "Developed web applications",
					"achievements": ["Improved performance by 20%"]
				}],
				"skills": [{
					"name": "JavaScript",
					"level": "advanced",
					"yearsOfExperience": 5,
					"certifications": ["AWS Certified"]
				}],
				"education": [{
					"institution": "University of Technology",
					"degree": "Bachelor",
					"fieldOfStudy": "Computer Science",
					"startDate": new Date("2014-09-01"),
					"endDate": new Date("2018-05-31"),
					"gpa": 3.8,
					"honors": ["Magna Cum Laude"]
				}]
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
			"socialConnections": {
				"linkedAccounts": [{
					"platform": "github",
					"accountId": "johndoe123",
					"username": "johndoe",
					"isVerified": true,
					"connectedAt": new Date()
				}],
				"friends": ["friend1", "friend2"],
				"followers": ["follower1"],
				"following": ["following1"]
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
				"version": 1,
				"source": "registration",
				"importedFrom": "legacy_system",
				"tags": ["premium", "active"],
				"flags": ["beta_user"],
				"experiments": {
					"activeExperiments": ["experiment1"],
					"completedExperiments": ["experiment2"]
				}
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
					"changes": {"created": true},
					"reason": "Initial creation"
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

// Cleanup function
async function cleanupTestItems (testItems) {
	if (testItems.length > 0) {
		console.log(`    🧹 Cleaning up ${testItems.length} test items...`);
		try {
			// Simple cleanup - just remove references
			testItems.length = 0;
		} catch (error) {
			console.warn("    ⚠️  Cleanup encountered errors:", error.message);
		}
	}
}

// Function to clean up all created tables in local DynamoDB
async function cleanupAllTables (tableNames) {
	if (tableNames.length === 0) {
		console.log("No tables to clean up.");
		return;
	}

	console.log(`Cleaning up ${tableNames.length} tables from local DynamoDB...`);
	
	for (const tableName of tableNames) {
		try {
			// Use AWS SDK directly to delete tables from local DynamoDB
			const { DynamoDBClient, DeleteTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
			
			const client = new DynamoDBClient({
				endpoint: "http://localhost:8000",
				region: "us-east-1",
				credentials: {
					accessKeyId: "local",
					secretAccessKey: "local"
				}
			});

			// Check if table exists first
			const listCommand = new ListTablesCommand({});
			const listResult = await client.send(listCommand);
			
			if (listResult.TableNames && listResult.TableNames.includes(tableName)) {
				const deleteCommand = new DeleteTableCommand({
					TableName: tableName
				});
				
				await client.send(deleteCommand);
				console.log(`    ✅ Deleted table: ${tableName}`);
			} else {
				console.log(`    ⚠️  Table ${tableName} not found (may have been auto-deleted)`);
			}
		} catch (error) {
			console.log(`    ❌ Failed to delete table ${tableName}:`, error.message);
		}
	}
	
	console.log("Table cleanup completed.");
}

// Model operation benchmarks (CRUD operations)
async function benchmarkModelOperations (createdTables = []) {
	console.log("\n🏗️  MODEL OPERATION BENCHMARKS");
	console.log("=".repeat(50));

	const schemas = {
		"small": createSmallSchema(),
		"medium": createMediumSchema(),
		"large": createLargeSchema(),
		"extra-large": createExtraLargeSchema()
	};

	const results = {};
	const BENCHMARK_CONFIG = {
		"modelOperationRuns": 1000
	};

	for (const [schemaType, schema] of Object.entries(schemas)) {
		console.log(`\n🔧 Testing ${schemaType} schema model operations`);

		const ModelName = `ModelBenchmark${schemaType.charAt(0).toUpperCase() + schemaType.slice(1).replace("-", "")}${Date.now()}`;
		const Model = dynamoose.model(ModelName, schema);
		createdTables.push(ModelName);
		
		// Ensure table exists by creating first item (will auto-create table)
		console.log(`    ✅ Table ${ModelName} will be auto-created`);
		
		// Add a small delay to ensure table creation completes
		await new Promise(resolve => setTimeout(resolve, 100));

		// Create test items for get/update operations
		const testItems = [];
		console.log(`    📦 Creating ${BENCHMARK_CONFIG.modelOperationRuns} test items...`);

		for (let i = 0; i < BENCHMARK_CONFIG.modelOperationRuns; i++) {
			let data;
			try {
				data = generateTestData(schemaType);
				const item = await Model.create(data);
				testItems.push(item);
			} catch (error) {
				console.warn(`    ⚠️  Failed to create test item ${i + 1}:`, error.message);
				console.log("    Failed data:", JSON.stringify(data));
				console.log("    Schema type:", schemaType);
				console.log("    Model name:", ModelName);
				throw error; // Re-throw to see full stack
			}
		}

		console.log(`    ✅ Created ${testItems.length} test items`);

		const schemaResults = {};

		// Model.update benchmark
		if (testItems.length > 0) {
			const updateBenchmark = new UnifiedBenchmarkRunner(
				`${schemaType} Model.update`,
				{"benchmarkRuns": BENCHMARK_CONFIG.modelOperationRuns}
			);

			await updateBenchmark.warmup(async () => {
				const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
				const key = schemaType === "large" || schemaType === "extra-large"? {"id": randomItem.id, "userId": randomItem.userId}: {"id": randomItem.id};
				
				// Use appropriate field for each schema type
				const updateData = schemaType === "large" || schemaType === "extra-large" 
					? {$SET: {"personalInfo.firstName": `Updated-${Date.now()}`}}
					: {"name": `Updated-${Date.now()}`};

				await Model.update(key, updateData);
			});

			await updateBenchmark.run(async () => {
				const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
				const key = schemaType === "large" || schemaType === "extra-large"? {"id": randomItem.id, "userId": randomItem.userId}: {"id": randomItem.id};
				
				// Use appropriate field for each schema type
				const updateData = schemaType === "large" || schemaType === "extra-large" 
					? {$SET: {"personalInfo.firstName": `Updated-${Date.now()}`}}
					: {"name": `Updated-${Date.now()}`};

				await Model.update(key, updateData);
			});

			schemaResults.update = updateBenchmark.printStats();

			// Model.get benchmark
			const getBenchmark = new UnifiedBenchmarkRunner(
				`${schemaType} Model.get`,
				{"benchmarkRuns": BENCHMARK_CONFIG.modelOperationRuns}
			);

			await getBenchmark.warmup(async () => {
				const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
				const key = schemaType === "large" || schemaType === "extra-large"? {"id": randomItem.id, "userId": randomItem.userId}: {"id": randomItem.id};

				await Model.get(key);
			});

			await getBenchmark.run(async () => {
				const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
				const key = schemaType === "large" || schemaType === "extra-large"? {"id": randomItem.id, "userId": randomItem.userId}: {"id": randomItem.id};

				await Model.get(key);
			});

			schemaResults.get = getBenchmark.printStats();
		}

		// Cleanup
		await cleanupTestItems(testItems);
		
		// Mark table for cleanup (will be deleted at the end)
		console.log(`    📋 Table ${ModelName} marked for cleanup`);

		results[schemaType] = schemaResults;
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
async function runModelOperations () {
	console.log("🚀 DYNAMOOSE MODEL OPERATION BENCHMARKS");
	console.log("=".repeat(80));

	// Initialize database connection and track created tables
	await initializeDynamoDB();
	const createdTables = [];

	const startTime = performance.now();
	const results = await benchmarkModelOperations(createdTables);
	const endTime = performance.now();

	const totalDuration = (endTime - startTime) / 1000;

	console.log("\n" + "=".repeat(80));
	console.log("📊 MODEL OPERATION SUMMARY");
	console.log("=".repeat(80));
	console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
	
	// Comparison table
	console.log("\n📊 PERFORMANCE COMPARISON TABLE");
	console.log("=".repeat(80));
	console.log("Schema Size    | Model.update (ms) | Model.get (ms)");
	console.log("---------------|-------------------|---------------");
	
	for (const [schemaType, result] of Object.entries(results)) {
		const updateMean = result.update?.mean?.toFixed(3) || "N/A";
		const getMean = result.get?.mean?.toFixed(3) || "N/A";
		
		const paddedSchema = schemaType.padEnd(14);
		const paddedUpdate = updateMean.padEnd(17);
		
		console.log(`${paddedSchema} | ${paddedUpdate} | ${getMean}`);
	}
	
	console.log("\n📈 THROUGHPUT COMPARISON (ops/sec)");
	console.log("=".repeat(80));
	console.log("Schema Size    | Model.update      | Model.get");
	console.log("---------------|-------------------|----------");
	
	for (const [schemaType, result] of Object.entries(results)) {
		const updateOps = result.update?.opsPerSec?.toFixed(2) || "N/A";
		const getOps = result.get?.opsPerSec?.toFixed(2) || "N/A";
		
		const paddedSchema = schemaType.padEnd(14);
		const paddedUpdate = updateOps.padEnd(17);
		
		console.log(`${paddedSchema} | ${paddedUpdate} | ${getOps}`);
	}

	// Clean up all created tables from local DynamoDB
	console.log("\n🧹 CLEANING UP TABLES");
	console.log("=".repeat(80));
	await cleanupAllTables(createdTables);

	console.log("\n🎉 Model operation benchmarks completed!");

	return results;
}

// Export for programmatic usage
module.exports = {
	runModelOperations,
	UnifiedBenchmarkRunner,
	generateTestData
};

// Run benchmarks if this script is executed directly
if (require.main === module) {
	runModelOperations()
		.then(() => {
			console.log("\n🎉 Model operation benchmarks completed!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Model operation benchmarks failed:", error);
			process.exit(1);
		});
}