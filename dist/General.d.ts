import { Item } from "./Item";
import { Model } from "./Model";
export declare type CallbackType<R, E> = (error?: E | null, response?: R) => void;
export declare type ObjectType = {
    [key: string]: any;
};
export declare type FunctionType = (...args: any[]) => any;
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
interface ModelItemConstructor<T extends Item> {
    new (object: {
        [key: string]: any;
    }): T;
    Model: Model<T>;
}
export declare type ModelType<T extends Item> = T & Model<T> & ModelItemConstructor<T>;
export interface ItemArray<T> extends Array<T> {
    populate: () => Promise<ItemArray<T>>;
    toJSON: () => ObjectType;
}
export declare enum SortOrder {
    ascending = "ascending",
    descending = "descending"
}
export {};
