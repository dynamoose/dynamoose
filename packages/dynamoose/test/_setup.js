const ModelStore = require("../dist/ModelStore").default;

// The network guard is in test/_environment.js.
afterEach(() => {
	// Thrown instead of `expect` so tests that use `expect.assertions` keep their count
	const requests = global.takeBlockedRequests();
	if (requests.length > 0) {
		throw new Error(`Real HTTP requests are not allowed in unit tests. Blocked: ${requests.join(", ")}`);
	}
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
