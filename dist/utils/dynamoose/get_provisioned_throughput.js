"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (options) => {
    if (!options.throughput) {
        return {};
    }
    if (options.throughput === "ON_DEMAND") {
        return {
            "BillingMode": "PAY_PER_REQUEST"
        };
    }
    else {
        return {
            "ProvisionedThroughput": {
                "ReadCapacityUnits": typeof options.throughput === "number" ? options.throughput : options.throughput.read,
                "WriteCapacityUnits": typeof options.throughput === "number" ? options.throughput : options.throughput.write
            }
        };
    }
};
