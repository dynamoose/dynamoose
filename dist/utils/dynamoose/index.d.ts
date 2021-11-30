import { itemToJSON } from "./itemToJSON";
declare const _default: {
    get_provisioned_throughput: (options: Partial<import("./get_provisioned_throughput").ModelSettings>) => {} | {
        BillingMode: "PAY_PER_REQUEST";
    } | {
        ProvisionedThroughput: {
            ReadCapacityUnits: number;
            WriteCapacityUnits: number;
        };
    };
    index_changes: (model: import("../../Model").Model<import("../../Item").Item>, existingIndexes?: any[]) => Promise<(import("./index_changes").ModelIndexAddChange | import("./index_changes").ModelIndexDeleteChange)[]>;
    convertConditionArrayRequestObjectToString: (expression: any) => string;
    getValueTypeCheckResult: (schema: import("../../Schema").Schema, value: any, key: string, settings: {
        type: "toDynamo" | "fromDynamo";
    }, options: {
        standardKey?: boolean;
        typeIndexOptionMap?: import("../../General").ObjectType;
    }) => {
        typeDetails: import("../../Schema").DynamoDBSetTypeResult | import("../../Schema").DynamoDBTypeResult | import("../../Schema").DynamoDBTypeResult[] | import("../../Schema").DynamoDBSetTypeResult[];
        matchedTypeDetailsIndex: number;
        matchedTypeDetailsIndexes: number[];
        matchedTypeDetails: import("../../Schema").DynamoDBSetTypeResult | import("../../Schema").DynamoDBTypeResult;
        typeDetailsArray: (import("../../Schema").DynamoDBSetTypeResult | import("../../Schema").DynamoDBTypeResult)[];
        isValidType: boolean;
    };
    itemToJSON: typeof itemToJSON;
    wildcard_allowed_check: (saveUnknown: boolean | string[], checkKey: string, settings?: {
        splitString: string;
        prefixesDisallowed: boolean;
    }) => boolean;
};
export = _default;
