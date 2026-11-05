const ModelStore = require("../dist/ModelStore").default;
const Mitm = require("mitm");

// Unit tests must not reach the network: every request must go to a mocked DynamoDB client.
// Connections to the loopback interface (for example DynamoDB Local) are allowed.
const mitm = Mitm();
const blockedRequests = [];
mitm.on("connect", (socket, options) => {
	if (!options.host || ["localhost", "127.0.0.1", "::1"].includes(options.host)) {
		socket.bypass();
	}
});
mitm.on("request", (request, response) => {
	blockedRequests.push(`${request.method} ${request.headers.host}${request.url}`);
	// A 400 status is not retried by the AWS SDK, so the blocked call fails at once
	response.statusCode = 400;
	response.setHeader("content-type", "application/x-amz-json-1.0");
	response.end(JSON.stringify({"__type": "NetworkBlockedInTests", "message": "Real HTTP requests are not allowed in unit tests"}));
});
afterEach(() => {
	// Thrown instead of `expect` so tests that use `expect.assertions` keep their count
	const requests = blockedRequests.splice(0);
	if (requests.length > 0) {
		throw new Error(`Real HTTP requests are not allowed in unit tests. Blocked: ${requests.join(", ")}`);
	}
});
afterAll(() => {
	mitm.disable();
});

beforeEach(() => {
	ModelStore.clear();
});


expect.extend({
	toBeWithinRange (received, floor, ceiling) {
		const pass = received >= floor && received <= ceiling;
		if (pass) {
			return {
				"message": () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
				"pass": true
			};
		} else {
			return {
				"message": () => `expected ${received} to be within range ${floor} - ${ceiling}`,
				"pass": false
			};
		}
	}
});
/*
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeWithinRange(a: number, b: number): R;
		}
	}
}
*/
