/* eslint-disable no-console, no-unused-vars */
const dynamoose = require("../dist");
const {performance} = require("perf_hooks");
const {
	createSmallSchema,
	createMediumSchema,
	createLargeSchema,
	createExtraLargeSchema
} = require("./schemas");

// Comprehensive benchmark configuration
const BENCHMARK_CONFIG = {
	"warmupRuns": 200,
	"benchmarkRuns": 5000,
	"modelOperationRuns": 1000,
	"operationTimeout": 30000,
	"enableProfiling": false,
	"enableMemoryTracking": true
};

// Command line argument parsing
const args = process.argv.slice(2);
const options = {
	"operations": args.includes("--operations") ? (args[args.indexOf("--operations") + 1] || "").split(",") : ["all"],
	"schemas": args.includes("--schemas") ? (args[args.indexOf("--schemas") + 1] || "").split(",") : ["all"],
	"verbose": args.includes("--verbose"),
	"quick": args.includes("--quick"),
	"profile": args.includes("--profile"),
	"help": args.includes("--help")
};

if (options.help) {
	console.log(`
🚀 Dynamoose Unified Performance Benchmark

Usage: node unified-benchmark.js [options]

Options:
  --operations <list>    Comma-separated list of operations to test
                        Available: conversion,model,profiling,all
                        Default: all
                        
  --schemas <list>       Comma-separated list of schemas to test  
                        Available: small,medium,large,extra-large,all
                        Default: all
                        
  --quick               Run with reduced iterations for faster results
  --verbose             Show detailed output for each operation
  --profile             Enable detailed profiling measurements
  --help                Show this help message

Examples:
  node unified-benchmark.js
  node unified-benchmark.js --operations conversion --schemas small,large
  node unified-benchmark.js --quick --verbose
  node unified-benchmark.js --profile --schemas large
`);
	process.exit(0);
}

// Adjust config for quick mode
if (options.quick) {
	BENCHMARK_CONFIG.warmupRuns = 25;
	BENCHMARK_CONFIG.benchmarkRuns = 200;
	BENCHMARK_CONFIG.modelOperationRuns = 50;
}

if (options.profile) {
	BENCHMARK_CONFIG.enableProfiling = true;
}

// Enhanced benchmark runner with comprehensive statistics
class UnifiedBenchmarkRunner {
	constructor (name, config = {}) {
		this.name = name;
		this.results = [];
		this.memoryUsage = [];
		this.config = {...BENCHMARK_CONFIG, ...config};
		this.profiling = {
			"phases": {},
			"calls": 0
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

	// Phase profiling for detailed analysis
	startPhase (phase) {
		if (this.config.enableProfiling) {
			this.profiling.phases[phase] = {"start": performance.now()};
		}
	}

	endPhase (phase) {
		if (this.config.enableProfiling && this.profiling.phases[phase]) {
			this.profiling.phases[phase].duration = performance.now() - this.profiling.phases[phase].start;
		}
	}

	async warmup (operation, runs = this.config.warmupRuns) {
		if (options.verbose) {
			console.log(`    🔥 Warming up ${this.name} (${runs} runs)...`);
		}

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
			this.startPhase("operation");

			try {
				await operation();
				this.endPhase("operation");
				const endTime = performance.now();
				const duration = endTime - startTime;
				this.results.push(duration);

				if (options.verbose && i % 10 === 0) {
					console.log(`    Run ${i + 1}/${runs}: ${duration.toFixed(2)}ms`);
				}
			} catch (error) {
				this.endPhase("operation");
				const endTime = performance.now();
				console.warn(`    ⚠️  Run ${i + 1} failed:`, error.message);
				this.results.push(this.config.operationTimeout);
			}

			// Memory tracking every 25 runs
			if (i % 25 === 0) {
				this.trackMemory(`run-${i}`);
			}
		}

		this.trackMemory("end");
		this.profiling.calls = runs;
	}

	getStats () {
		if (this.results.length === 0) return null;

		const sorted = [...this.results].sort((a, b) => a - b);
		const sum = this.results.reduce((a, b) => a + b, 0);
		const mean = sum / this.results.length;
		const median = sorted[Math.floor(sorted.length / 2)];
		const min = sorted[0];
		const max = sorted[sorted.length - 1];
		const p90 = sorted[Math.floor(sorted.length * 0.90)];
		const p95 = sorted[Math.floor(sorted.length * 0.95)];
		const p99 = sorted[Math.floor(sorted.length * 0.99)];

		// Calculate standard deviation and coefficient of variation
		const variance = this.results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.results.length;
		const stdDev = Math.sqrt(variance);
		const cv = stdDev / mean * 100;

		// Memory statistics
		let memoryStats = null;
		if (this.memoryUsage.length > 0) {
			const heapUsed = this.memoryUsage.map((m) => m.heapUsed);
			memoryStats = {
				"startHeap": this.memoryUsage[0].heapUsed,
				"endHeap": this.memoryUsage[this.memoryUsage.length - 1].heapUsed,
				"maxHeap": Math.max(...heapUsed),
				"avgHeap": heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length
			};
		}

		return {
			"runs": this.results.length,
			"mean": parseFloat(mean.toFixed(3)),
			"median": parseFloat(median.toFixed(3)),
			"min": parseFloat(min.toFixed(3)),
			"max": parseFloat(max.toFixed(3)),
			"p90": parseFloat(p90.toFixed(3)),
			"p95": parseFloat(p95.toFixed(3)),
			"p99": parseFloat(p99.toFixed(3)),
			"stdDev": parseFloat(stdDev.toFixed(3)),
			"cv": parseFloat(cv.toFixed(2)),
			"opsPerSecond": parseFloat((1000 / mean).toFixed(2)),
			memoryStats,
			"profiling": this.config.enableProfiling ? this.profiling : null
		};
	}

	printStats () {
		const stats = this.getStats();
		if (!stats) {
			console.log(`    ❌ No successful runs for ${this.name}`);
			return stats;
		}

		console.log(`    📈 ${this.name} Results:`);
		console.log(`       Runs: ${stats.runs}`);
		console.log(`       Mean: ${stats.mean}ms (${stats.opsPerSecond} ops/sec)`);
		console.log(`       Median: ${stats.median}ms`);
		console.log(`       Min: ${stats.min}ms | Max: ${stats.max}ms`);
		console.log(`       P90: ${stats.p90}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
		console.log(`       Std Dev: ${stats.stdDev}ms | CV: ${stats.cv}%`);

		if (stats.memoryStats) {
			console.log(`       Memory: ${stats.memoryStats.startHeap.toFixed(1)} → ${stats.memoryStats.endHeap.toFixed(1)}MB (max: ${stats.memoryStats.maxHeap.toFixed(1)}MB)`);
		}

		if (options.verbose && stats.profiling) {
			console.log(`       Profiling: ${Object.keys(stats.profiling.phases).length} phases tracked`);
		}

		return stats;
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
			"name": "Test User",
			"email": "test@example.com",
			"profile": {
				"firstName": "John",
				"lastName": "Doe",
				"age": 25,
				"address": {
					"street": "123 Main St",
					"city": "New York",
					"zipCode": "10001",
					"country": "US"
				}
			},
			"preferences": {
				"theme": "dark",
				"notifications": true,
				"language": "en"
			},
			"tags": ["user", "active"],
			"metadata": {
				"source": "registration",
				"version": 1
			},
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
				"dateOfBirth": new Date("1990-01-01").toISOString(),
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
					"startDate": new Date("2020-01-01").toISOString(),
					"salary": 100000,
					"currency": "USD"
				},
				"workHistory": [{
					"title": "Junior Developer",
					"company": "Previous Corp",
					"startDate": new Date("2018-01-01").toISOString(),
					"endDate": new Date("2019-12-31").toISOString(),
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
					"startDate": new Date("2014-09-01").toISOString(),
					"endDate": new Date("2018-05-31").toISOString(),
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
							"data": {"metrics": "performance"},
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
							"completedDate": null,
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
			}
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
		if (options.schemas.includes("all") || options.schemas.includes(schemaType)) {
			console.log(`\n📝 Testing ${schemaType} schema conversions`);

			// Create model for this schema type
			const ModelName = `ConversionBenchmark${schemaType.charAt(0).toUpperCase() + schemaType.slice(1).replace("-", "")}${Date.now()}`;
			const Model = dynamoose.model(ModelName, schema);
			const testData = generateTestData(schemaType);

			// toDynamo benchmark
			const toDynamoBenchmark = new UnifiedBenchmarkRunner(`${schemaType} toDynamo`);
			await toDynamoBenchmark.warmup(() => {
				const item = new Model(testData);
				item.toDynamo();
			});

			await toDynamoBenchmark.run(() => {
				const item = new Model(testData);
				item.toDynamo();
			});

			const toDynamoStats = toDynamoBenchmark.printStats();

			// fromDynamo benchmark
			const item = new Model(testData);
			const dynamoData = item.toDynamo();

			const fromDynamoBenchmark = new UnifiedBenchmarkRunner(`${schemaType} fromDynamo`);
			await fromDynamoBenchmark.warmup(() => {
				new Model(dynamoData, {"type": "fromDynamo"});
			});

			await fromDynamoBenchmark.run(() => {
				new Model(dynamoData, {"type": "fromDynamo"});
			});

			const fromDynamoStats = fromDynamoBenchmark.printStats();

			// fromDynamo strict mode benchmark
			const fromDynamoStrictBenchmark = new UnifiedBenchmarkRunner(`${schemaType} fromDynamo (strict)`);
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
	}

	return results;
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

	for (const [schemaType, schema] of Object.entries(schemas)) {
		if (options.schemas.includes("all") || options.schemas.includes(schemaType)) {
			console.log(`\n🔧 Testing ${schemaType} schema model operations`);

			const ModelName = `ModelBenchmark${schemaType.charAt(0).toUpperCase() + schemaType.slice(1).replace("-", "")}${Date.now()}`;
			const Model = dynamoose.model(ModelName, schema);
			createdTables.push(ModelName);

			// Create test items for get/update operations
			const testItems = [];
			console.log(`    📦 Creating ${BENCHMARK_CONFIG.modelOperationRuns} test items...`);

			for (let i = 0; i < BENCHMARK_CONFIG.modelOperationRuns; i++) {
				try {
					const data = generateTestData(schemaType);
					const item = await Model.create(data);
					testItems.push(item);
				} catch (error) {
					console.warn(`    ⚠️  Failed to create test item ${i + 1}:`, error.message);
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

					await Model.update(key, {"name": `Updated-${Date.now()}`});
				});

				await updateBenchmark.run(async () => {
					const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
					const key = schemaType === "large" || schemaType === "extra-large"? {"id": randomItem.id, "userId": randomItem.userId}: {"id": randomItem.id};

					await Model.update(key, {"name": `Updated-${Date.now()}`});
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

			// Cleanup test items
			console.log(`    🧹 Cleaning up ${testItems.length} test items...`);
			for (const item of testItems) {
				try {
					await item.delete();
				} catch (error) {
					// Ignore cleanup errors
				}
			}

			results[schemaType] = schemaResults;
		}
	}

	return results;
}

// Profiling benchmark for detailed performance analysis
async function benchmarkProfiling () {
	console.log("\n🔬 PROFILING BENCHMARKS");
	console.log("=".repeat(50));

	const schema = createLargeSchema();
	const ModelName = `ProfilingBenchmark${Date.now()}`;
	const Model = dynamoose.model(ModelName, schema);
	const testData = generateTestData("large");

	// Profile different update complexity variations
	const variations = {
		"simple": {"name": "Simple Update"},
		"nested": {
			"profile.personal.age": 30,
			"profile.personal.location": "San Francisco"
		},
		"complex": {
			"name": "Complex Update",
			"profile.personal": {
				"age": 35,
				"location": "Seattle",
				"interests": ["technology", "hiking", "photography"],
				"bio": "Updated biography with more details"
			},
			"analytics.pageViews": 200,
			"analytics.metrics": [
				{"name": "updated-clicks", "value": 50, "date": new Date()}
			]
		}
	};

	// Create a test item
	const testItem = await Model.create(testData);

	const results = {};

	for (const [variationType, updateData] of Object.entries(variations)) {
		console.log(`\n🧪 Profiling ${variationType} updates`);

		const profilingBenchmark = new UnifiedBenchmarkRunner(
			`Profiling ${variationType}`,
			{
				"benchmarkRuns": 50,
				"enableProfiling": true,
				"enableMemoryTracking": true
			}
		);

		await profilingBenchmark.warmup(async () => {
			await Model.update({"id": testItem.id, "userId": testItem.userId}, updateData);
		});

		await profilingBenchmark.run(async () => {
			await Model.update({"id": testItem.id, "userId": testItem.userId}, updateData);
		});

		results[variationType] = profilingBenchmark.printStats();
	}

	// Cleanup
	await testItem.delete();

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

// Cleanup DynamoDB resources
async function cleanupDynamoDB (dbConfig, createdTables = []) {
	console.log("\n🧹 Cleaning up DynamoDB resources...");

	try {
		// Clean up any remaining tables
		if (createdTables.length > 0) {
			console.log(`    📋 Removing ${createdTables.length} tables...`);
			for (const tableName of createdTables) {
				try {
					const ddb = dynamoose.aws.ddb();
					await ddb.deleteTable({"TableName": tableName}).promise();
					console.log(`    ✅ Deleted table: ${tableName}`);
				} catch (error) {
					// Table might not exist or already deleted
					if (error.code !== "ResourceNotFoundException") {
						console.warn(`    ⚠️  Failed to delete table ${tableName}:`, error.message);
					}
				}
			}
		}

		// Reset Dynamoose to default configuration
		if (dbConfig.isLocal) {
			console.log("    🔄 Reverting to default DynamoDB configuration...");
			dynamoose.aws.ddb.revert();
		}

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
			console.log("    ♻️  Forced garbage collection");
		}

		console.log("    ✅ Cleanup completed successfully");
	} catch (error) {
		console.warn("    ⚠️  Cleanup encountered errors:", error.message);
	}
}

// Main benchmark runner
async function runUnifiedBenchmarks () {
	console.log("🚀 DYNAMOOSE UNIFIED PERFORMANCE BENCHMARK");
	console.log("=".repeat(80));
	console.log(`Configuration: ${BENCHMARK_CONFIG.benchmarkRuns} runs, ${BENCHMARK_CONFIG.warmupRuns} warmup`);
	console.log(`Operations: ${options.operations.join(", ")}`);
	console.log(`Schemas: ${options.schemas.join(", ")}`);
	console.log("=".repeat(80));

	// Initialize database connection and track created tables
	const dbConfig = await initializeDynamoDB();
	const createdTables = [];
	const allResults = {};
	const startTime = performance.now();

	try {
		// Run conversion benchmarks
		if (options.operations.includes("all") || options.operations.includes("conversion")) {
			allResults.conversions = await benchmarkConversions();
		}

		// Run model operation benchmarks
		if (options.operations.includes("all") || options.operations.includes("model")) {
			allResults.modelOperations = await benchmarkModelOperations(createdTables);
		}

		// Run profiling benchmarks
		if (options.operations.includes("all") || options.operations.includes("profiling")) {
			allResults.profiling = await benchmarkProfiling();
		}

		const endTime = performance.now();
		const totalDuration = (endTime - startTime) / 1000;

		// Generate comprehensive summary
		console.log("\n" + "=".repeat(100));
		console.log("📊 UNIFIED BENCHMARK SUMMARY");
		console.log("=".repeat(100));

		// Conversion results summary
		if (allResults.conversions) {
			console.log("\n🔄 CONVERSION PERFORMANCE SUMMARY:");
			console.log("Schema        toDynamo (ms)    fromDynamo (ms)   fromDynamo Strict (ms)    Ops/Sec");
			console.log("-".repeat(85));

			for (const [schema, results] of Object.entries(allResults.conversions)) {
				const toDynamo = results.toDynamo && results.toDynamo.mean ? results.toDynamo.mean.toFixed(3) : "N/A";
				const fromDynamo = results.fromDynamo && results.fromDynamo.mean ? results.fromDynamo.mean.toFixed(3) : "N/A";
				const fromDynamoStrict = results.fromDynamoStrict && results.fromDynamoStrict.mean ? results.fromDynamoStrict.mean.toFixed(3) : "N/A";
				const opsPerSec = results.toDynamo && results.toDynamo.opsPerSecond ? results.toDynamo.opsPerSecond : "N/A";

				console.log(`${schema.padEnd(12)} ${toDynamo.padEnd(15)} ${fromDynamo.padEnd(16)} ${fromDynamoStrict.padEnd(24)} ${opsPerSec}`);
			}
		}

		// Model operations summary
		if (allResults.modelOperations) {
			console.log("\n🏗️  MODEL OPERATION PERFORMANCE SUMMARY:");
			console.log("Schema        Update (ms)      Get (ms)         Update Ops/Sec    Get Ops/Sec");
			console.log("-".repeat(75));

			for (const [schema, results] of Object.entries(allResults.modelOperations)) {
				const update = results.update && results.update.mean ? results.update.mean.toFixed(3) : "N/A";
				const get = results.get && results.get.mean ? results.get.mean.toFixed(3) : "N/A";
				const updateOps = results.update && results.update.opsPerSecond ? results.update.opsPerSecond : "N/A";
				const getOps = results.get && results.get.opsPerSecond ? results.get.opsPerSecond : "N/A";

				console.log(`${schema.padEnd(12)} ${update.padEnd(15)} ${get.padEnd(15)} ${updateOps.toString().padEnd(16)} ${getOps}`);
			}
		}

		// Performance insights
		console.log("\n💡 PERFORMANCE INSIGHTS:");
		console.log("-".repeat(50));

		// Conversion insights
		if (allResults.conversions && allResults.conversions.small && allResults.conversions.large) {
			const smallToDynamo = allResults.conversions.small.toDynamo.mean;
			const largeToDynamo = allResults.conversions.large.toDynamo.mean;
			const ratio = (largeToDynamo / smallToDynamo).toFixed(2);
			console.log(`• Large schema conversions are ${ratio}x slower than small schema`);
		}

		// Model operation insights
		if (allResults.modelOperations && allResults.modelOperations.small && allResults.modelOperations.large) {
			const smallUpdate = allResults.modelOperations.small.update && allResults.modelOperations.small.update.mean;
			const largeUpdate = allResults.modelOperations.large.update && allResults.modelOperations.large.update.mean;
			if (smallUpdate && largeUpdate) {
				const updateRatio = (largeUpdate / smallUpdate).toFixed(2);
				console.log(`• Large schema updates are ${updateRatio}x slower than small schema`);
			}
		}

		// Profiling insights
		if (allResults.profiling) {
			const simple = allResults.profiling.simple && allResults.profiling.simple.mean;
			const complex = allResults.profiling.complex && allResults.profiling.complex.mean;
			if (simple && complex) {
				const complexityRatio = (complex / simple).toFixed(2);
				console.log(`• Complex updates are ${complexityRatio}x slower than simple updates`);
			}
		}

		// Memory usage insights
		const hasMemoryData = Object.values(allResults).some((categoryResults) =>
			Object.values(categoryResults).some((schemaResults) =>
				Object.values(schemaResults).some((opResults) => opResults && opResults.memoryStats)
			)
		);

		if (hasMemoryData) {
			console.log("• Memory usage tracked across all operations for optimization insights");
		}

		console.log(`\n⏱️  Total benchmark duration: ${totalDuration.toFixed(2)} seconds`);
		console.log(`📈 Total operations benchmarked: ${Object.values(allResults).reduce((total, category) =>
			total + Object.values(category).reduce((catTotal, schema) =>
				catTotal + Object.keys(schema).length, 0), 0)}`);

		console.log("\n✅ Unified benchmark completed successfully!");

	} catch (error) {
		console.error("❌ Benchmark failed with error:", error);
		console.error(error.stack);
	} finally {
		// Always cleanup DynamoDB resources, even if benchmark failed
		await cleanupDynamoDB(dbConfig, createdTables);
	}

	return allResults;
}

// Export for programmatic usage
module.exports = {
	runUnifiedBenchmarks,
	UnifiedBenchmarkRunner,
	BENCHMARK_CONFIG
};

// Run benchmarks if this script is executed directly
if (require.main === module) {
	runUnifiedBenchmarks()
		.then(() => {
			console.log("\n🎉 All benchmarks completed!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Benchmark suite failed:", error);
			process.exit(1);
		});
}
