const {TestEnvironment} = require("jest-environment-node");
const Mitm = require("mitm");

// Unit tests must not reach the network: every request must go to a mocked DynamoDB client.
// Connections to the loopback interface (for example DynamoDB Local) are allowed.
// The guard lives in the test environment, not in test/_setup.js: a setup-file afterAll runs before the
// afterAll hooks of the test file, so those hooks would run without the guard.
class NetworkGuardEnvironment extends TestEnvironment {
	async setup () {
		await super.setup();
		const blockedRequests = [];
		// test/_setup.js checks these after each test.
		this.global.takeBlockedRequests = () => blockedRequests.splice(0);
		this.mitm = Mitm();
		this.mitm.on("connect", (socket, options) => {
			if (!options.host || ["localhost", "127.0.0.1", "::1"].includes(options.host)) {
				socket.bypass();
			}
		});
		this.mitm.on("request", (request, response) => {
			blockedRequests.push(`${request.method} ${request.headers.host}${request.url}`);
			// A 400 status is not retried by the AWS SDK, so the blocked call fails at once
			response.statusCode = 400;
			response.setHeader("content-type", "application/x-amz-json-1.0");
			response.end(JSON.stringify({"__type": "NetworkBlockedInTests", "message": "Real HTTP requests are not allowed in unit tests"}));
		});
	}

	async teardown () {
		try {
			const requests = this.global.takeBlockedRequests();
			if (requests.length > 0) {
				throw new Error(`Real HTTP requests are not allowed in unit tests. Blocked after the last test: ${requests.join(", ")}`);
			}
		} finally {
			this.mitm.disable();
			await super.teardown();
		}
	}
}

module.exports = NetworkGuardEnvironment;
