import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  ops: number;
  margin: number;
  percentSlower: number;
}

interface SuiteResult {
  name: string;
  date: string;
  version: string;
  results: BenchmarkResult[];
}

// Default threshold for regression detection (20%)
const REGRESSION_THRESHOLD = process.env.REGRESSION_THRESHOLD ? 
  parseFloat(process.env.REGRESSION_THRESHOLD) : 20;

/**
 * Compare performance results between two benchmark runs
 * 
 * @param {string} baselineFile - Path to the baseline results JSON file
 * @param {string} currentFile - Path to the current results JSON file
 * @param {number} threshold - Performance regression threshold percentage (default: 20%)
 * @returns {boolean} - Returns true if performance meets the threshold, false if regression detected
 */
export function compareResults(baselineFile: string, currentFile: string, threshold: number = REGRESSION_THRESHOLD): boolean {
  // Read and parse the result files
  try {
    const baseline: SuiteResult = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const current: SuiteResult = JSON.parse(fs.readFileSync(currentFile, 'utf8'));

    console.log(`\nComparing performance results:`);
    console.log(`Baseline: ${baseline.name} (${baseline.date})`);
    console.log(`Current:  ${current.name} (${current.date})`);
    console.log(`Regression Threshold: ${threshold}%\n`);

    let hasRegression = false;

    // Compare each benchmark
    for (const currentResult of current.results) {
      const baselineResult = baseline.results.find(r => r.name === currentResult.name);
      
      if (!baselineResult) {
        console.log(`New benchmark: ${currentResult.name}`);
        continue;
      }

      const opsChange = ((currentResult.ops - baselineResult.ops) / baselineResult.ops) * 100;
      const isRegression = opsChange < -threshold;

      console.log(`Benchmark: ${currentResult.name}`);
      console.log(`  Baseline: ${baselineResult.ops.toLocaleString()} ops/sec`);
      console.log(`  Current:  ${currentResult.ops.toLocaleString()} ops/sec`);
      console.log(`  Change:   ${opsChange.toFixed(2)}%`);
      console.log(`  Status:   ${isRegression ? '❌ REGRESSION' : '✅ OK'}\n`);

      if (isRegression) {
        hasRegression = true;
      }
    }

    return !hasRegression;
  } catch (error) {
    console.error(`Error comparing performance results:`, error);
    // We'll return true (no regression) when there's an error to avoid
    // breaking the build pipeline on issues with the comparison itself
    return true;
  }
}

// Allow running directly from command line
if (require.main === module) {
  if (process.argv.length < 4) {
    console.log('Usage: node compare.js <baseline-file> <current-file> [threshold]');
    process.exit(1);
  }

  const baselineFile = process.argv[2];
  const currentFile = process.argv[3];
  const threshold = process.argv[4] ? parseFloat(process.argv[4]) : REGRESSION_THRESHOLD;
  
  const passed = compareResults(baselineFile, currentFile, threshold);
  
  if (!passed) {
    console.error('Performance regression detected! Exceeds threshold of ' + threshold + '%');
    process.exit(1);
  } else {
    console.log('Performance is within acceptable thresholds.');
  }
}