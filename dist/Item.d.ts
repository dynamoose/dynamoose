import { Model } from "./Model";
import { Schema } from "./Schema";
import { AttributeMap } from "./Types";
import DynamoDB = require("@aws-sdk/client-dynamodb");
import { CallbackType, ObjectType } from "./General";
import { SerializerOptions } from "./Serializer";
import { PopulateSettings } from "./Populate";
import { Condition } from "./Condition";
export interface ItemSaveSettings {
    overwrite?: boolean;
    return?: "request" | "Item";
    condition?: Condition;
}
export interface ItemSettings {
    type?: "fromDynamo" | "toDynamo";
}
export declare class Item {
    constructor(model: Model<Item>, object?: AttributeMap | ObjectType, settings?: ItemSettings);
    model?: Model<Item>;
    static objectToDynamo(object: ObjectType): AttributeMap;
    static objectToDynamo(object: any, settings: {
        type: "value";
    }): DynamoDB.AttributeValue;
    static objectToDynamo(object: ObjectType, settings: {
        type: "object";
    }): AttributeMap;
    static fromDynamo(object: AttributeMap): ObjectType;
    static isDynamoObject(object: ObjectType, recurrsive?: boolean): boolean | null;
    static attributesWithSchema: (item: Item, model: Model<Item>) => Promise<string[]>;
    static objectFromSchema: (object: any, model: Model<Item>, settings?: ItemObjectFromSchemaSettings) => Promise<any>;
    static prepareForObjectFromSchema: (object: any, model: Model<Item>, settings: ItemObjectFromSchemaSettings) => any;
    conformToSchema: (this: Item, settings?: ItemObjectFromSchemaSettings) => Promise<Item>;
    toDynamo: (this: Item, settings?: Partial<ItemObjectFromSchemaSettings>) => Promise<any>;
    prepareForResponse(): Promise<Item>;
    original(): ObjectType | null;
    toJSON(): ObjectType;
    serialize(nameOrOptions?: SerializerOptions | string): ObjectType;
    delete(this: Item): Promise<void>;
    delete(this: Item, callback: CallbackType<void, any>): void;
    save(this: Item): Promise<Item>;
    save(this: Item, callback: CallbackType<Item, any>): void;
    save(this: Item, settings: ItemSaveSettings & {
        return: "request";
    }): Promise<DynamoDB.PutItemInput>;
    save(this: Item, settings: ItemSaveSettings & {
        return: "request";
    }, callback: CallbackType<DynamoDB.PutItemInput, any>): void;
    save(this: Item, settings: ItemSaveSettings & {
        return: "item";
    }): Promise<Item>;
    save(this: Item, settings: ItemSaveSettings & {
        return: "item";
    }, callback: CallbackType<Item, any>): void;
    populate(): Promise<Item>;
    populate(callback: CallbackType<Item, any>): void;
    populate(settings: PopulateSettings): Promise<Item>;
    populate(settings: PopulateSettings, callback: CallbackType<Item, any>): void;
}
export declare class AnyItem extends Item {
    [key: string]: any;
}
export interface ItemObjectFromSchemaSettings {
    type: "toDynamo" | "fromDynamo";
    schema?: Schema;
    checkExpiredItem?: boolean;
    saveUnknown?: boolean;
    defaults?: boolean;
    forceDefault?: boolean;
    customTypesDynamo?: boolean;
    validate?: boolean;
    required?: boolean | "nested";
    enum?: boolean;
    populate?: boolean;
    combine?: boolean;
    modifiers?: ("set" | "get")[];
    updateTimestamps?: boolean | {
        updatedAt?: boolean;
        createdAt?: boolean;
    };
}
