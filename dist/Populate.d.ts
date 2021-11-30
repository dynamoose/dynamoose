import { Item } from "./Item";
import { ItemArray, CallbackType } from "./General";
export interface PopulateSettings {
    properties?: string[] | string | boolean;
}
interface PopulateInternalSettings {
    parentKey?: string;
}
export declare function PopulateItem(this: Item): Promise<Item>;
export declare function PopulateItem(this: Item, callback: CallbackType<Item, any>): void;
export declare function PopulateItem(this: Item, settings: PopulateSettings): Promise<Item>;
export declare function PopulateItem(this: Item, settings: PopulateSettings, callback: CallbackType<Item, any>): void;
export declare function PopulateItem(this: Item, settings: PopulateSettings, callback: CallbackType<Item, any> | null, internalSettings?: PopulateInternalSettings): void;
export declare function PopulateItems(this: ItemArray<Item>): Promise<ItemArray<Item>>;
export declare function PopulateItems(this: ItemArray<Item>, callback: CallbackType<ItemArray<Item>, any>): void;
export declare function PopulateItems(this: ItemArray<Item>, settings: PopulateSettings): Promise<ItemArray<Item>>;
export declare function PopulateItems(this: ItemArray<Item>, settings: PopulateSettings, callback: CallbackType<ItemArray<Item>, any>): void;
export {};
