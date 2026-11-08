const {execFileSync} = require("child_process");
const path = require("path");

// A callback that throws can only be observed in a separate Node process: Jest reports every unhandled rejection in a test as a failure of that test. The child process runs each call with a callback that throws, and prints how often the callback was called and which errors were left unhandled.
const childScript = `
const dynamoose = require(process.env.DYNAMOOSE_DIST);
const item = {"id": {"N": "1"}, "name": {"S": "Bob"}};
dynamoose.Table.defaults.set({"create": false, "update": false, "waitForActive": false});
dynamoose.aws.ddb.set({
	"getItem": () => Promise.resolve({"Item": item}),
	"putItem": () => Promise.resolve({}),
	"deleteItem": () => Promise.resolve({}),
	"updateItem": () => Promise.resolve({"Attributes": item}),
	"batchGetItem": () => Promise.resolve({"Responses": {"User": [item]}, "UnprocessedKeys": {}}),
	"batchWriteItem": () => Promise.resolve({"UnprocessedItems": {}}),
	"query": () => Promise.resolve({"Items": [item], "Count": 1, "ScannedCount": 1}),
	"scan": () => Promise.resolve({"Items": [item], "Count": 1, "ScannedCount": 1}),
	"transactWriteItems": () => Promise.resolve({}),
	"createTable": () => Promise.resolve({}),
	"describeTable": () => Promise.resolve({"Table": {"TableStatus": "ACTIVE"}})
});
const User = dynamoose.model("User", {"id": Number, "name": String});
const table = new dynamoose.Table("User", [User]);
User.methods.set("findBob", async () => "Bob");
const calls = {
	"item.save": (callback) => new User({"id": 1, "name": "Bob"}).save(callback),
	"item.save with a return request setting": (callback) => new User({"id": 1, "name": "Bob"}).save({"return": "request"}, callback),
	"item.populate": (callback) => new User({"id": 1, "name": "Bob"}).populate(callback),
	"Model.get": (callback) => User.get(1, callback),
	"Model.get with a return request setting": (callback) => User.get(1, {"return": "request"}, callback),
	"Model.delete": (callback) => User.delete(1, callback),
	"Model.delete with a return request setting": (callback) => User.delete(1, {"return": "request"}, callback),
	"Model.update": (callback) => User.update({"id": 1}, {"name": "Bob"}, callback),
	"Model.update with a return request setting": (callback) => User.update({"id": 1}, {"name": "Bob"}, {"return": "request"}, callback),
	"Model.batchGet": (callback) => User.batchGet([1], callback),
	"Model.batchGet with a return request setting": (callback) => User.batchGet([1], {"return": "request"}, callback),
	"Model.batchPut": (callback) => User.batchPut([{"id": 1, "name": "Bob"}], callback),
	"Model.batchPut with a return request setting": (callback) => User.batchPut([{"id": 1, "name": "Bob"}], {"return": "request"}, callback),
	"Model.batchDelete": (callback) => User.batchDelete([1], callback),
	"Model.batchDelete with a return request setting": (callback) => User.batchDelete([1], {"return": "request"}, callback),
	"query.exec": (callback) => User.query("id").eq(1).exec(callback),
	"scan.exec": (callback) => User.scan().exec(callback),
	"populate of a scan result": (callback) => User.scan().exec().then((result) => result.populate(callback)),
	"dynamoose.transaction": (callback) => dynamoose.transaction([User.transaction.create({"id": 1, "name": "Bob"})], callback),
	"table.create": (callback) => table.create(callback),
	"table.create with a return request setting": (callback) => table.create({"return": "request"}, callback),
	"table.initialize": (callback) => table.initialize(callback),
	"a custom model method": (callback) => User.findBob(callback)
};
let unhandled = [];
process.on("unhandledRejection", (error) => unhandled.push(error && error.message));
(async () => {
	const results = {};
	for (const [name, call] of Object.entries(calls)) {
		unhandled = [];
		const callbackArguments = [];
		call((...args) => {
			callbackArguments.push(args);
			throw new Error("Callback error");
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		results[name] = {"calls": callbackArguments.length, "firstError": callbackArguments[0] ? callbackArguments[0][0] || null : undefined, "unhandled": unhandled};
	}
	process.stdout.write(JSON.stringify(results));
})();
`;

describe("Callback that throws", () => {
	let results;
	beforeAll(() => {
		const output = execFileSync(process.execPath, ["-e", childScript], {
			"encoding": "utf8",
			"env": {...process.env, "DYNAMOOSE_DIST": path.join(__dirname, "..", "dist")},
			"stdio": ["ignore", "pipe", "pipe"]
		});
		results = JSON.parse(output);
	});

	[
		"item.save",
		"item.save with a return request setting",
		"item.populate",
		"Model.get",
		"Model.get with a return request setting",
		"Model.delete",
		"Model.delete with a return request setting",
		"Model.update",
		"Model.update with a return request setting",
		"Model.batchGet",
		"Model.batchGet with a return request setting",
		"Model.batchPut",
		"Model.batchPut with a return request setting",
		"Model.batchDelete",
		"Model.batchDelete with a return request setting",
		"query.exec",
		"scan.exec",
		"populate of a scan result",
		"dynamoose.transaction",
		"table.create",
		"table.create with a return request setting",
		"table.initialize",
		"a custom model method"
	].forEach((name) => {
		it(`Should call the callback once for ${name}, and leave the error the callback throws unhandled`, () => {
			expect(results[name]).toEqual({"calls": 1, "firstError": null, "unhandled": ["Callback error"]});
		});
	});
});
