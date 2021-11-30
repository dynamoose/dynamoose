interface ThroughputSettings {
    read: number;
    write: number;
}
export interface ModelSettings {
    throughput: ThroughputSettings | number | "ON_DEMAND";
}
declare const _default: (options: Partial<ModelSettings>) => {
    "BillingMode": "PAY_PER_REQUEST";
} | {
    "ProvisionedThroughput": {
        "ReadCapacityUnits": number;
        "WriteCapacityUnits": number;
    };
} | {};
export default _default;
