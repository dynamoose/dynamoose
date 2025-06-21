# Dynamoose Performance Benchmarks

This directory contains performance benchmarks for measuring the speed of Dynamoose operations with different schema sizes.

## Overview

The benchmarks test Model.update and Model.get operations across four schema complexity levels:
- **Small**: Basic schema with 5 simple fields
- **Medium**: Moderate complexity with nested objects and arrays
- **Large**: High complexity with deep nesting, validations, and multiple data types
- **Extra Large**: Maximum complexity with analytics data and business objects

## Files

- `schemas.js` - Defines schema definitions of varying complexity
- `performance-benchmark.js` - Unified benchmark runner with comprehensive testing capabilities
- `README.md` - This documentation file

## Running Benchmarks

### Prerequisites

1. Build the project first:
```bash
npm run build
```

2. Ensure you have access to DynamoDB (local or AWS)

### Available Commands

```bash
# Run all benchmarks
npm run benchmark

# Run with custom options (see --help for full list)
node benchmarks/performance-benchmark.js --help
node benchmarks/performance-benchmark.js --quick
node benchmarks/performance-benchmark.js --operations conversion
node benchmarks/performance-benchmark.js --schemas small,medium
```

### Direct Execution

You can also run the benchmark script directly:

```bash
# From the dynamoose package directory
node benchmarks/performance-benchmark.js
```

## Benchmark Configuration

The benchmarks use the following configuration (found in `performance-benchmark.js`):

```javascript
const BENCHMARK_CONFIG = {
  warmupRuns: 5,        // Number of warmup iterations
  benchmarkRuns: 20,    // Number of benchmark iterations
  operationTimeout: 30000 // Maximum time per operation (30s)
};
```

## Output Format

The benchmark produces detailed statistics for each operation:

- **Runs**: Number of successful operations
- **Mean**: Average execution time
- **Median**: Middle value execution time
- **Min/Max**: Fastest and slowest execution times
- **P95/P99**: 95th and 99th percentile response times
- **Std Dev**: Standard deviation of execution times

### Sample Output

```
🔄 UPDATE OPERATION RESULTS:
Schema Type     Mean (ms)   Median (ms) P95 (ms)   P99 (ms)
------------------------------------------------------------
small           45.23       42.18       78.45      89.12
medium          125.67      118.34      198.23     245.67
large           342.89      321.45      567.89     623.45
extra-large     756.23      712.34      1234.56    1345.67

📖 GET OPERATION RESULTS:
Schema Type     Mean (ms)   Median (ms) P95 (ms)   P99 (ms)
------------------------------------------------------------
small           12.45       11.23       18.67      22.34
medium          28.67       26.45       42.34      48.23
large           89.34       84.23       134.56     152.34
extra-large     198.45      187.23      298.67     334.56
```

## Performance Insights

The benchmark automatically calculates performance ratios:
- Compares large vs small schema performance
- Compares update vs get operation performance
- Identifies potential bottlenecks in schema complexity

## Database Configuration

The benchmark attempts to connect to a local DynamoDB instance first:
```javascript
dynamoose.aws.aws.ddb.initialize({
  endpoint: "http://localhost:8000",
  region: "us-east-1", 
  accessKeyId: "local",
  secretAccessKey: "local"
});
```

If local DynamoDB is not available, it falls back to your default AWS configuration.

### Setting up Local DynamoDB

For consistent benchmarking, consider using local DynamoDB:

1. Download DynamoDB Local from AWS
2. Run: `java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb`
3. This starts DynamoDB on `http://localhost:8000`

## Interpreting Results

### What to Look For

1. **Linear vs Exponential Growth**: Check if performance degradation is proportional to schema complexity
2. **Outliers**: Look at P95/P99 percentiles for worst-case performance
3. **Memory Usage**: Monitor if large schemas cause memory pressure
4. **Consistency**: Low standard deviation indicates consistent performance

### Common Performance Issues

- **Schema Validation**: Complex validation rules slow down operations
- **Deep Nesting**: Deeply nested objects require more processing
- **Large Arrays**: Arrays with many elements impact serialization
- **Type Conversions**: Complex type mappings add overhead

## Customizing Benchmarks

### Adding New Schema Types

1. Add new schema creation function to `schemas.js`
2. Add corresponding test data generation in `performance-benchmark.js`
3. Include the new schema type in the `schemas` object in `runAllBenchmarks()`

### Modifying Test Data

Update the `generateTestData()` and `generateUpdateData()` functions in `performance-benchmark.js` to change the data used in benchmarks.

### Adjusting Configuration

Modify `BENCHMARK_CONFIG` to change:
- Number of warmup/benchmark runs
- Operation timeout
- Other performance parameters

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure DynamoDB is accessible
2. **Timeout Errors**: Increase `operationTimeout` for very large schemas
3. **Memory Errors**: Reduce `benchmarkRuns` if running out of memory
4. **Permission Errors**: Ensure AWS credentials have DynamoDB access

### Debugging

Enable detailed logging by setting environment variables:
```bash
export DEBUG=dynamoose*
npm run benchmark
```

## Contributing

When adding new benchmarks:
1. Follow the existing code structure
2. Add appropriate error handling
3. Include documentation for new benchmark types
4. Test with different schema complexities
5. Update this README with any new features