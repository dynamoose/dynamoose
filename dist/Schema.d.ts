/// <reference types="node" />
import { Item, ItemObjectFromSchemaSettings } from "./Item";
import { Model, ModelIndexes } from "./Model";
import DynamoDB = require("@aws-sdk/client-dynamodb");
import { ModelType, ObjectType } from "./General";
export interface DynamoDBSetTypeResult {
    name: string;
    dynamicName?: (() => string);
    dynamodbType: string;
    isOfType: (value: ValueType, type?: "toDynamo" | "fromDynamo", settings?: Partial<ItemObjectFromSchemaSettings>) => boolean;
    isSet: true;
    customType?: any;
    typeSettings?: AttributeDefinitionTypeSettings;
    toDynamo: (val: GeneralValueType[]) => SetValueType;
    fromDynamo: (val: SetValueType) => Set<ValueType>;
}
export interface DynamoDBTypeResult {
    name: string;
    dynamicName?: (() => string);
    dynamodbType: string | string[];
    isOfType: (value: ValueType) => {
        value: ValueType;
        type: string;
    };
    isSet: false;
    customType?: any;
    typeSettings?: AttributeDefinitionTypeSettings;
    nestedType: boolean;
    set?: DynamoDBSetTypeResult;
}
declare type SetValueType = {
    wrapperName: "Set";
    values: ValueType[];
    type: string;
};
declare type GeneralValueType = string | boolean | number | Buffer | Date;
export declare type ValueType = GeneralValueType | {
    [key: string]: ValueType;
} | ValueType[] | SetValueType;
declare type AttributeType = string | StringConstructor | BooleanConstructor | NumberConstructor | typeof Buffer | DateConstructor | ObjectConstructor | ArrayConstructor | SetConstructor | symbol | Schema | ModelType<Item>;
export interface TimestampObject {
    createdAt?: string | string[];
    updatedAt?: string | string[];
}
interface SchemaSettings {
    timestamps?: boolean | TimestampObject;
    saveUnknown?: boolean | string[];
}
interface IndexDefinition {
    name?: string;
    global?: boolean;
    rangeKey?: string;
    project?: boolean | string[];
    throughput?: "ON_DEMAND" | number | {
        read: number;
        write: number;
    };
}
interface AttributeDefinitionTypeSettings {
    storage?: "miliseconds" | "seconds";
    model?: ModelType<Item>;
    attributes?: string[];
    seperator?: string;
    value?: string | boolean | number;
}
interface AttributeDefinition {
    type: AttributeType | AttributeType[] | {
        value: DateConstructor;
        settings?: AttributeDefinitionTypeSettings;
    } | {
        value: AttributeType | AttributeType[];
    };
    schema?: AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[] | SchemaDefinition | SchemaDefinition[];
    default?: ValueType | (() => ValueType);
    forceDefault?: boolean;
    validate?: ValueType | RegExp | ((value: ValueType) => boolean);
    required?: boolean;
    enum?: ValueType[];
    get?: ((value: ValueType) => ValueType);
    set?: ((value: ValueType) => ValueType);
    index?: boolean | IndexDefinition | IndexDefinition[];
    hashKey?: boolean;
    rangeKey?: boolean;
}
export interface SchemaDefinition {
    [attribute: string]: AttributeType | AttributeType[] | AttributeDefinition | AttributeDefinition[];
}
interface SchemaGetAttributeTypeSettings {
    unknownAttributeAllowed: boolean;
}
interface SchemaGetAttributeSettingValue {
    returnFunction: boolean;
    typeIndexOptionMap?: any;
}
export declare class Schema {
    settings: SchemaSettings;
    schemaObject: SchemaDefinition;
    attributes: (object?: ObjectType) => string[];
    getCreateTableAttributeParams(model: Model<Item>): Promise<Pick<DynamoDB.CreateTableInput, "AttributeDefinitions" | "KeySchema" | "GlobalSecondaryIndexes" | "LocalSecondaryIndexes">>;
    private getSingleAttributeType;
    getAttributeType(key: string, value?: ValueType, settings?: SchemaGetAttributeTypeSettings): string | string[];
    static attributeTypes: {
        findDynamoDBType: (type: any) => DynamoDBTypeResult | DynamoDBSetTypeResult;
        findTypeForValue: (...args: any[]) => DynamoDBTypeResult | DynamoDBSetTypeResult;
    };
    getHashKey: () => string;
    getRangeKey: () => string | void;
    defaultCheck(key: string, value: ValueType, settings: any): Promise<ValueType | void>;
    requiredCheck: (key: string, value: ValueType) => Promise<void>;
    getAttributeSettingValue(setting: string, key: string, settings?: SchemaGetAttributeSettingValue): any;
    getTypePaths(object: ObjectType, settings?: {
        type: "toDynamo" | "fromDynamo";
        previousKey?: string;
        includeAllProperties?: boolean;
    }): ObjectType;
    getIndexAttributes: () => Promise<{
        index: IndexDefinition;
        attribute: string;
    }[]>;
    getSettingValue: (setting: string) => any;
    getAttributeTypeDetails: (key: string, settings?: {
        standardKey?: boolean;
        typeIndexOptionMap?: {};
    }) => DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[];
    getAttributeValue: (key: string, settings?: {
        standardKey?: boolean;
        typeIndexOptionMap?: {};
    }) => AttributeDefinition;
    getIndexes: (model: Model<Item>) => Promise<ModelIndexes>;
    getIndexRangeKeyAttributes: () => Promise<{
        attribute: string;
    }[]>;
    constructor(object: SchemaDefinition, settings?: SchemaSettings);
}
export interface TableIndex {
    KeySchema: ({
        AttributeName: string;
        KeyType: "HASH" | "RANGE";
    })[];
}
export interface IndexItem {
    IndexName: string;
    KeySchema: ({
        AttributeName: string;
        KeyType: "HASH" | "RANGE";
    })[];
    Projection: {
        ProjectionType: "KEYS_ONLY" | "INCLUDE" | "ALL";
        NonKeyAttributes?: string[];
    };
    ProvisionedThroughput?: {
        "ReadCapacityUnits": number;
        "WriteCapacityUnits": number;
    };
}
export {};
