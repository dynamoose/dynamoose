const dynamoose = require("../lib");
const dynamooseOld = require("dynamoose");

dynamooseOld.AWS.config.update({
	"accessKeyId": "AKID",
	"secretAccessKey": "SECRET",
	"region": "us-east-1"
});
dynamooseOld.local();

const Cat = dynamooseOld.model("Cat101", { "id": Number, "name": String });

// console.log(Object.getPrototypeOf(Cat));
// Cat();
// console.log(Cat instanceof dynamoose.model);
const kitty = new Cat({ "id": 1, name: 'Zildjian' });
const kittyB = Cat({ "id": 1, name: 'Zildjian' });
kitty.save().then((res) => console.log(typeof res)).catch((err) => console.error(err));
kittyB.save().then((res) => console.log(typeof res)).catch((err) => console.error(err));





// const sdk = dynamoose.aws.sdk; // require("aws-sdk");
// sdk.config.update({
// 	"accessKeyId": "AKID",
// 	"secretAccessKey": "SECRET",
// 	"region": "us-east-1"
// });
// const ddb = new dynamoose.aws.sdk.DynamoDB({"endpoint": "http://localhost:8000"});
// dynamoose.aws.ddb.set(ddb);
//
// const Cat = dynamoose.model("Cat7", {"id": Number, "name": String});
//
// async function main() {
// 	await (new Cat({"id": 5, "name": "Hello World"}).save());
//
// 	console.log(JSON.stringify(await ddb.scan({"TableName": "Cat7"}).promise(), null, 4));
// }
// main();
