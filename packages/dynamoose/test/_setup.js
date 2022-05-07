const ModelStore = require("../dist/ModelStore").default;

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
