const dynamoose = require("../lib");
const dynamooseOld = require("dynamoose");
const AWS = require("aws-sdk");
const axios = require("axios");

const sdk = dynamoose.aws.sdk; // require("aws-sdk");
sdk.config.update({
	"accessKeyId": "AKID",
	"secretAccessKey": "SECRET",
	"region": "us-east-1"
});
const ddb = new dynamoose.aws.sdk.DynamoDB({"endpoint": "http://localhost:8000"});
dynamoose.aws.ddb.set(ddb);
dynamooseOld.setDDB(ddb);

async function main() {
	const data = (await axios.get(`https://www.wikidata.org/wiki/Special:EntityData/Q2.json`)).data.entities.Q2;
	const schema = new dynamooseOld.Schema({
		"id": {
			"type": String,
			"required": true
		}
	}, {
		"saveUnknown": true
	});
	const model = dynamooseOld.model(`WikidataOld`, schema, {});
	await model.create(data, {"overwrite": true});

	const schemaB = new dynamoose.Schema({
		"id": {
			"type": String,
			"required": true
		}
	}, {
		"saveUnknown": true
	});
	const modelB = new dynamoose.Model(`Wikidata`, schemaB);
	await modelB.create(data, {"overwrite": true});


	console.log((await model.get("Q2")).claims.P268);
	console.log((await modelB.get("Q2")).claims.P268);
}
main();
