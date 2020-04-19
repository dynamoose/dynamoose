const ddb = require("./index");
const log = require("../../logger/emitter");

export = async (method, params) => {
	log({"level": "debug", "category": `aws:dynamodb:${method}:request`, "message": JSON.stringify(params, null, 4), "payload": {"request": params}});
	const result = await ddb()[method](params).promise();
	log({"level": "debug", "category": `aws:dynamodb:${method}:response`, "message": typeof result === "undefined" ? "undefined" : JSON.stringify(result, null, 4), "payload": {"response": result}});
	return result;
};
