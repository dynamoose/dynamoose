interface ThroughputSettings {
	read: number;
	write: number;
}

export interface TableSettings {
	throughput: ThroughputSettings | number | "ON_DEMAND";
}

export default (options: Partial<TableSettings>): {"BillingMode": "PAY_PER_REQUEST"} | {"ProvisionedThroughput": {"ReadCapacityUnits": number; "WriteCapacityUnits": number}} | {} => {
	if (!options.throughput) {
		return {};
	}
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
