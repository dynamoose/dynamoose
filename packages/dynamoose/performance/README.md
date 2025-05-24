# Dynamoose Performance Testing

This directory contains performance tests for Dynamoose. These tests are designed to catch performance regressions before they make it into production code.

## Running Performance Tests

To run performance tests locally:

```bash
# From the root of the project
npm run performance

# Or from the dynamoose package
cd packages/dynamoose
npm run performance
```

## Adding New Performance Tests

Performance tests should be written in TypeScript and use the [benny](https://github.com/caderek/benny) library for benchmarking.

When adding new tests:

1. Create a new `.ts` file in this directory
2. Use the benny library to create benchmarks
3. Save results in the `../dist/performance/results` directory
4. Update the compare script if needed

## How Performance Testing Works

The performance tests:

1. Run benchmark suites using benny
2. Save results as JSON, CSV, and HTML chart files
3. Compare current results with previous results to detect regressions

## Performance Regression Checking

GitHub Actions runs performance tests on each PR and compares the results with the main branch. If a PR introduces a significant performance regression (default: 20% slower), the check will fail.

You can adjust the regression threshold using the `REGRESSION_THRESHOLD` environment variable:

```bash
REGRESSION_THRESHOLD=30 npm run performance:compare -- baseline.json current.json
```

## Understanding Results

Results are stored in several formats:

- JSON: Raw benchmark data for comparisons
- CSV: Spreadsheet-friendly format for analysis
- HTML: Visual chart for comparing results

Results are saved in the `dist/performance/results` directory.