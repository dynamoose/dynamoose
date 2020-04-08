interface ThroughputSettings {
	read: number;
	write: number;
}

interface ModelSettings {
	throughput: ThroughputSettings | number | "ON_DEMAND";
}

export = (options: ModelSettings) => {
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
