// Enhanced benchmark runner with comprehensive statistics
class BenchmarkRunner {
	constructor (name, config = {}) {
		this.name = name;
		this.results = [];
		this.memoryUsage = [];
		this.failedRuns = 0;
		this.config = {
			"warmupRuns": 5,
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
		this.failedRuns = 0;
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
				this.failedRuns++;
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
		console.log(`       Successful Runs: ${this.results.length}`);
		if (this.failedRuns > 0) {
			console.log(`       Failed Runs: ${this.failedRuns}`);
		}
		console.log(`       Mean: ${mean.toFixed(3)}ms (${opsPerSec.toFixed(2)} ops/sec)`);
		console.log(`       Median: ${median.toFixed(3)}ms`);
		console.log(`       Min: ${min.toFixed(3)}ms | Max: ${max.toFixed(3)}ms`);
		console.log(`       P90: ${p90.toFixed(3)}ms | P95: ${p95.toFixed(3)}ms | P99: ${p99.toFixed(3)}ms`);
		console.log(`       Std Dev: ${stdDev.toFixed(3)}ms | CV: ${cv.toFixed(2)}%`);
		if (memoryStats) {
			console.log(`       ${memoryStats}`);
		}

		return {
			"successfulRuns": this.results.length,
			"failedRuns": this.failedRuns,
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

module.exports = BenchmarkRunner; 