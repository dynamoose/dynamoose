import { Schema, DynamoDBTypeResult, DynamoDBSetTypeResult } from "../../Schema";
import { ObjectType } from "../../General";
declare const _default: (schema: Schema, value: any, key: string, settings: {
    "type": "toDynamo" | "fromDynamo";
}, options: {
    standardKey?: boolean;
    typeIndexOptionMap?: ObjectType;
}) => {
    typeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[];
    matchedTypeDetailsIndex: number;
    matchedTypeDetailsIndexes: number[];
    matchedTypeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult;
    typeDetailsArray: (DynamoDBTypeResult | DynamoDBSetTypeResult)[];
    isValidType: boolean;
};
export = _default;
