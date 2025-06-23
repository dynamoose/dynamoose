const ModelStore = require("../dist/ModelStore").default;
const Mitm = require("mitm");

const mitm = Mitm();


beforeAll(() => {
	mitm.on("request", (req, res) => {
		console.log("request", req.url);
		// Immediately end the response to block the request
		res.end();
		// Determine the protocol (http or https) based on the socket type
		const protocol = req.socket.constructor.name === "TlsSocket" ? "https" : "http";
		// Throw an error with details about the attempted HTTP request
		throw new Error(
			  `HTTP requests are not allowed during tests. Attempted to call ${req.method} ${protocol}://${req.headers.host}${req.url}`
		);
		  });
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
