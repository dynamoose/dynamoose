import { ObjectType, ModelType } from "./General";
import { Item } from "./Item";
export interface SerializerOptions {
    include?: string[];
    exclude?: string[];
    modify?: (serialized: ObjectType, original: ObjectType) => ObjectType;
}
export declare class Serializer {
    #private;
    static defaultName: string;
    constructor();
    add(name: string, options: SerializerOptions): void;
    default: {
        set: (name?: string) => void;
    };
    delete(name: string): void;
    _serializeMany(itemsArray: ModelType<Item>[], nameOrOptions: SerializerOptions | string): ObjectType[];
    _serialize(item: ObjectType, nameOrOptions?: SerializerOptions | string): ObjectType;
}
