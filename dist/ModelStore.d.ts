import { Model } from "./Model";
import { Item } from "./Item";
declare const returnObject: {
    <T extends Item>(input: string | Model<T>): Model<T>;
    clear(): void;
};
export = returnObject;
