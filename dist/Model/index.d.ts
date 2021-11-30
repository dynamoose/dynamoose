import { Schema, SchemaDefinition, IndexItem, TableIndex } from "../Schema";
import { Item as ItemCarrier, ItemSaveSettings, AnyItem } from "../Item";
import { Serializer, SerializerOptions } from "../Serializer";
import { Condition, ConditionInitalizer } from "../Condition";
import { Scan, Query } from "../ItemRetriever";
import { CallbackType, ObjectType, FunctionType, ItemArray, ModelType, DeepPartial } from "../General";
import DynamoDB = require("@aws-sdk/client-dynamodb");
import { GetTransactionInput, CreateTransactionInput, DeleteTransactionInput, UpdateTransactionInput, ConditionTransactionInput } from "../Transaction";
interface ModelWaitForActiveSettings {
    enabled: boolean;
    check: {
        timeout: number;
        frequency: number;
    };
}
export interface ModelExpiresSettings {
    ttl: number;
    attribute: string;
    items?: {
        returnExpired: boolean;
    };
}
declare enum ModelUpdateOptions {
    ttl = "ttl",
    indexes = "indexes",
    throughput = "throughput"
}
export interface ModelOptions {
    create: boolean;
    throughput: "ON_DEMAND" | number | {
        read: number;
        write: number;
    };
    prefix: string;
    suffix: string;
    waitForActive: boolean | ModelWaitForActiveSettings;
    update: boolean | ModelUpdateOptions[];
    populate: string | string[] | boolean;
    expires: number | ModelExpiresSettings;
}
export declare type ModelOptionsOptional = DeepPartial<ModelOptions>;
declare type KeyObject = {
    [attribute: string]: string | number;
};
declare type InputKey = string | number | KeyObject;
declare type GetTransactionResult = Promise<GetTransactionInput>;
declare type CreateTransactionResult = Promise<CreateTransactionInput>;
declare type DeleteTransactionResult = Promise<DeleteTransactionInput>;
declare type UpdateTransactionResult = Promise<UpdateTransactionInput>;
declare type ConditionTransactionResult = Promise<ConditionTransactionInput>;
export interface GetTransaction {
    (key: InputKey): GetTransactionResult;
    (key: InputKey, settings?: ModelGetSettings): GetTransactionResult;
    (key: InputKey, settings: ModelGetSettings & {
        return: "item";
    }): GetTransactionResult;
    (key: InputKey, settings: ModelGetSettings & {
        return: "request";
    }): GetTransactionResult;
}
export interface CreateTransaction {
    (item: ObjectType): CreateTransactionResult;
    (item: ObjectType, settings: ItemSaveSettings & {
        return: "request";
    }): CreateTransactionResult;
    (item: ObjectType, settings: ItemSaveSettings & {
        return: "item";
    }): CreateTransactionResult;
    (item: ObjectType, settings?: ItemSaveSettings): CreateTransactionResult;
}
export interface DeleteTransaction {
    (key: InputKey): DeleteTransactionResult;
    (key: InputKey, settings: ModelDeleteSettings & {
        return: "request";
    }): DeleteTransactionResult;
    (key: InputKey, settings: ModelDeleteSettings & {
        return: null;
    }): DeleteTransactionResult;
    (key: InputKey, settings?: ModelDeleteSettings): DeleteTransactionResult;
}
export interface UpdateTransaction {
    (obj: ObjectType): CreateTransactionResult;
    (keyObj: ObjectType, updateObj: ObjectType): UpdateTransactionResult;
    (keyObj: ObjectType, updateObj: ObjectType, settings: ModelUpdateSettings & {
        "return": "item";
    }): UpdateTransactionResult;
    (keyObj: ObjectType, updateObj: ObjectType, settings: ModelUpdateSettings & {
        "return": "request";
    }): UpdateTransactionResult;
    (keyObj: ObjectType, updateObj?: ObjectType, settings?: ModelUpdateSettings): UpdateTransactionResult;
}
export interface ConditionTransaction {
    (key: InputKey, condition: Condition): ConditionTransactionResult;
}
declare type TransactionType = {
    get: GetTransaction;
    create: CreateTransaction;
    delete: DeleteTransaction;
    update: UpdateTransaction;
    condition: ConditionTransaction;
};
interface ModelGetSettings {
    return?: "item" | "request";
    attributes?: string[];
    consistent?: boolean;
}
interface ModelDeleteSettings {
    return?: null | "request";
    condition?: Condition;
}
interface ModelBatchPutSettings {
    return?: "response" | "request";
}
interface ModelUpdateSettings {
    return?: "item" | "request";
    condition?: Condition;
    returnValues?: DynamoDB.ReturnValue;
}
interface ModelBatchGetItemsResponse<T> extends ItemArray<T> {
    unprocessedKeys: ObjectType[];
}
interface ModelBatchGetSettings {
    return?: "items" | "request";
    attributes?: string[];
}
interface ModelBatchDeleteSettings {
    return?: "response" | "request";
}
export interface ModelIndexes {
    TableIndex?: TableIndex;
    GlobalSecondaryIndexes?: IndexItem[];
    LocalSecondaryIndexes?: IndexItem[];
}
export declare class Model<T extends ItemCarrier = AnyItem> {
    constructor(name: string, schema: Schema | SchemaDefinition | (Schema | SchemaDefinition)[], options: ModelOptionsOptional, ModelStore: (model: Model) => void);
    serializer: Serializer;
    static defaults: ModelOptions;
    Item: typeof ItemCarrier;
    scan: (object?: ConditionInitalizer) => Scan<T>;
    query: (object?: ConditionInitalizer) => Query<T>;
    methods: {
        item: {
            set: (name: string, fn: FunctionType) => void;
            delete: (name: string) => void;
        };
        set: (name: string, fn: FunctionType) => void;
        delete: (name: string) => void;
    };
    transaction: TransactionType;
    batchGet(keys: InputKey[]): Promise<ModelBatchGetItemsResponse<T>>;
    batchGet(keys: InputKey[], callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings & {
        "return": "request";
    }): DynamoDB.BatchGetItemInput;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings & {
        "return": "request";
    }, callback: CallbackType<DynamoDB.BatchGetItemInput, any>): void;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings): Promise<ModelBatchGetItemsResponse<T>>;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings, callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings & {
        "return": "items";
    }): Promise<ModelBatchGetItemsResponse<T>>;
    batchGet(keys: InputKey[], settings: ModelBatchGetSettings & {
        "return": "items";
    }, callback: CallbackType<ModelBatchGetItemsResponse<T>, any>): void;
    batchPut(items: ObjectType[]): Promise<{
        "unprocessedItems": ObjectType[];
    }>;
    batchPut(items: ObjectType[], callback: CallbackType<{
        "unprocessedItems": ObjectType[];
    }, any>): void;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings & {
        "return": "request";
    }): Promise<DynamoDB.BatchWriteItemInput>;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings & {
        "return": "request";
    }, callback: CallbackType<DynamoDB.BatchWriteItemInput, any>): void;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings): Promise<{
        "unprocessedItems": ObjectType[];
    }>;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings, callback: CallbackType<{
        "unprocessedItems": ObjectType[];
    }, any>): void;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings & {
        "return": "response";
    }): Promise<{
        "unprocessedItems": ObjectType[];
    }>;
    batchPut(items: ObjectType[], settings: ModelBatchPutSettings & {
        "return": "response";
    }, callback: CallbackType<{
        "unprocessedItems": ObjectType[];
    }, any>): void;
    batchDelete(keys: InputKey[]): Promise<{
        unprocessedItems: ObjectType[];
    }>;
    batchDelete(keys: InputKey[], callback: CallbackType<{
        unprocessedItems: ObjectType[];
    }, any>): void;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings & {
        "return": "request";
    }): DynamoDB.BatchWriteItemInput;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings & {
        "return": "request";
    }, callback: CallbackType<DynamoDB.BatchWriteItemInput, any>): void;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings): Promise<{
        unprocessedItems: ObjectType[];
    }>;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings, callback: CallbackType<{
        unprocessedItems: ObjectType[];
    }, any>): Promise<{
        unprocessedItems: ObjectType[];
    }>;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings & {
        "return": "response";
    }): Promise<{
        unprocessedItems: ObjectType[];
    }>;
    batchDelete(keys: InputKey[], settings: ModelBatchDeleteSettings & {
        "return": "response";
    }, callback: CallbackType<{
        unprocessedItems: ObjectType[];
    }, any>): Promise<{
        unprocessedItems: ObjectType[];
    }>;
    update(obj: Partial<T>): Promise<T>;
    update(obj: Partial<T>, callback: CallbackType<T, any>): void;
    update(keyObj: InputKey, updateObj: Partial<T>): Promise<T>;
    update(keyObj: InputKey, updateObj: Partial<T>, callback: CallbackType<T, any>): void;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "request";
    }): Promise<DynamoDB.UpdateItemInput>;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "request";
    }, callback: CallbackType<DynamoDB.UpdateItemInput, any>): void;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings): Promise<T>;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings, callback: CallbackType<T, any>): void;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "document";
    }): Promise<T>;
    update(keyObj: InputKey, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "document";
    }, callback: CallbackType<T, any>): void;
    update(keyObj: ObjectType, updateObj: Partial<T>): Promise<T>;
    update(keyObj: ObjectType, updateObj: Partial<T>, callback: CallbackType<T, any>): void;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "request";
    }): Promise<DynamoDB.UpdateItemInput>;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "request";
    }, callback: CallbackType<DynamoDB.UpdateItemInput, any>): void;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings): Promise<T>;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings, callback: CallbackType<T, any>): void;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "item";
    }): Promise<T>;
    update(keyObj: ObjectType, updateObj: Partial<T>, settings: ModelUpdateSettings & {
        "return": "item";
    }, callback: CallbackType<T, any>): void;
    create(item: Partial<T>): Promise<T>;
    create(item: Partial<T>, callback: CallbackType<T, any>): void;
    create(item: Partial<T>, settings: ItemSaveSettings & {
        return: "request";
    }): Promise<DynamoDB.PutItemInput>;
    create(item: Partial<T>, settings: ItemSaveSettings & {
        return: "request";
    }, callback: CallbackType<DynamoDB.PutItemInput, any>): void;
    create(item: Partial<T>, settings: ItemSaveSettings): Promise<T>;
    create(item: Partial<T>, settings: ItemSaveSettings, callback: CallbackType<T, any>): void;
    create(item: Partial<T>, settings: ItemSaveSettings & {
        return: "item";
    }): Promise<T>;
    create(item: Partial<T>, settings: ItemSaveSettings & {
        return: "item";
    }, callback: CallbackType<T, any>): void;
    delete(key: InputKey): Promise<void>;
    delete(key: InputKey, callback: CallbackType<void, any>): void;
    delete(key: InputKey, settings: ModelDeleteSettings & {
        return: "request";
    }): DynamoDB.DeleteItemInput;
    delete(key: InputKey, settings: ModelDeleteSettings & {
        return: "request";
    }, callback: CallbackType<DynamoDB.DeleteItemInput, any>): void;
    delete(key: InputKey, settings: ModelDeleteSettings): Promise<void>;
    delete(key: InputKey, settings: ModelDeleteSettings, callback: CallbackType<void, any>): void;
    delete(key: InputKey, settings: ModelDeleteSettings & {
        return: null;
    }): Promise<void>;
    delete(key: InputKey, settings: ModelDeleteSettings & {
        return: null;
    }, callback: CallbackType<void, any>): void;
    get(key: InputKey): Promise<T>;
    get(key: InputKey, callback: CallbackType<T, any>): void;
    get(key: InputKey, settings: ModelGetSettings & {
        return: "request";
    }): DynamoDB.GetItemInput;
    get(key: InputKey, settings: ModelGetSettings & {
        return: "request";
    }, callback: CallbackType<DynamoDB.GetItemInput, any>): void;
    get(key: InputKey, settings: ModelGetSettings): Promise<T>;
    get(key: InputKey, settings: ModelGetSettings, callback: CallbackType<T, any>): void;
    get(key: InputKey, settings: ModelGetSettings & {
        return: "item";
    }): Promise<T>;
    get(key: InputKey, settings: ModelGetSettings & {
        return: "item";
    }, callback: CallbackType<T, any>): void;
    serializeMany(itemsArray: ModelType<ItemCarrier>[], nameOrOptions: SerializerOptions | string): any;
}
export {};
