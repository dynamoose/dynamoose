# Dynamoose Performance Benchmarks

This directory contains comprehensive performance benchmarks for Dynamoose, a DynamoDB modeling tool for Node.js.

## Overview

The benchmarks are designed to measure Dynamoose performance across different operations and schema complexities:

- **Schema Conversion Benchmarks**: Tests `toDynamo()` and `fromDynamo()` operations
- **Model Operation Benchmarks**: Tests CRUD operations like `Model.create()`, `Model.update()`, and `Model.get()`

## Benchmark Scripts

### Schema Conversion Benchmarks
- **File**: `schema-conversions-benchmark.js`
- **Command**: `npm run benchmark:conversions`
- **Tests**: 
  - `toDynamo()` - Convert JavaScript objects to DynamoDB format
  - `fromDynamo()` - Convert DynamoDB data to JavaScript objects  
  - `fromDynamo(strict)` - Convert with strict mode enabled

### Model Operation Benchmarks  
- **File**: `model-operations-benchmark.js`
- **Command**: `npm run benchmark:models`
- **Tests**:
  - `Model.update()` - Update existing items in DynamoDB
  - `Model.get()` - Retrieve items from DynamoDB

### Run All Benchmarks
- **Command**: `npm run benchmark`
- **Description**: Runs both schema conversion and model operation benchmarks sequentially

## Schema Complexity Levels

The benchmarks test four different schema complexity levels:

### Small Schema
- Simple flat structure with basic types
- Fields: `id`, `name`, `email`, `age`, `active`
- Use case: Basic user profiles

### Medium Schema  
- Nested objects and arrays
- Validation rules and default values
- Fields: Profile data, preferences, metadata
- Use case: User profiles with settings

### Large Schema
- Complex nested structures 
- Multiple validation rules
- Professional info, contact details, social connections
- Use case: Enterprise user management

### Extra Large Schema
- Maximum complexity with all DynamoDB data types
- **Complex Data Types Included**:
  - **Sets**: String sets, Number sets, Buffer sets
  - **Binary Data**: Buffer types for binary storage
  - **Multi-Type Fields**: Fields that accept multiple types (String | Number)
  - **NULL Values**: Explicit NULL type support
  - **Constant Values**: Fields with constant values
  - **Combined Fields**: Automatically generated from other field combinations
  - **Date Options**: Dates with custom storage formats (ISO, milliseconds, seconds)
  - **Nested Sets**: Sets within nested objects
- Use case: Complex enterprise applications with rich data models

## Configuration

### Benchmark Settings
- **Warmup Runs**: 200 (for JIT optimization)
- **Benchmark Runs**: 1000 (for statistical accuracy)
- **Model Operation Test Items**: 1000 per schema type

### Local DynamoDB
The benchmarks are configured to use local DynamoDB:
- **Endpoint**: `http://localhost:8000`
- **Auto Table Management**: Tables are automatically created and cleaned up
- **Cleanup**: All created tables are deleted after benchmark completion

## Output Metrics

Each benchmark provides comprehensive statistics:

### Performance Metrics
- **Mean**: Average operation time in milliseconds
- **Median**: Middle value operation time
- **Min/Max**: Fastest and slowest operation times
- **Percentiles**: P90, P95, P99 for latency distribution analysis
- **Standard Deviation**: Measure of performance consistency
- **Coefficient of Variation**: Relative variability percentage

### Throughput Metrics
- **Operations per Second**: Calculated from mean execution time
- **Memory Usage**: Heap memory tracking throughout benchmark

### Comparison Tables
- **Performance Table**: Side-by-side latency comparison across schema sizes
- **Throughput Table**: Operations per second comparison

## Example Output

```
📊 PERFORMANCE COMPARISON TABLE
================================================================================
Schema Size    | Model.update (ms) | Model.get (ms)
---------------|-------------------|---------------
small          | 0.809             | 0.437
medium         | 3.521             | 1.561
large          | 12.049            | 5.988
extra-large    | 16.467            | 8.321

📈 THROUGHPUT COMPARISON (ops/sec)
================================================================================
Schema Size    | Model.update      | Model.get
---------------|-------------------|----------
small          | 1236.01           | 2285.87
medium         | 283.97            | 640.79
large          | 82.99             | 167.00
extra-large    | 60.73             | 120.18
```

## Prerequisites

### Required Setup
1. **Local DynamoDB**: Must be running on `http://localhost:8000`
   ```bash
   # Download and run DynamoDB Local
   java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -port 8000
   ```

2. **Dependencies**: Install all project dependencies
   ```bash
   npm install
   ```

3. **Build**: Ensure Dynamoose is built
   ```bash
   npm run build
   ```

## Running Benchmarks

### Individual Benchmarks
```bash
# Schema conversion benchmarks only
npm run benchmark:conversions

# Model operation benchmarks only  
npm run benchmark:models
```

### All Benchmarks
```bash
# Run complete benchmark suite
npm run benchmark
```

## Interpreting Results

### Performance Analysis
- **Latency Growth**: Notice how operation time increases with schema complexity
- **Throughput Impact**: Observe how complex schemas reduce operations per second
- **Memory Usage**: Monitor heap memory consumption patterns

### Use Case Guidance
- **Small/Medium schemas**: Suitable for high-throughput applications
- **Large schemas**: Good balance of features and performance  
- **Extra-large schemas**: Use when rich data modeling is required, plan for lower throughput

### Optimization Insights
- Complex nested objects significantly impact performance
- Set types and binary data add processing overhead
- Consider schema simplification for performance-critical applications

## Schema Files

- **`schemas.js`**: Contains all schema definitions
- **Data generators**: Test data creation for each schema complexity level
- **Complex types**: Examples of all supported DynamoDB data types

## Advanced Data Types

The extra-large schema demonstrates all supported DynamoDB data types:

### Basic Types
- `String`, `Number`, `Boolean`, `Date`, `Buffer`, `Object`, `Array`

### Set Types
```javascript
"stringSet": {
  "type": Set,
  "schema": [String]
},
"numberSet": {
  "type": Set, 
  "schema": [Number]
},
"bufferSet": {
  "type": Set,
  "schema": [Buffer]
}
```

### Special Types
```javascript
// Multiple allowed types
"multiType": [String, Number],

// NULL values
"nullableField": dynamoose.type.NULL,

// Constant values
"constantValue": {
  "type": dynamoose.type.CONSTANT,
  "value": "EXTRA_LARGE_SCHEMA"
},

// Combined fields
"combinedIds": {
  "type": dynamoose.type.COMBINE,
  "attributes": ["id", "userId"],
  "separator": "#"
},

// Date with storage options
"dateWithOptions": {
  "type": Date,
  "storage": "iso"  // or "milliseconds" or "seconds"
}
```

## Performance Characteristics

### Typical Results by Schema Size

| Schema | Update (ms) | Get (ms) | Update (ops/sec) | Get (ops/sec) |
|--------|-------------|----------|------------------|---------------|
| Small | ~0.8 | ~0.4 | ~1,200 | ~2,300 |
| Medium | ~3.5 | ~1.6 | ~280 | ~640 |
| Large | ~12 | ~6 | ~80 | ~170 |
| Extra-Large | ~16 | ~8 | ~60 | ~120 |

### Performance Factors

**Schema Complexity Impact:**
- Each level of nesting adds processing overhead
- Validation rules increase serialization time
- Set types require additional processing
- Binary data impacts memory usage

**Operation Type Impact:**
- `Get` operations are generally 2-3x faster than `Update`
- `fromDynamo` is typically faster than `toDynamo`
- Strict mode adds minimal overhead

## Table Management

The benchmarks automatically handle DynamoDB table lifecycle:

1. **Auto-Creation**: Tables are created when first item is saved
2. **Naming**: Uses timestamp-based unique names to avoid conflicts
3. **Cleanup**: All tables are deleted after benchmark completion
4. **Error Handling**: Graceful handling of table creation/deletion failures

## Memory Management

Memory usage patterns:
- **Small schemas**: ~15-20MB heap usage
- **Medium schemas**: ~20-30MB heap usage  
- **Large schemas**: ~30-45MB heap usage
- **Extra-large schemas**: ~40-50MB heap usage

Memory is tracked throughout benchmarks and reported in results.

## Troubleshooting

### Common Issues

1. **DynamoDB Connection**
   ```bash
   # Check if local DynamoDB is running
   curl http://localhost:8000
   ```

2. **Build Issues**
   ```bash
   # Clean and rebuild
   npm run build:clean
   npm run build
   ```

3. **Memory Issues**
   ```bash
   # Reduce benchmark runs if needed
   # Edit BENCHMARK_CONFIG.modelOperationRuns in benchmark files
   ```

4. **Timeout Issues**
   - Large schemas may take longer
   - Benchmark automatically handles timeouts with 30-second limits

### Debug Mode

Enable detailed logging:
```bash
DEBUG=dynamoose* npm run benchmark
```

## Contributing

When contributing to benchmarks:

1. **Schema Changes**: Update both schema definitions and test data generators
2. **New Data Types**: Add examples to extra-large schema
3. **Performance Tests**: Ensure adequate warmup and sample sizes
4. **Documentation**: Update README with new features
5. **Table Cleanup**: Verify proper cleanup of created resources

## Files Structure

```
benchmarks/
├── README.md                           # This file
├── schemas.js                          # Schema definitions
├── schema-conversions-benchmark.js     # Conversion benchmarks  
├── model-operations-benchmark.js       # CRUD operation benchmarks
└── performance-benchmark.js            # Legacy unified benchmark (deprecated)
```

## Notes

- All benchmarks include proper error handling and timeout management
- Tables are automatically created and cleaned up to prevent conflicts
- Memory tracking provides insights into resource usage patterns
- Statistical accuracy improved with 1000+ runs per test
- Complex data types demonstrate full DynamoDB feature support