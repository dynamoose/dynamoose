// The network guard of the unit tests (test/_environment.js). Without these, a guard that stopped
// working would leave the suite green.
const http = require("http");

const get = (url) => new Promise((resolve, reject) => {
	http.get(url, (response) => {
		let body = "";
		response.on("data", (chunk) => {
			body += chunk;
		});
		response.on("end", () => resolve({"status": response.statusCode, body}));
	}).on("error", reject);
});

describe("Network guard", () => {
	it("Should answer a request to a remote host with an error and record it", async () => {
		const response = await get("http://network-guard-test.invalid/path");
		// Taken here, so the afterEach check of test/_setup.js does not fail this test.
		const blocked = global.takeBlockedRequests();
		expect(response.status).toEqual(400);
		expect(JSON.parse(response.body).__type).toEqual("NetworkBlockedInTests");
		expect(blocked).toEqual(["GET network-guard-test.invalid/path"]);
	});

	it("Should let a request to the loopback interface through", async () => {
		const server = http.createServer((request, response) => response.end("local"));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		try {
			const response = await get(`http://127.0.0.1:${server.address().port}/`);
			expect(response).toEqual({"status": 200, "body": "local"});
			expect(global.takeBlockedRequests()).toEqual([]);
		} finally {
			await new Promise((resolve) => server.close(resolve));
		}
	});
});
