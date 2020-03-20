module.exports = (options) => {
	if (options.throughput === "ON_DEMAND") {
		return {
			"BillingMode": "PAY_PER_REQUEST"
		};
	} else {
		return {
			"ProvisionedThroughput": {
				"ReadCapacityUnits": typeof options.throughput === "number" ? options.throughput : options.throughput.read,
				"WriteCapacityUnits": typeof options.throughput === "number" ? options.throughput : options.throughput.write
			}
		};
	}
};
