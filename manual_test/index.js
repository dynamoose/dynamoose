const dynamoose = require("../lib");
const dynamooseOld = require("dynamoose");
const expect = require("chai").expect;

dynamooseOld.AWS.config.update({
	"accessKeyId": "AKID",
	"secretAccessKey": "SECRET",
	"region": "us-east-1"
});
dynamooseOld.local();
//
// const Cat = dynamooseOld.model("Cat101", { "id": Number, "name": String });
//
// // console.log(Object.getPrototypeOf(Cat));
// // Cat();
// // console.log(Cat instanceof dynamoose.model);
// const kitty = new Cat({ "id": 1, name: 'Zildjian' });
// const kittyB = Cat({ "id": 1, name: 'Zildjian' });
// kitty.save().then((res) => console.log(typeof res)).catch((err) => console.error(err));
// kittyB.save().then((res) => console.log(typeof res)).catch((err) => console.error(err));


const a = dynamooseOld.model(`Test${Date.now()}`, {"id": String, "age": Number, "name": String, "address": String}, {"create": true, "update": false});
// console.log(JSON.stringify(a.getTableReq(), null, 4));

async function main() {
	await a.create({"id": "test1", "age": 1, "name": "Tim"});
	const result = await a.update({"id": "test1"}, {"$ADD": {"age": 1}});
	console.log(await a.get("test1"));
	console.log(result);
}
main();

// const sdk = dynamoose.aws.sdk; // require("aws-sdk");
// sdk.config.update({
// 	"accessKeyId": "AKID",
// 	"secretAccessKey": "SECRET",
// 	"region": "us-east-1"
// });
// const ddb = new dynamoose.aws.sdk.DynamoDB({"endpoint": "http://localhost:8000"});
// dynamoose.aws.ddb.set(ddb);
// dynamooseOld.setDDB(ddb);
//
// const Cat = dynamooseOld.model("Cat200", {"id": Number, "name": String, "breed": String}, {"create": false});
// const CatB = new dynamoose.model("Cat200", {"id": Number, "name": String, "breed": String}, {"create": false});
//
// async function main() {
// 	// const cat = new Cat({"id": 10, "other": "Test", "name": "test"});
// 	// console.log(cat);
// 	// const other = await cat.save();
// 	// console.log(other);
// 	// console.log(await Cat.get(10));
//
// 	// for (let i = 0; i < 1000; i++) {
// 	// 	const cat = new CatB({"id": i, "name": new Array(50000).fill("a").join("")});
// 	// 	await cat.save();
// 	// }
//
// 	// console.log((await CatB.scan({breed: {contains: 'Terrier'}}).exec()));
// 	// console.log(await Cat.scan({breed: {contains: 'Terrier'}}).exec());
//
// 	// console.log(await CatB.scan().exec());
// 	// console.log(await Cat.scan().exec());
//
// 	// console.log((await CatB.scan().parallel(2).exec()));
// 	// console.log((await Cat.scan().parallel(2).exec()));
// 	console.log((await CatB.scan().attributes(["id"]).exec()));
// 	console.log((await Cat.scan().attributes(["id"]).exec()));
//
// 	// console.log(await Cat.get(500));
// 	// console.log(await CatB.get(500));
// 	// console.log(await dynamoose.aws.ddb().getItem({
// 	// 	"Key": {
// 	// 		"id": {
// 	// 			"N": "200"
// 	// 		}
// 	// 	},
// 	// 	"TableName": "Cat200"
// 	// }).promise());
// 	/*
// 	const res1 = await (new Cat({"id": 1, "name": "Charlie"}).save());
// 	const res2 = await Cat.Model.get(1);
// 	// const res2 = await Cat.Model.model.prototype.get.bind(Cat.Model)(1);
//
// 	console.log(res1);
// 	console.log(res2);
//
// 	console.log(JSON.stringify(await ddb.scan({"TableName": "Cat200"}).promise(), null, 4));
// 	*/
// }
// main();
