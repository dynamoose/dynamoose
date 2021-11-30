import { Schema, SchemaDefinition } from "./Schema";
import { Condition } from "./Condition";
import transaction from "./Transaction";
import { Item, AnyItem } from "./Item";
import { ModelType } from "./General";
declare const _default: {
    model: {
        <T extends Item = AnyItem>(name: string, schema?: Schema | SchemaDefinition | (Schema | SchemaDefinition)[], options?: import("./General").DeepPartial<import("./Model").ModelOptions>): ModelType<T>;
        defaults: any;
    };
    Schema: typeof Schema;
    Condition: typeof Condition;
    transaction: typeof transaction;
    aws: {
        ddb: typeof import("./aws/ddb");
        converter: typeof import("./aws/converter");
    };
    logger: () => Promise<any>;
    UNDEFINED: symbol;
    THIS: symbol;
    NULL: symbol;
};
export = _default;
