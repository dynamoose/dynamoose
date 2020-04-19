const ddb = require("./index");

module.exports = async (method, params) => {
	const result = await ddb()[method](params).promise();
	return result;
};
